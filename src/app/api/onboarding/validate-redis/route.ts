// POST /api/onboarding/validate-redis - Test Redis credentials with ping
// 仅在托管模式下可用

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { getRequestContext } from '@/lib/researcherContext';
import { isHostedMode } from '@/lib/mode';

// Only allow Upstash Redis URLs to prevent SSRF against internal services
function isValidUpstashUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.upstash.io')
    );
  } catch {
    return false;
  }
}

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
    const { redisUrl, redisToken } = body as { redisUrl: string; redisToken: string };

    if (!redisUrl || !redisToken) {
      return NextResponse.json({ error: '缺少 redisUrl 或 redisToken' }, { status: 400 });
    }

    if (!isValidUpstashUrl(redisUrl)) {
      return NextResponse.json({
        valid: false,
        error: '仅支持 Upstash Redis URL（https://*.upstash.io）。',
      }, { status: 400 });
    }

    // Try to connect and ping
    const testClient = new Redis({ url: redisUrl, token: redisToken });
    const result = await testClient.ping();

    if (result === 'PONG') {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, error: 'Unexpected ping response' });
  } catch (error) {
    console.error('Redis validation error:', error);
    return NextResponse.json({
      valid: false,
      error: 'Failed to connect. Check your URL and token.',
    });
  }
}
