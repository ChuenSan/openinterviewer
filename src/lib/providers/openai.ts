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
        description: 'Generate a structured interview response',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Your response to the participant' },
            questionAddressed: {
              type: ['number', 'null'],
              description: '0-based index of core question substantially addressed in this exchange, or null'
            },
            phaseTransition: {
              type: ['string', 'null'],
              enum: ['background', 'core-questions', 'exploration', 'feedback', 'wrap-up'],
              description: 'If interview should move to a new phase, specify it'
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
              description: 'Profile fields extracted or updated from user response'
            },
            shouldConclude: {
              type: 'boolean',
              description: 'True if interview should end (after wrap-up message)'
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
      { role: 'system', content: systemPrompt + '\n\nYou MUST use the interview_response function to provide your response.' },
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
          message: input.message || "That's interesting. Could you tell me more?",
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
      '\n\nUse the synthesis_result function to provide your analysis.';

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: studyConfig.enableReasoning !== false ? 20480 : 2048,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'synthesis_result',
            description: 'Generate a structured interview synthesis',
            parameters: {
              type: 'object',
              properties: {
                statedPreferences: {
                  type: 'array', items: { type: 'string' },
                  description: 'What participant explicitly said they value/want'
                },
                revealedPreferences: {
                  type: 'array', items: { type: 'string' },
                  description: 'What their behavior/emphasis revealed'
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
                  description: 'One-sentence summary insight for the researcher'
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
      '\n\nUse the aggregate_synthesis_result function to provide your analysis.';

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: studyConfig.enableReasoning !== false ? 24576 : 4096,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'aggregate_synthesis_result',
            description: 'Generate a structured aggregate synthesis across multiple interviews',
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
                  description: 'Patterns appearing across multiple interviews'
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
                  description: 'Areas where participants had different perspectives'
                },
                keyFindings: {
                  type: 'array', items: { type: 'string' },
                  description: 'Major discoveries that answer the research question'
                },
                researchImplications: {
                  type: 'array', items: { type: 'string' },
                  description: 'What these findings mean for the field/practice'
                },
                bottomLine: {
                  type: 'string',
                  description: 'One paragraph summarizing key takeaways from all interviews'
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
    const prompt = `You are helping design a follow-up research study.

PARENT STUDY: "${parentConfig.name}"
PARENT SUMMARY: ${synthesis.bottomLine}

KEY FINDINGS:
${synthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

RESEARCH IMPLICATIONS:
${(synthesis.researchImplications || []).map((r, i) => `${i + 1}. ${r}`).join('\n') || 'None specified'}

DIVERGENT VIEWS:
${(synthesis.divergentViews || []).map(d => `- ${d.topic}: "${d.viewA}" vs "${d.viewB}"`).join('\n') || 'None identified'}

Generate a follow-up study that digs deeper into gaps or tensions found.
The follow-up should explore unanswered questions or interesting patterns from the original study.

Use the followup_study function to provide your response.`;

    try {
      const response = await this.client.chat.completions.create({
        model: OPENAI_SYNTHESIS_MODEL,
        max_tokens: parentConfig.enableReasoning !== false ? 18432 : 1024,
        messages: [{ role: 'user', content: prompt }],
        tools: [{
          type: 'function',
          function: {
            name: 'followup_study',
            description: 'Generate a follow-up research study based on synthesis findings',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'A concise study name (should start with "Follow-up: ")' },
                researchQuestion: { type: 'string', description: 'A specific, researchable question building on the findings' },
                coreQuestions: {
                  type: 'array', items: { type: 'string' },
                  description: '3-5 interview questions to explore this further'
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
          name: input.name || `Follow-up: ${parentConfig.name}`,
          researchQuestion: input.researchQuestion || synthesis.keyFindings[0] || '',
          coreQuestions: input.coreQuestions || []
        };
      }

      return {
        name: `Follow-up: ${parentConfig.name}`,
        researchQuestion: `What deeper insights emerge from exploring: ${synthesis.keyFindings[0] || 'the findings'}?`,
        coreQuestions: synthesis.keyFindings.slice(0, 3).map(f =>
          `Can you tell me more about your experience with: ${f}?`
        )
      };
    } catch (error) {
      console.error('OpenAI follow-up generation error:', error);
      return {
        name: `Follow-up: ${parentConfig.name}`,
        researchQuestion: `What deeper insights emerge from exploring: ${synthesis.keyFindings[0] || 'the findings'}?`,
        coreQuestions: synthesis.keyFindings.slice(0, 3).map(f =>
          `Can you tell me more about your experience with: ${f}?`
        )
      };
    }
  }
}