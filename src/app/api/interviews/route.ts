// GET /api/interviews - List all interviews (or filter by studyId)
// Protected: Requires authenticated session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAllInterviews, getStudyInterviews, isKVAvailable } from '@/lib/kv';
import { getRequestContext } from '@/lib/researcherContext';

export async function GET(request: Request) {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json({
        interviews: [],
        warning: '尚未配置存储。请连接 Vercel KV 以启用持久化。'
      });
    }

    // Check for studyId filter
    const { searchParams } = new URL(request.url);
    const studyId = searchParams.get('studyId');

    // Get interviews (filtered by study or all)
    const interviews = studyId
      ? await getStudyInterviews(studyId, context.kvClient)
      : await getAllInterviews(context.kvClient);

    return NextResponse.json({ interviews });
  } catch (error) {
    console.error('Interviews API error:', error);
    return NextResponse.json(
      { error: '获取访谈失败' },
      { status: 500 }
    );
  }
}
