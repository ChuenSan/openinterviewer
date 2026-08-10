// POST /api/onboarding/complete - Mark onboarding as complete
// 仅在托管模式下可用

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/researcherContext';
import { updateResearcher } from '@/lib/platformDb';
import { isHostedMode } from '@/lib/mode';

export async function POST() {
  if (!isHostedMode()) {
    return NextResponse.json({ error: '仅在托管模式下可用' }, { status: 404 });
  }

  const { authorized, researcherId, error } = await getRequestContext();
  if (!authorized || !researcherId) {
    return NextResponse.json({ error: error || '未授权' }, { status: 401 });
  }

  try {
    const success = await updateResearcher(researcherId, {
      onboardingComplete: true,
    });

    if (!success) {
      return NextResponse.json({ error: '完成引导设置失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json(
      { error: '完成引导设置失败' },
      { status: 500 }
    );
  }
}
