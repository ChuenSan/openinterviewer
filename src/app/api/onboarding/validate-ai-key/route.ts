// POST /api/onboarding/validate-ai-key - Test if an AI API key works
// Makes a small test call to verify the key is valid
// 仅在托管模式下可用

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/researcherContext';
import { isHostedMode } from '@/lib/mode';

export async function POST(request: Request) {
  if (!isHostedMode()) {
    return NextResponse.json({ error: '仅在托管模式下可用' }, { status: 404 });
  }

  const { authorized, error } = await getRequestContext();
  if (!authorized) {
    return NextResponse.json({ error: error || '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, apiKey } = body as { provider: 'gemini' | 'claude' | 'openai'; apiKey: string };

    if (!provider || !apiKey) {
      return NextResponse.json({ error: '缺少 provider 或 apiKey' }, { status: 400 });
    }

    if (provider === 'gemini') {
      // Test Gemini key with a minimal request
      // Use header-based auth (x-goog-api-key) to avoid leaking the key in URL query strings
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say hello in one word.' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json({
          valid: false,
          error: response.status === 400 || response.status === 403
            ? 'API 密钥无效'
            : `API 错误（状态 ${response.status}）。请检查密钥后重试。`,
        });
      }

      return NextResponse.json({ valid: true });
    }

    if (provider === 'claude') {
      // Test Anthropic key with a minimal request
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hello in one word.' }],
        }),
      });

      if (!response.ok) {
        return NextResponse.json({
          valid: false,
          error: response.status === 401 ? 'API 密钥无效' : `API 错误（${response.status}）`,
        });
      }

      return NextResponse.json({ valid: true });
    }

    if (provider === 'openai') {
      // Test OpenAI key with a minimal request
      // Also works for OpenAI-compatible APIs when OPENAI_BASE_URL is set
      const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say hello in one word.' }],
        }),
      });

      if (!response.ok) {
        return NextResponse.json({
          valid: false,
          error: response.status === 401 ? 'API 密钥无效' : `API 错误（${response.status}）`,
        });
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ error: '未知提供商' }, { status: 400 });
  } catch (error) {
    console.error('AI key validation error:', error);
    return NextResponse.json({ valid: false, error: '验证请求失败' });
  }
}
