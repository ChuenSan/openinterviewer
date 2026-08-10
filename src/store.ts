'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AppStep,
  ViewMode,
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  BehaviorData,
  SynthesisResult,
  ContextEntry,
  QuestionProgress,
  InterviewPhase,
  ProfileFieldStatus,
  ProfileField
} from './types';

// Example Study: "The Adaptive Self"
const EXAMPLE_STUDY: Omit<StudyConfig, 'id' | 'createdAt'> = {
  name: '适应性自我：AI 时代的职业身份',
  description: '本研究探讨各行业专业人士如何因应 AI 重塑自己的职业叙事，并考察他们对自身价值、未来相关性及专业能力定义变化的看法。',
  researchQuestion: '生成式 AI 融入职场,如何重塑个人对职业能动性、创作身份与长期职业规划的认知?',
  coreQuestions: [
    '回顾您曾认为“高度专业”或“独属于自己”的任务，自 ChatGPT 等工具出现后，您对它们的看法有何变化？',
    '您能描述一个具体时刻吗：AI 让您感到明显更有能力，或相反地因其能力而感到被削弱？',
    '如果将职业发展展望至五年后，您认为哪些人类特质将成为自己最有价值的资本？',
    '我们公开谈论 AI 时(效率!)与私下感受 AI 时(不确定感)之间往往存在落差。您是否感受到这种张力?',
    '您此刻正在与一个 AI 讨论 AI 的影响。这感觉像是协作、工具,还是别的什么?'
  ],
  topicAreas: [
    '“空心化中层”——对入门岗位消失的担忧',
    '创作真实性——AI 辅助作品的归属感',
    '赛博格身份——“我”与“工具”的边界',
    '社会比较——同事采用速度的差异',
    '工作的意义——过程与结果带来的满足感'
  ],
  profileSchema: [
    {
      id: 'role',
      label: '当前职位',
      extractionHint: '其职位名称或职业角色',
      required: true
    },
    {
      id: 'ai_usage',
      label: 'AI 工具使用情况',
      extractionHint: '其使用 AI 工具的频率（每天、每周、很少、从不）',
      required: true,
      options: ['每天', '每周', '每月', '很少', '从不']
    },
    {
      id: 'ai_comfort',
      label: '对 AI 的适应程度',
      extractionHint: '其与 AI 协作时的适应程度（低/中/高）',
      required: false,
      options: ['低', '中', '高']
    }
  ],
  aiBehavior: 'standard',
  consentText: '欢迎参与“适应性自我”研究。\n\n在开始之前,请知悉:本次访谈将由 AI 研究助手进行,而非真人。\n\n本研究旨在了解您对 AI 与职业的个人想法与经历。回答没有对错之分——我们关注的是细节:您的期待、焦虑与真实思考。\n\n您的回答将被匿名化,并用于研究主题分析。您可以拒绝回答任何问题,或随时结束访谈。\n\n继续参与即表示您知悉自己正在与 AI 互动,并同意本次对话被收集用于研究目的。'
};

// Initial question progress state
const initialQuestionProgress: QuestionProgress = {
  questionsAsked: [],
  total: 0,
  currentPhase: 'background',
  isComplete: false
};

// Initial behavior data
const initialBehaviorData: BehaviorData = {
  timePerTopic: {},
  messagesPerTopic: {},
  topicsExplored: [],
  contradictions: []
};

interface ResearchState {
  // Navigation
  currentStep: AppStep;
  previousStep: AppStep | null;
  viewMode: ViewMode;

  // Study Configuration (Researcher-defined)
  studyConfig: StudyConfig | null;

  // Participant Data
  participantProfile: ParticipantProfile | null;
  consentGiven: boolean;
  consentTimestamp: number | null;

  // Interview Progress
  questionProgress: QuestionProgress;
  interviewHistory: InterviewMessage[];

  // Behavior Tracking
  behaviorData: BehaviorData;

  // Synthesis
  synthesis: SynthesisResult | null;

  // Context
  contextEntries: ContextEntry[];
  streamingMessage: string | null;
  isAiThinking: boolean;

  // Participant Token (for URL-based study config)
  participantToken: string | null;

  // Actions - Navigation
  setStep: (step: AppStep) => void;
  setViewMode: (mode: ViewMode) => void;

  // Actions - Study Config
  setStudyConfig: (config: StudyConfig) => void;
  loadExampleStudy: () => void;

  // Actions - Consent & Profile
  giveConsent: () => void;
  initializeProfile: (schema: ProfileField[]) => void;
  updateProfileField: (fieldId: string, value: string | null, status: ProfileFieldStatus) => void;
  setProfileRawContext: (context: string) => void;

  // Actions - Interview Progress
  setInterviewPhase: (phase: InterviewPhase) => void;
  markQuestionAsked: (questionIndex: number) => void;
  completeInterview: () => void;
  addMessage: (message: InterviewMessage) => void;

  // Actions - Context
  appendContext: (text: string, source: 'text' | 'system') => void;
  clearContext: () => void;

  // Actions - AI State
  setStreamingMessage: (msg: string | null) => void;
  setAiThinking: (thinking: boolean) => void;

  // Actions - Synthesis
  setSynthesis: (result: SynthesisResult) => void;

  // Actions - Behavior Data
  setBehaviorData: (data: BehaviorData) => void;

  // Actions - Token
  setParticipantToken: (token: string | null) => void;

