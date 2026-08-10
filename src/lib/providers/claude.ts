// Claude AI Provider Implementation
// Server-side only - uses API key from environment

import Anthropic from '@anthropic-ai/sdk';
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
  DEFAULT_CLAUDE_MODEL,
  CLAUDE_SYNTHESIS_MODEL
} from '@/types';

// Thinking budget for reasoning operations (16K tokens)
const THINKING_BUDGET = 16384;

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(model?: string, apiKey?: string | null) {
    // Only fall back to env var when apiKey is undefined (not explicitly provided)
    // In hosted mode, an empty string is passed to prevent env var fallback
    const key = apiKey !== undefined ? (apiKey || undefined) : process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is required for Claude provider');
    }
    this.client = new Anthropic({ apiKey: key });
    // Priority: constructor param > CLAUDE_MODEL env > AI_MODEL env (legacy) > default
    this.model = model ||
      process.env.CLAUDE_MODEL ||
      process.env.AI_MODEL ||
      DEFAULT_CLAUDE_MODEL;
  }

  // For interview responses - no thinking by default (unless explicitly enabled)
  private getInterviewThinking(enableReasoning?: boolean): { type: 'enabled'; budget_tokens: number } | undefined {
    if (enableReasoning === true) {
      return { type: 'enabled', budget_tokens: THINKING_BUDGET };
    }
    return undefined; // Disabled by default
  }

  // For synthesis operations - thinking enabled by default (unless explicitly disabled)
  private getSynthesisThinking(enableReasoning?: boolean): { type: 'enabled'; budget_tokens: number } | undefined {
    if (enableReasoning === false) {
      return undefined; // Explicitly disabled
    }
    return { type: 'enabled', budget_tokens: THINKING_BUDGET };
  }

  async generateInterviewResponse(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    participantProfile: ParticipantProfile | null,
    questionProgress: QuestionProgress,
    currentContext: string
  ): Promise<AIInterviewResponse> {
    const systemPrompt = buildInterviewSystemPrompt(
      studyConfig,
      participantProfile,
      questionProgress,
      currentContext
    );

    // Define tool for structured response
    const interviewResponseTool: Anthropic.Tool = {
      name: 'interview_response',
      description: '生成结构化访谈回复',
      input_schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '对参与者的回复'
          },
          questionAddressed: {
            type: ['number', 'null'],
            description: '本轮中已得到实质性回应的核心问题索引（从 0 开始），或 null'
          },
          phaseTransition: {
            type: ['string', 'null'],
            enum: ['background', 'core-questions', 'exploration', 'feedback', 'wrap-up', null],
            description: '若访谈应进入新阶段，请指定该阶段'
          },
          profileUpdates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                fieldId: { type: 'string' },
                value: { type: ['string', 'null'] },
                status: {
                  type: 'string',
                  enum: ['extracted', 'vague', 'refused']
                }
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
    };

    // Convert history to Claude format
    const messages: Anthropic.MessageParam[] = history.slice(-10).map(h => ({
      role: h.role === 'ai' ? 'assistant' : 'user',
      content: h.content
    }));

    try {
      const thinkingConfig = this.getInterviewThinking(studyConfig.enableReasoning);
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: thinkingConfig ? THINKING_BUDGET + 2048 : 1024,  // Increase max_tokens if thinking enabled
        ...(thinkingConfig && { thinking: thinkingConfig }),
        system: systemPrompt + '\n\n你必须使用 interview_response 工具提供回复。',
        tools: [interviewResponseTool],
        tool_choice: { type: 'tool', name: 'interview_response' },
        messages
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        const input = toolUse.input as Record<string, unknown>;
        return {
          message: (input.message as string) || "这很有意思。您能再多说一些吗？",
          questionAddressed: (input.questionAddressed as number | null) ?? null,
          phaseTransition: (input.phaseTransition as AIInterviewResponse['phaseTransition']) ?? null,
          profileUpdates: (input.profileUpdates as AIInterviewResponse['profileUpdates']) || [],
          shouldConclude: (input.shouldConclude as boolean) || false
        };
      }

      return defaultInterviewResponse;
    } catch (error) {
      console.error('Claude interview response error:', error);
      return defaultInterviewResponse;
    }
  }

  async getInterviewGreeting(studyConfig: StudyConfig): Promise<string> {
    const prompt = buildGreetingPrompt(studyConfig);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      const textBlock = response.content.find(block => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        return textBlock.text;
      }
      return getDefaultGreeting(studyConfig);
    } catch (error) {
      console.error('Claude greeting error:', error);
      return getDefaultGreeting(studyConfig);
    }
  }

  async synthesizeInterview(
    history: InterviewMessage[],
    studyConfig: StudyConfig,
    behaviorData: BehaviorData,
    participantProfile: ParticipantProfile | null
  ): Promise<SynthesisResult> {
    // Define tool for structured synthesis (Claude-specific)
    const synthesisTool: Anthropic.Tool = {
      name: 'synthesis_result',
      description: '生成结构化访谈综合分析',
      input_schema: {
        type: 'object',
        properties: {
          statedPreferences: {
            type: 'array',
            items: { type: 'string' },
            description: '参与者明确表示其重视或希望获得的内容'
          },
          revealedPreferences: {
            type: 'array',
            items: { type: 'string' },
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
          contradictions: {
            type: 'array',
            items: { type: 'string' }
          },
          keyInsights: {
            type: 'array',
            items: { type: 'string' }
          },
          bottomLine: {
            type: 'string',
            description: '面向研究者的一句话总结洞见'
          }
        },
        required: ['statedPreferences', 'revealedPreferences', 'themes', 'keyInsights', 'bottomLine']
      }
    };

    const prompt = buildSynthesisPrompt(history, studyConfig, behaviorData, participantProfile) +
      '\n\n请使用 synthesis_result 工具提供分析。';

    try {
      const thinkingConfig = this.getSynthesisThinking(studyConfig.enableReasoning);
      const response = await this.client.messages.create({
        model: CLAUDE_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        max_tokens: thinkingConfig ? THINKING_BUDGET + 4096 : 2048,  // Increase for thinking
        ...(thinkingConfig && { thinking: thinkingConfig }),
        tools: [synthesisTool],
        tool_choice: { type: 'tool', name: 'synthesis_result' },
        messages: [{ role: 'user', content: prompt }]
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        return toolUse.input as SynthesisResult;
      }

      return defaultSynthesisResult;
    } catch (error) {
      console.error('Claude synthesis error:', error);
      return defaultSynthesisResult;
    }
  }

  async synthesizeAggregate(
    studyConfig: StudyConfig,
    syntheses: SynthesisResult[],
    interviewCount: number
  ) {
    // Define tool for structured aggregate synthesis
    const aggregateTool: Anthropic.Tool = {
      name: 'aggregate_synthesis_result',
      description: '生成跨多场访谈的结构化汇总分析',
      input_schema: {
        type: 'object',
        properties: {
          commonThemes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                theme: { type: 'string' },
                frequency: { type: 'number' },
                representativeQuotes: {
                  type: 'array',
                  items: { type: 'string' }
                }
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
            type: 'array',
            items: { type: 'string' },
            description: '回答研究问题的主要发现'
          },
          researchImplications: {
            type: 'array',
            items: { type: 'string' },
            description: '这些发现对领域或实践的意义'
          },
          bottomLine: {
            type: 'string',
            description: '用一段话概述所有访谈的关键要点'
          }
        },
        required: ['commonThemes', 'keyFindings', 'bottomLine']
      }
    };

    const prompt = buildAggregateSynthesisPrompt(studyConfig, syntheses, interviewCount) +
      '\n\n请使用 aggregate_synthesis_result 工具提供分析。';

    try {
      const thinkingConfig = this.getSynthesisThinking(studyConfig.enableReasoning);
      const response = await this.client.messages.create({
        model: CLAUDE_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        max_tokens: thinkingConfig ? THINKING_BUDGET + 8192 : 4096,  // Increase for thinking
        ...(thinkingConfig && { thinking: thinkingConfig }),
        tools: [aggregateTool],
        tool_choice: { type: 'tool', name: 'aggregate_synthesis_result' },
        messages: [{ role: 'user', content: prompt }]
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        return toolUse.input as typeof defaultAggregateSynthesisResult;
      }

      return defaultAggregateSynthesisResult;
    } catch (error) {
      console.error('Claude aggregate synthesis error:', error);
      return defaultAggregateSynthesisResult;
    }
  }

  async generateFollowupStudy(
    parentConfig: StudyConfig,
    synthesis: AggregateSynthesisResult
  ): Promise<{ name: string; researchQuestion: string; coreQuestions: string[] }> {
    // Define tool for structured follow-up generation
    const followupTool: Anthropic.Tool = {
      name: 'followup_study',
      description: '基于综合分析发现生成后续研究',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '简洁的研究名称（应以“后续研究：”开头）'
          },
          researchQuestion: {
            type: 'string',
            description: '基于这些发现的具体、可研究的问题'
          },
          coreQuestions: {
            type: 'array',
            items: { type: 'string' },
            description: '用于进一步探讨的 3-5 个访谈问题'
          }
        },
        required: ['name', 'researchQuestion', 'coreQuestions']
      }
    };

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

