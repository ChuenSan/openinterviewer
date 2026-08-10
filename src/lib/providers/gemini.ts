// Gemini AI Provider Implementation
// Server-side only - uses API key from environment

import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  AIProvider,
  buildInterviewSystemPrompt,
  cleanJSON,
  defaultInterviewResponse,
  defaultSynthesisResult,
  defaultAggregateSynthesisResult
} from '../ai';
import {
  buildGreetingPrompt,
  getDefaultGreeting,
  buildSynthesisPrompt,
  buildAggregateSynthesisPrompt
} from '../prompts';
import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  SynthesisResult,
  BehaviorData,
  AIInterviewResponse,
  QuestionProgress,
  AggregateSynthesisResult,
  DEFAULT_GEMINI_MODEL,
  GEMINI_SYNTHESIS_MODEL
} from '@/types';

// Thinking budget for 2.5 models (16K tokens)
const THINKING_BUDGET_25 = 16384;

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(model?: string, apiKey?: string | null) {
    // Only fall back to env var when apiKey is undefined (not explicitly provided)
    // In hosted mode, an empty string is passed to prevent env var fallback
    const key = apiKey !== undefined ? (apiKey || undefined) : process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
    // Priority: constructor param > GEMINI_MODEL env > AI_MODEL env (legacy) > default
    this.model = model ||
      process.env.GEMINI_MODEL ||
      process.env.AI_MODEL ||
      DEFAULT_GEMINI_MODEL;
  }

  // For interview responses (2.5 models) - disable thinking for speed (unless explicitly enabled)
  private getInterviewThinkingConfig(enableReasoning?: boolean) {
    const useReasoning = enableReasoning === true;
    return {
      thinkingConfig: {
        thinkingBudget: useReasoning ? THINKING_BUDGET_25 : 0
      }
    };
  }

  // For synthesis operations (Gemini 3.1 Pro) - use thinkingLevel instead of thinkingBudget
  private getSynthesisThinkingConfig(enableReasoning?: boolean) {
    const useReasoning = enableReasoning !== false;
    return {
      thinkingConfig: {
        // Gemini 3.1 Pro uses ThinkingLevel enum instead of thinkingBudget
        thinkingLevel: useReasoning ? ThinkingLevel.HIGH : ThinkingLevel.LOW
      }
    };
  }

  async generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    questionProgress: QuestionProgress,
    currentContext: string
  ): Promise<AIInterviewResponse> {
    const systemInstruction = buildInterviewSystemPrompt(
      studyConfig,
      participantProfile,
      questionProgress,
      currentContext
    );

    try {
      const chat = this.ai.chats.create({
        model: this.model,
        config: {
          systemInstruction,
          ...this.getInterviewThinkingConfig(studyConfig.enableReasoning),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: '对参与者的回复'
              },
              questionAddressed: {
                type: Type.NUMBER,
                nullable: true,
                description: '本轮中已得到实质性回应的核心问题索引（从 0 开始），或 null'
              },
              phaseTransition: {
                type: Type.STRING,
                nullable: true,
                enum: ['background', 'core-questions', 'exploration', 'feedback', 'wrap-up'],
                description: '若访谈应进入新阶段，请指定该阶段'
              },
              profileUpdates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fieldId: { type: Type.STRING },
                    value: { type: Type.STRING, nullable: true },
                    status: {
                      type: Type.STRING,
                      enum: ['extracted', 'vague', 'refused']
                    }
                  },
                  required: ['fieldId', 'status']
                },
                description: '从用户回答中提取或更新的档案字段'
              },
              shouldConclude: {
                type: Type.BOOLEAN,
                description: '若访谈应结束（在收尾消息后），则为 true'
              }
            },
            required: ['message', 'profileUpdates', 'shouldConclude']
          }
        },
        history: history.slice(-10).map(h => ({
          role: h.role === 'ai' ? 'model' : 'user',
          parts: [{ text: h.content }]
        }))
      });

      const lastUserMessage = history.filter(m => m.role === 'user').pop();
      const result = await chat.sendMessage({
        message: lastUserMessage?.content || '请继续访谈。'
      });

      const parsed = JSON.parse(cleanJSON(result.text || '{}'));
      return {
        message: parsed.message || "这很有意思。您能再多说一些吗？",
        questionAddressed: parsed.questionAddressed ?? null,
        phaseTransition: parsed.phaseTransition ?? null,
        profileUpdates: parsed.profileUpdates || [],
        shouldConclude: parsed.shouldConclude || false
      };
    } catch (error) {
      console.error('Gemini interview response error:', error);
      return defaultInterviewResponse;
    }
  }

  async getInterviewGreeting(studyConfig: StudyConfig): Promise<string> {
    const prompt = buildGreetingPrompt(studyConfig);

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt
      });
      return response.text || getDefaultGreeting(studyConfig);
    } catch (error) {
      console.error('Gemini greeting error:', error);
      return getDefaultGreeting(studyConfig);
    }
  }

  async synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null
  ): Promise<SynthesisResult> {
    const prompt = buildSynthesisPrompt(history, studyConfig, behaviorData, participantProfile);

    try {
      const response = await this.ai.models.generateContent({
        model: GEMINI_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        contents: prompt,
        config: {
          ...this.getSynthesisThinkingConfig(studyConfig.enableReasoning),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              statedPreferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '参与者明确表示其重视或希望获得的内容'
              },
              revealedPreferences: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '其行为或侧重点所揭示的内容'
              },
              themes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    frequency: { type: Type.NUMBER }
                  }
                }
              },
              contradictions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              keyInsights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              bottomLine: {
                type: Type.STRING,
                description: '面向研究者的一句话总结洞见'
              }
            },
            required: ['statedPreferences', 'revealedPreferences', 'themes', 'keyInsights', 'bottomLine']
          }
        }
      });

      return JSON.parse(cleanJSON(response.text || '{}')) as SynthesisResult;
    } catch (error) {
      console.error('Gemini synthesis error:', error);
      return defaultSynthesisResult;
    }
  }

  async synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ) {
    const prompt = buildAggregateSynthesisPrompt(studyConfig, syntheses, interviewCount);

    try {
      const response = await this.ai.models.generateContent({
        model: GEMINI_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        contents: prompt,
        config: {
          ...this.getSynthesisThinkingConfig(studyConfig.enableReasoning),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              commonThemes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    frequency: { type: Type.NUMBER },
                    representativeQuotes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              },
              divergentViews: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING },
                    viewA: { type: Type.STRING },
                    viewB: { type: Type.STRING }
                  }
                }
              },
              keyFindings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              researchImplications: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              bottomLine: {
                type: Type.STRING,
                description: '用一段话概述关键要点'
              }
            },
            required: ['commonThemes', 'keyFindings', 'bottomLine']
          }
        }
      });

      return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (error) {
      console.error('Gemini aggregate synthesis error:', error);
      return defaultAggregateSynthesisResult;
    }
  }

  async generateFollowupStudy(
    parentConfig: StudyConfig,
    synthesis: AggregateSynthesisResult
  ): Promise<{ name: string; researchQuestion: string; coreQuestions: string[] }> {
    const prompt = `你正在协助设计一项后续研究。

原研究： "${parentConfig.name}"
原研究摘要： ${synthesis.bottomLine}

关键发现：
${synthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

研究启示：
${(synthesis.researchImplications || []).map((r, i) => `${i + 1}. ${r}`).join('\n') || '未说明'}

分歧观点：
${(synthesis.divergentViews || []).map(d => `- ${d.topic}: "${d.viewA}" vs "${d.viewB}"`).join('\n') || '未发现'}

生成一项后续研究，深入探讨已发现的缺口或张力。
后续研究应探讨原研究中未解答的问题或有意思的模式。

返回一个 JSON 对象，其中包含：
- name: A concise study name (start with "后续研究：")
- researchQuestion: 基于这些发现的具体、可研究的问题
- coreQuestions: 用于进一步探讨的 3-5 个访谈问题`;

    try {
      const response = await this.ai.models.generateContent({
        model: GEMINI_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        contents: prompt,
        config: {
          ...this.getSynthesisThinkingConfig(parentConfig.enableReasoning),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              researchQuestion: { type: Type.STRING },
              coreQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['name', 'researchQuestion', 'coreQuestions']
          }
        }
      });

      const result = JSON.parse(cleanJSON(response.text || '{}'));
      return {
        name: result.name || `后续研究：${parentConfig.name}`,
        researchQuestion: result.researchQuestion || synthesis.keyFindings[0] || '',
        coreQuestions: result.coreQuestions || []
      };
    } catch (error) {
      console.error('Gemini follow-up generation error:', error);
      // Fallback to deterministic generation
      return {
        name: `后续研究：${parentConfig.name}`,
        researchQuestion: `深入探讨以下内容后，会浮现哪些更深层的洞见：${synthesis.keyFindings[0] || '这些发现'}?`,
        coreQuestions: synthesis.keyFindings.slice(0, 3).map(f =>
          `您能再详细说说您与以下内容相关的经历吗：${f}?`
        )
      };
    }
  }
}