  // Actions - Reset
  reset: () => void;
  resetParticipant: () => void;
}

export const useStore = create<ResearchState>()(
  persist(
    (set) => ({
      currentStep: 'setup',
      previousStep: null,
      viewMode: 'researcher',
      studyConfig: null,
      participantProfile: null,
      consentGiven: false,
      consentTimestamp: null,
      questionProgress: initialQuestionProgress,
      interviewHistory: [],
      behaviorData: initialBehaviorData,
      synthesis: null,
      contextEntries: [],
      streamingMessage: null,
      isAiThinking: false,
      participantToken: null,

      setStep: (step) => set((state) => ({
        previousStep: state.currentStep,
        currentStep: step
      })),

      setViewMode: (mode) => set({ viewMode: mode }),

      setStudyConfig: (config) => set({ studyConfig: config }),

      loadExampleStudy: () => set({
        studyConfig: {
          ...EXAMPLE_STUDY,
          id: `study-${Date.now()}`,
          createdAt: Date.now()
        }
      }),

      giveConsent: () => set({
        consentGiven: true,
        consentTimestamp: Date.now()
      }),

      initializeProfile: (schema) => set({
        participantProfile: {
          id: `p-${Date.now()}`,
          fields: schema.map(field => ({
            fieldId: field.id,
            value: null,
            status: 'pending' as ProfileFieldStatus
          })),
          rawContext: '',
          timestamp: Date.now()
        },
        questionProgress: {
          questionsAsked: [],
          total: 0,
          currentPhase: 'background',
          isComplete: false
        }
      }),

      updateProfileField: (fieldId, value, status) => set((state) => {
        if (!state.participantProfile) return state;
        return {
          participantProfile: {
            ...state.participantProfile,
            fields: state.participantProfile.fields.map(f =>
              f.fieldId === fieldId
                ? { ...f, value, status, extractedAt: Date.now() }
                : f
            )
          }
        };
      }),

      setProfileRawContext: (context) => set((state) => {
        if (!state.participantProfile) return state;
        return {
          participantProfile: {
            ...state.participantProfile,
            rawContext: context
          }
        };
      }),

      setInterviewPhase: (phase) => set((state) => ({
        questionProgress: {
          ...state.questionProgress,
          currentPhase: phase
        }
      })),

      markQuestionAsked: (questionIndex) => set((state) => {
        const alreadyAsked = state.questionProgress.questionsAsked.includes(questionIndex);
        if (alreadyAsked) return state;
        return {
          questionProgress: {
            ...state.questionProgress,
            questionsAsked: [...state.questionProgress.questionsAsked, questionIndex]
          }
        };
      }),

      completeInterview: () => set((state) => ({
        questionProgress: {
          ...state.questionProgress,
          currentPhase: 'wrap-up',
          isComplete: true
        }
      })),

      addMessage: (message) => set((state) => {
        const phase = state.questionProgress.currentPhase;
        const currentCount = state.behaviorData.messagesPerTopic[phase] || 0;
        return {
          interviewHistory: [...state.interviewHistory, message],
          behaviorData: {
            ...state.behaviorData,
            messagesPerTopic: {
              ...state.behaviorData.messagesPerTopic,
              [phase]: currentCount + 1
            }
          }
        };
      }),

      appendContext: (text, source) => set((state) => {
        const newEntry: ContextEntry = {
          id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          text: text.trim(),
          source,
          timestamp: Date.now()
        };
        return { contextEntries: [...state.contextEntries, newEntry] };
      }),

      clearContext: () => set({ contextEntries: [] }),

      setStreamingMessage: (msg) => set({ streamingMessage: msg }),
      setAiThinking: (thinking) => set({ isAiThinking: thinking }),

      setSynthesis: (result) => set({ synthesis: result }),

      setBehaviorData: (data) => set({ behaviorData: data }),

      setParticipantToken: (token) => set({ participantToken: token }),

      reset: () => set({
        currentStep: 'setup',
        previousStep: null,
        viewMode: 'researcher',
        studyConfig: null,
        participantProfile: null,
        consentGiven: false,
        consentTimestamp: null,
        questionProgress: initialQuestionProgress,
        interviewHistory: [],
        behaviorData: initialBehaviorData,
        synthesis: null,
        contextEntries: [],
        streamingMessage: null,
        isAiThinking: false,
        participantToken: null
      }),

      resetParticipant: () => set((state) => ({
        participantProfile: null,
        consentGiven: false,
        consentTimestamp: null,
        questionProgress: initialQuestionProgress,
        interviewHistory: [],
        behaviorData: initialBehaviorData,
        synthesis: null,
        contextEntries: [],
        currentStep: state.studyConfig ? 'consent' : 'setup'
      }))
    }),
    {
      name: 'research-tool-storage',
      storage: createJSONStorage(() => sessionStorage),
      version: 3,
      partialize: (state) => ({
        viewMode: state.viewMode,
        studyConfig: state.studyConfig,
        participantProfile: state.participantProfile,
        consentGiven: state.consentGiven,
        consentTimestamp: state.consentTimestamp,
        questionProgress: state.questionProgress,
        interviewHistory: state.interviewHistory,
        behaviorData: state.behaviorData,
        synthesis: state.synthesis,
        contextEntries: state.contextEntries,
        currentStep: state.currentStep,
        participantToken: state.participantToken
      })
    }
  )
);