请使用 followup_study 工具提供回复。`;

    try {
      const thinkingConfig = this.getSynthesisThinking(parentConfig.enableReasoning);
      const response = await this.client.messages.create({
        model: CLAUDE_SYNTHESIS_MODEL,  // Use the configured higher-capability synthesis model
        max_tokens: thinkingConfig ? THINKING_BUDGET + 2048 : 1024,  // Increase for thinking
        ...(thinkingConfig && { thinking: thinkingConfig }),
        tools: [followupTool],
        tool_choice: { type: 'tool', name: 'followup_study' },
        messages: [{ role: 'user', content: prompt }]
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (toolUse && toolUse.type === 'tool_use') {
        const input = toolUse.input as { name: string; researchQuestion: string; coreQuestions: string[] };
        return {
          name: input.name || `后续研究：${parentConfig.name}`,
          researchQuestion: input.researchQuestion || synthesis.keyFindings[0] || '',
          coreQuestions: input.coreQuestions || []
        };
      }

      // Fallback to deterministic generation
      return {
        name: `后续研究：${parentConfig.name}`,
        researchQuestion: `深入探讨以下内容后，会浮现哪些更深层的洞见：${synthesis.keyFindings[0] || '这些发现'}?`,
        coreQuestions: synthesis.keyFindings.slice(0, 3).map(f =>
          `您能再详细说说您与以下内容相关的经历吗：${f}?`
        )
      };
    } catch (error) {
      console.error('Claude follow-up generation error:', error);
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
