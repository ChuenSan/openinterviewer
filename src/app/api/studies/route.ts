// GET /api/studies - List all studies
// POST /api/studies - Create new study
// Protected: Requires authenticated session

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAllStudies, saveStudy, isKVAvailable } from '@/lib/kv';
import { getRequestContext } from '@/lib/researcherContext';
import { registerStudyOwnership } from '@/lib/platformDb';
import { isHostedMode } from '@/lib/mode';
import { StudyConfig, StoredStudy } from '@/types';
import { randomUUID } from 'crypto';

// GET /api/studies - List all saved studies
export async function GET() {
  try {
    const { authorized, context, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json({
        studies: [],
        warning: '尚未配置存储。请连接 Vercel KV 以启用持久化。'
      });
    }

    const studies = await getAllStudies(context.kvClient);
    return NextResponse.json({ studies });
  } catch (error) {
    console.error('Studies API error:', error);
    return NextResponse.json(
      { error: '获取研究列表失败' },
      { status: 500 }
    );
  }
}

// POST /api/studies - Create new study
export async function POST(request: Request) {
  try {
    const { authorized, context, researcherId, error } = await getRequestContext();
    if (!authorized || !context) {
      return NextResponse.json({ error: error || '未授权' }, { status: 401 });
    }

    const kvAvailable = await isKVAvailable(context.kvClient);
    if (!kvAvailable) {
      return NextResponse.json(
        { error: '尚未配置存储。请连接 Vercel KV 以启用持久化。' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { config } = body as { config: StudyConfig };

    if (!config) {
      return NextResponse.json(
        { error: '缺少必填字段：config' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!config.name || !config.researchQuestion || !config.coreQuestions?.length) {
      return NextResponse.json(
        { error: '研究必须包含 name、researchQuestion 和至少一个核心问题' },
        { status: 400 }
      );
    }

    // Create server-assigned ID
    const now = Date.now();
    const studyId = randomUUID();

    // Update config with server-assigned ID
    const serverConfig: StudyConfig = {
      ...config,
      id: studyId,
      createdAt: now
    };

    const storedStudy: StoredStudy = {
      id: studyId,
      config: serverConfig,
      createdAt: now,
      updatedAt: now,
      interviewCount: 0,
      isLocked: false
    };

    const success = await saveStudy(storedStudy, context.kvClient);
    if (!success) {
      return NextResponse.json(
        { error: '保存研究失败' },
        { status: 500 }
      );
    }

    // In hosted mode, register study ownership for cross-tenant lookup
    if (isHostedMode() && researcherId) {
      try {
        await registerStudyOwnership(studyId, researcherId);
      } catch (err) {
        console.warn('Failed to register study ownership:', err);
      }
    }

    return NextResponse.json({
      study: storedStudy,
      message: '研究保存成功'
    });
  } catch (error) {
    console.error('Create study API error:', error);
    return NextResponse.json(
      { error: '创建研究失败' },
      { status: 500 }
    );
  }
}
