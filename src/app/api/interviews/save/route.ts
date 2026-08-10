// POST /api/interviews/save - Save completed interview
// Validates participant token or admin session for security
// Server-side validation ensures data integrity

import { NextResponse } from 'next/server';
import { saveInterview, isKVAvailable, incrementStudyInterviewCount, lockStudy } from '@/lib/kv';
import { getParticipantRequestContext } from '@/lib/researcherContext';
import { StoredInterview } from '@/types';

export async function POST(request: Request) {
  try {
    // Verify participant token or admin session and resolve researcher context
    const { valid, context, studyId, isAdmin, error } = await getParticipantRequestContext(request);
    if (!valid || !context) {
      return NextResponse.json(
        { error: error || '需要有效的参与者令牌或管理员会话' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const clientData = body as Partial<StoredInterview>;

    // Validate studyId matches the token's studyId (skip for admin sessions)
    if (!isAdmin && studyId && clientData.studyId && studyId !== clientData.studyId) {
      return NextResponse.json(
        { error: '研究 ID 不匹配：令牌属于其他研究' },
        { status: 403 }
      );
    }

    // Validate required fields exist
    if (!clientData.id || !clientData.studyId || !clientData.transcript) {
      return NextResponse.json(
        { error: '缺少必填字段：id、studyId、transcript' },
        { status: 400 }
      );
    }

    // Validate transcript is a non-empty array
    if (!Array.isArray(clientData.transcript) || clientData.transcript.length === 0) {
      return NextResponse.json(
        { error: '访谈记录无效：必须是非空数组' },
        { status: 400 }
      );
    }

    // Validate studyId format (alphanumeric with hyphens)
    if (!/^[a-zA-Z0-9-]+$/.test(clientData.studyId)) {
      return NextResponse.json(
        { error: 'studyId 格式无效' },
        { status: 400 }
      );
    }

    // Validate id format
    if (!/^[a-zA-Z0-9-]+$/.test(clientData.id)) {
      return NextResponse.json(
        { error: '访谈 ID 格式无效' },
        { status: 400 }
      );
    }

    // Build the interview with server-controlled fields
    const now = Date.now();
    const defaultProfile = {
      id: clientData.id,
      fields: [],
      rawContext: '',
      timestamp: now
    };
    const interview: StoredInterview = {
      id: clientData.id,
      studyId: clientData.studyId,
      studyName: clientData.studyName || 'Unknown Study',
      participantProfile: clientData.participantProfile || defaultProfile,
      transcript: clientData.transcript,
      synthesis: clientData.synthesis || null,
      behaviorData: clientData.behaviorData || {
        timePerTopic: {},
        messagesPerTopic: {},
        topicsExplored: [],
        contradictions: []
      },
      // Server-controlled timestamps - don't trust client-provided values
      // Accept client createdAt only if in the past and within 30 days
      createdAt: clientData.createdAt && clientData.createdAt < now && clientData.createdAt > now - 30 * 24 * 60 * 60 * 1000
        ? clientData.createdAt
        : now,
      completedAt: now,  // Always server-generated
      status: 'completed'  // Always set by server
    };

    // Check if KV is available
    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      // Return success but with warning
      console.warn('KV not available. Interview not persisted.');
      return NextResponse.json({
        success: false,
        id: interview.id,
        warning: '尚未配置存储。 Interview not persisted.'
      });
    }

    // Save the interview using researcher's KV client
    const success = await saveInterview(interview, context.kvClient);

    if (!success) {
      return NextResponse.json(
        { error: '保存访谈失败' },
        { status: 500 }
      );
    }

    // Update study metadata (increment count and lock if first interview)
    // These operations are non-critical - don't fail the request if they fail
    try {
      await incrementStudyInterviewCount(interview.studyId, context.kvClient);
      await lockStudy(interview.studyId, context.kvClient);
    } catch (studyUpdateError) {
      // Log but don't fail - study may not exist in KV (legacy/token-only studies)
      console.warn('更新研究失败 metadata:', studyUpdateError);
    }

    return NextResponse.json({ success: true, id: interview.id });
  } catch (error) {
    console.error('Save interview API error:', error);
    return NextResponse.json(
      { error: '保存访谈失败' },
      { status: 500 }
    );
  }
}
