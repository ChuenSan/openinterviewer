// POST /api/synthesis/aggregate - Generate aggregate synthesis across interviews
// Server-side only - requires authenticated session
// Analyzes all interviews for a study to find cross-participant patterns

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getInterviewProvider } from '@/lib/providers';
import { getRequestContext } from '@/lib/researcherContext';
import { getStudy, getStudyInterviews, isKVAvailable } from '@/lib/kv';
import { AggregateSynthesisResult, SynthesisResult } from '@/types';

export async function POST(request: Request) {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json(
        { error: '尚未配置存储。 Connect Vercel KV to enable this feature.' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { studyId } = body as { studyId: string };

    if (!studyId) {
      return NextResponse.json(
        { error: '缺少必填字段：studyId' },
        { status: 400 }
      );
    }

    // Fetch study to get config
    const study = await getStudy(studyId, context.kvClient);
    if (!study) {
      return NextResponse.json(
        { error: '未找到研究' },
        { status: 404 }
      );
    }

    // Fetch all interviews for this study
    const interviews = await getStudyInterviews(studyId, context.kvClient);
    if (interviews.length < 2) {
      return NextResponse.json(
        { error: '至少需要 2 场访谈才能生成汇总综合分析' },
        { status: 400 }
      );
    }

    // Extract synthesis results from interviews
    const syntheses: SynthesisResult[] = interviews
      .filter(interview => interview.synthesis)
      .map(interview => interview.synthesis!);

    if (syntheses.length < 2) {
      return NextResponse.json(
        { error: '至少需要 2 场含综合分析结果的访谈' },
        { status: 400 }
      );
    }

    // Get the configured AI provider with researcher's API keys
    const provider = getInterviewProvider(study.config, {
      geminiApiKey: context.geminiApiKey,
      anthropicApiKey: context.anthropicApiKey,
      openaiApiKey: context.openaiApiKey,
    });

    // Generate aggregate synthesis
    const aggregateResult = await provider.synthesizeAggregate(
      study.config,
      syntheses,
      interviews.length
    );

    // Build full result with metadata
    const fullResult: AggregateSynthesisResult = {
      studyId,
      interviewCount: interviews.length,
      ...aggregateResult,
      generatedAt: Date.now()
    };

    return NextResponse.json({ synthesis: fullResult });
  } catch (error) {
    console.error('Aggregate synthesis API error:', error);
    return NextResponse.json(
      { error: '生成汇总综合分析失败' },
      { status: 500 }
    );
  }
}
