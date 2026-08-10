// OpenAI AI Provider Implementation
// Uses OpenAI Chat Completions API with tool calling for structured output
// Supports custom base URL for compatibility with any OpenAI-compatible endpoint

import OpenAI from 'openai';
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
  DEFAULT_OPENAI_MODEL,
  OPENAI_SYNTHESIS_MODEL
} from '@/types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(model?: string, apiKey?: string | null) {
    const key = apiKey !== undefined ? (apiKey || undefined) : process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY is required for OpenAI provider');
    }
    // Support custom base URL for OpenAI-compatible endpoints (e.g., Groq, Together, local Ollama)
    const baseURL = process.env.OPENAI_BASE_URL || undefined;
    this.client = new OpenAI({ apiKey: key, ...(baseURL && { baseURL }) });
    this.model = model ||
      process.env.OPENAI_MODEL ||
      process.env.AI_MODEL ||
      DEFAULT_OPENAI_MODEL;
  }

  // Shared tool definitions (provider-agnostic JSON Schema)
  private getInterviewResponseTool(): OpenAI.Chat.Completions.ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'interview_response',
        description: '生成结构化访谈回复',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: '对参与者的回复' },
            questionAddressed: {
              type: ['number', 'null'],
              description: '本轮中已得到实质性回应的核心问题索引（从 0 开始），或 null'
            },
            phaseTransition: {
              type: ['string', 'null'],
              enum: ['background', 'core-questions', 'exploration', 'feedback', 'wrap-up'],
              description: '若访谈应进入新阶段，请指定该阶段'
            },
            profileUpdates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fieldId: { type: 'string' },
                  value: { type: ['string', 'null'] },
                  status: { type: 'string', enum: ['extracted', 'vague', 'refused'] }
                },
                required: ['fieldId', 'status']
              },
              description: '从用户回答中提取或更新的档案字段'
            },
            shouldConclude: {
              type: 'boolean',
              description: '若访谈应结束（在收尾消息后），则为 true'
            }
          },
          required: ['message', 'profileUpdates', 'shouldConclude']
        }
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
    const systemPrompt = buildInterviewSystemPrompt(
      studyConfig, participantProfile, questionProgress, currentContext
    );

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt + '\n\n你必须使用 interview_response 函数提供回复。' },
      ...history.slice(-10).map(h => ({
        role: (h.role === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: h.content
      }))
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: studyConfig.enableReasoning ? 18432 : 1024,
        messages,
        tools: [this.getInterviewResponseTool()],
        tool_choice: { type: 'function', function: { name: 'interview_response' } }
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.type === 'function' && toolCall.function.arguments) {
        const input = JSON.parse(toolCall.function.arguments);
        return {
          message: input.message || "这很有意思。您能再多说一些吗？",
          questionAddressed: input.questionAddressed ?? null,
          phaseTransition: input.phaseTransition ?? null,
          profileUpdates: input.profileUpdates || [],
          shouldConclude: input.shouldConclude || false
        };
      }

      return defaultInterviewResponse;
    } catch (error) {
      console.error('OpenAI interview response error:', error);
      return defaultInterviewResponse;
    }
  }

  async getInterviewGreeting(studyConfig: StudyConfig): Promise<string> {
    const prompt = buildGreetingPrompt(studyConfig);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.choices[0]?.message?.content || getDefaultGreeting(studyConfig);
    } catch (error) {
      console.error('OpenAI greeting error:', error);
      return getDefaultGreeting(studyConfig);
    }
  }

  async synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null
  ): Promise<SynthesisResult> {
    const prompt = buildSynthesisPrompt(history, studyConfig, behaviorData, participantProfile) +
      '\n\n请使用 synthesis_result 函数提供分析。';

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: studyConfig.enableReasoning !== false ? 20480 : 2048,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'synthesis_result',
            description: '生成结构化访谈综合分析',
            parameters: {
              type: 'object',
              properties: {
                statedPreferences: {
                  type: 'array', items: { type: 'string' },
                  description: '参与者明确表示其重视或希望获得的内容'
                },
                revealedPreferences: {
                  type: 'array', items: { type: 'string' },
                  description: '其行为或侧重点所揭示的内容'
                },
                themes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      evidence: { type: 'string' },
                      frequency: { type: 'number' }
                    },
                    required: ['theme', 'evidence', 'frequency']
                  }
                },
                contradictions: { type: 'array', items: { type: 'string' } },
                keyInsights: { type: 'array', items: { type: 'string' } },
                bottomLine: {
                  type: 'string',
                  description: '面向研究者的一句话总结洞见'
                }
              },
              required: ['statedPreferences', 'revealedPreferences', 'themes', 'keyInsights', 'bottomLine']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'synthesis_result' } }
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.type === 'function' && toolCall.function.arguments) {
        return JSON.parse(toolCall.function.arguments) as SynthesisResult;
      }

      return defaultSynthesisResult;
    } catch (error) {
      console.error('OpenAI synthesis error:', error);
      return defaultSynthesisResult;
    }
  }

  async synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ) {
    const prompt = buildAggregateSynthesisPrompt(studyConfig, syntheses, interviewCount) +
      '\n\n请使用 aggregate_synthesis_result 函数提供分析。';

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: studyConfig.enableReasoning !== false ? 24576 : 4096,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'aggregate_synthesis_result',
            description: '生成跨多场访谈的结构化汇总分析',
            parameters: {
              type: 'object',
              properties: {
                commonThemes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      theme: { type: 'string' },
                      frequency: { type: 'number' },
                      representativeQuotes: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['theme', 'frequency', 'representativeQuotes']
                  },
                  description: '跨多场访谈出现的模式'
                },
                divergentViews: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      topic: { type: 'string' },
                      viewA: { type: 'string' },
                      viewB: { type: 'string' }
                    },
                    required: ['topic', 'viewA', 'viewB']
                  },
                  description: '参与者观点不同的领域'
                },
                keyFindings: {
                  type: 'array', items: { type: 'string' },
                  description: '回答研究问题的主要发现'
                },
                researchImplications: {
                  type: 'array', items: { type: 'string' },
                  description: '这些发现对领域或实践的意义'
                },
                bottomLine: {
                  type: 'string',
                  description: '用一段话概述所有访谈的关键要点'
                }
              },
              required: ['commonThemes', 'keyFindings', 'bottomLine']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'aggregate_synthesis_result' } }
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.type === 'function' && toolCall.function.arguments) {
        return JSON.parse(toolCall.function.arguments);
      }

      return defaultAggregateSynthesisResult;
    } catch (error) {
      console.error('OpenAI aggregate synthesis error:', error);
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

请使用 followup_study 函数提供回复。`;

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: parentConfig.enableReasoning !== false ? 18432 : 1024,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'followup_study',
            description: '基于综合分析发现生成后续研究',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '简洁的研究名称（应以“后续研究：”开头）' },
                researchQuestion: { type: 'string', description: '基于这些发现的具体、可研究的问题' },
                coreQuestions: {
                  type: 'array', items: { type: 'string' },
                  description: '用于进一步探讨的 3-5 个访谈问题'
                }
              },
              required: ['name', 'researchQuestion', 'coreQuestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'followup_study' } }
      });

      const toolCall = response.choices[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.type === 'function' && toolCall.function.arguments) {
        const input = JSON.parse(toolCall.function.arguments);
        return {
          name: input.name || `后续研究：${parentConfig.name}`,
          researchQuestion: input.researchQuestion || synthesis.keyFindings[0] || '',
          coreQuestions: input.coreQuestions || []
        };
      }

      return {
        name: `后续研究：${parentConfig.name}`,
        researchQuestion: `深入探讨以下内容后，会浮现哪些更深层的洞见：${synthesis.keyFindings[0] || '这些发现'}?`,
        coreQuestions: synthesis.keyFindings.slice(0, 3).map(f =>
          `您能再详细说说您与以下内容相关的经历吗：${f}?`
        )
      };
    } catch (error) {
      console.error('OpenAI follow-up generation error:', error);
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