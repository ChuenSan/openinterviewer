// POST /api/onboarding/save-credentials - Encrypt and store researcher credentials
// 仅在托管模式下可用

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/researcherContext';
import { updateResearcher } from '@/lib/platformDb';
import { encrypt } from '@/lib/crypto';
import { isHostedMode } from '@/lib/mode';
import { isValidUpstashUrl } from '@/lib/kvClient';

export async function POST(request: Request) {
  if (!isHostedMode()) {
    return NextResponse.json({ error: '仅在托管模式下可用' }, { status: 404 });
  }

  const { authorized, researcherId, error } = await getRequestContext();
  if (!authorized || !researcherId) {
    return NextResponse.json({ error: error || '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { redisUrl, redisToken, geminiApiKey, anthropicApiKey, openaiApiKey } = body as {
      redisUrl?: string;
      redisToken?: string;
      geminiApiKey?: string;
      anthropicApiKey?: string;
      openaiApiKey?: string;
    };

    // Build updates — only encrypt and store non-empty values
    const updates: Record<string, string | number | null> = {};

    if (redisUrl && redisToken) {
      if (!isValidUpstashUrl(redisUrl)) {
        return NextResponse.json(
          { error: '仅支持 Upstash Redis URL（https://*.upstash.io）。' },
          { status: 400 }
        );
      }
      updates.encryptedRedisUrl = encrypt(redisUrl);
      updates.encryptedRedisToken = encrypt(redisToken);
      updates.redisConfiguredAt = Date.now();
    }

    if (geminiApiKey) {
      updates.encryptedGeminiApiKey = encrypt(geminiApiKey);
    }

    if (anthropicApiKey) {
      updates.encryptedAnthropicApiKey = encrypt(anthropicApiKey);
    }

    if (openaiApiKey) {
      updates.encryptedOpenaiApiKey = encrypt(openaiApiKey);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '未提供凭据' }, { status: 400 });
    }

    const success = await updateResearcher(researcherId, updates);
    if (!success) {
      return NextResponse.json({ error: '保存凭据失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save credentials error:', error);
    return NextResponse.json(
      { error: '保存凭据失败' },
      { status: 500 }
    );
  }
}
