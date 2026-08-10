// AI Provider Abstraction Layer
// Supports Gemini (default) and Claude for interview AI

import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  SynthesisResult,
  BehaviorData,
  AIInterviewResponse,
  QuestionProgress,
  AggregateSynthesisResult
} from '@/types';

// Re-export prompts from centralized location
// See src/lib/prompts/ for customization
export {
  buildInterviewSystemPrompt,
  getAIBehaviorInstruction,
  formatProfileFields
} from './prompts';

// Provider interface for interview AI
export interface AIProvider {
  generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    questionProgress: QuestionProgress,
    currentContext: string
  ): Promise<AIInterviewResponse>;

  getInterviewGreeting(studyConfig: StudyConfig): Promise<string>;

  synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null
  ): Promise<SynthesisResult>;

  synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ): Promise<Omit<AggregateSynthesisResult, 'studyId' | 'interviewCount' | 'generatedAt'>>;

  generateFollowupStudy(
    parentConfig: StudyConfig,
    synthesis: AggregateSynthesisResult
  ): Promise<{ name: string; researchQuestion: string; coreQuestions: string[] }>;
}

// Response schema for structured output (Gemini format)
export const interviewResponseSchema = {
  type: 'OBJECT' as const,
  properties: {
    message: {
      type: 'STRING' as const,
      description: '对参与者的回复'
    },
    questionAddressed: {
      type: 'NUMBER' as const,
      nullable: true,
      description: '本轮中已得到实质性回应的核心问题索引（从 0 开始），或 null'
    },
    phaseTransition: {
      type: 'STRING' as const,
      nullable: true,
      enum: ['background', 'core-questions', 'exploration', 'feedback', 'wrap-up'],
      description: '若访谈应进入新阶段，请指定该阶段'
    },
    profileUpdates: {
      type: 'ARRAY' as const,
      items: {
        type: 'OBJECT' as const,
        properties: {
          fieldId: { type: 'STRING' as const },
          value: { type: 'STRING' as const, nullable: true },
          status: {
            type: 'STRING' as const,
            enum: ['extracted', 'vague', 'refused']
          }
        },
        required: ['fieldId', 'status']
      },
      description: '从用户回答中提取或更新的档案字段'
    },
    shouldConclude: {
      type: 'BOOLEAN' as const,
      description: '若访谈应结束（在收尾消息后），则为 true'
    }
  },
  required: ['message', 'profileUpdates', 'shouldConclude']
};

// Synthesis response schema
export const synthesisResponseSchema = {
  type: 'OBJECT' as const,
  properties: {
    statedPreferences: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const },
      description: '参与者明确表示其重视或希望获得的内容'
    },
    revealedPreferences: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const },
      description: '其行为或侧重点所揭示的内容'
    },
    themes: {
      type: 'ARRAY' as const,
      items: {
        type: 'OBJECT' as const,
        properties: {
          theme: { type: 'STRING' as const },
          evidence: { type: 'STRING' as const },
          frequency: { type: 'NUMBER' as const }
        }
      }
    },
    contradictions: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const }
    },
    keyInsights: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const }
    },
    bottomLine: {
      type: 'STRING' as const,
      description: '面向研究者的一句话总结洞见'
    }
  },
  required: ['statedPreferences', 'revealedPreferences', 'themes', 'keyInsights', 'bottomLine']
};

// Clean JSON from AI response
export const cleanJSON = (text: string): string => {
  if (!text) return '{}';
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    let depth = 0;
    for (let i = firstBracket; i < cleaned.length; i++) {
      if (cleaned[i] === '[') depth++;
      if (cleaned[i] === ']') depth--;
      if (depth === 0) return cleaned.substring(firstBracket, i + 1);
    }
  }

  if (firstBrace !== -1) {
    let depth = 0;
    for (let i = firstBrace; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      if (cleaned[i] === '}') depth--;
      if (depth === 0) return cleaned.substring(firstBrace, i + 1);
    }
  }

  return cleaned;
};

// Default fallback responses
export const defaultInterviewResponse: AIInterviewResponse = {
  message: "感谢您的分享。还有什么想法浮现在您脑海中吗？",
  questionAddressed: null,
  phaseTransition: null,
  profileUpdates: [],
  shouldConclude: false
};

export const defaultSynthesisResult: SynthesisResult = {
  statedPreferences: [],
  revealedPreferences: [],
  themes: [],
  contradictions: [],
  keyInsights: ['分析待完成……'],
  bottomLine: '访谈综合分析正在进行。'
};

// Aggregate synthesis response schema (Gemini format)
export const aggregateSynthesisResponseSchema = {
  type: 'OBJECT' as const,
  properties: {
    commonThemes: {
      type: 'ARRAY' as const,
      items: {
        type: 'OBJECT' as const,
        properties: {
          theme: { type: 'STRING' as const },
          frequency: { type: 'NUMBER' as const },
          representativeQuotes: {
            type: 'ARRAY' as const,
            items: { type: 'STRING' as const }
          }
        }
      },
      description: '跨多场访谈出现的模式'
    },
    divergentViews: {
      type: 'ARRAY' as const,
      items: {
        type: 'OBJECT' as const,
        properties: {
          topic: { type: 'STRING' as const },
          viewA: { type: 'STRING' as const },
          viewB: { type: 'STRING' as const }
        }
      },
      description: '参与者观点不同的领域'
    },
    keyFindings: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const },
      description: '回答研究问题的主要发现'
    },
    researchImplications: {
      type: 'ARRAY' as const,
      items: { type: 'STRING' as const },
      description: '这些发现对领域或实践的意义'
    },
    bottomLine: {
      type: 'STRING' as const,
      description: '用一段话概述所有访谈的关键要点'
    }
  },
  required: ['commonThemes', 'keyFindings', 'bottomLine']
};

// Default fallback for aggregate synthesis
export const defaultAggregateSynthesisResult = {
  commonThemes: [],
  divergentViews: [],
  keyFindings: ['分析待完成……'],
  researchImplications: [],
  bottomLine: '汇总综合分析正在进行。'
};
