// GET /api/interviews/[id] - Get single interview
// Protected: Requires authenticated session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getInterview } from '@/lib/kv';
import { getRequestContext } from '@/lib/researcherContext';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '缺少访谈 ID' },
        { status: 400 }
      );
    }

    const interview = await getInterview(id, context.kvClient);

    if (!interview) {
      return NextResponse.json(
        { error: '未找到访谈' },
        { status: 404 }
      );
    }

    return NextResponse.json({ interview });
  } catch (error) {
    console.error('Get interview API error:', error);
    return NextResponse.json(
      { error: '获取访谈失败' },
      { status: 500 }
    );
  }
}
