// POST /api/demo/seed - Seed demo data to KV
// DELETE /api/demo/seed - Clear demo data from KV
// Protected: Requires authenticated admin session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/researcherContext';
import { saveStudy, saveInterview, isKVAvailable, getAllStudies } from '@/lib/kv';
import { DEMO_STUDIES, DEMO_INTERVIEWS } from '@/lib/demoData';

export async function POST() {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json(
        { error: '尚未配置存储。请先连接 Vercel KV（Upstash Redis）。' },
        { status: 503 }
      );
    }

    // Check if demo data already exists
    const existingStudies = await getAllStudies(context.kvClient);
    const demoExists = existingStudies.some(s => s.id.startsWith('demo-'));
    if (demoExists) {
      return NextResponse.json(
        { error: '演示数据已加载。如需重新加载，请先清除。' },
        { status: 409 }
      );
    }

    // Seed studies
    let studiesSeeded = 0;
    for (const study of DEMO_STUDIES) {
      const success = await saveStudy(study, context.kvClient);
      if (success) studiesSeeded++;
    }

    // Seed interviews
    let interviewsSeeded = 0;
    for (const interview of DEMO_INTERVIEWS) {
      const success = await saveInterview(interview, context.kvClient);
      if (success) interviewsSeeded++;
    }

    return NextResponse.json({
      success: true,
      message: '演示数据加载成功',
      data: {
        studiesSeeded,
        interviewsSeeded,
        aggregateSynthesisAvailable: true
      }
    });
  } catch (error) {
    console.error('Demo seed error:', error);
    return NextResponse.json(
      { error: '植入演示数据失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/demo/seed - Clear demo data from KV
export async function DELETE() {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json(
        { error: '尚未配置存储。' },
        { status: 503 }
      );
    }

    // Use the researcher's KV client directly for cleanup operations
    const kv = context.kvClient;

    // Delete demo studies
    let studiesDeleted = 0;
    for (const study of DEMO_STUDIES) {
      await kv.del(`study:${study.id}`);
      await kv.srem('all-studies', study.id);
      studiesDeleted++;
    }

    // Delete demo interviews
    let interviewsDeleted = 0;
    for (const interview of DEMO_INTERVIEWS) {
      await kv.del(`interview:${interview.id}`);
      await kv.srem(`study-interviews:${interview.studyId}`, interview.id);
      await kv.srem('all-interviews', interview.id);
      interviewsDeleted++;
    }

    return NextResponse.json({
      success: true,
      message: '演示数据已清除',
      data: {
        studiesDeleted,
        interviewsDeleted
      }
    });
  } catch (error) {
    console.error('Demo clear error:', error);
    return NextResponse.json(
      { error: '清除演示数据失败' },
      { status: 500 }
    );
  }
}
