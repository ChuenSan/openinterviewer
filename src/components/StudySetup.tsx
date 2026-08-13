'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import { generateParticipantLink } from '@/services/geminiService';
import { StudyConfig, ProfileField, AIBehavior, AIProviderType, LinkExpirationOption, GEMINI_MODELS, CLAUDE_MODELS, DEFAULT_GEMINI_MODEL, DEFAULT_CLAUDE_MODEL, DEFAULT_OPENAI_MODEL } from '@/types';
import {
  FileText,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  Lightbulb,
  User,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  LogIn,
  Save,
  CheckCircle,
  GitBranch,
  Clock,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

// Common profile field presets
const PROFILE_PRESETS: ProfileField[] = [
  { id: 'role', label: '当前职位', extractionHint: '其职位或岗位', required: true },
  { id: 'industry', label: '所属行业', extractionHint: '其所在的行业', required: false },
  { id: 'experience', label: '工作年限', extractionHint: '其所在领域的工作年数', required: false },
  { id: 'team_size', label: '团队规模', extractionHint: '其所在团队的人数', required: false },
  { id: 'location', label: '所在地', extractionHint: '其所在城市或地区', required: false }
];

const StudySetup: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setStudyConfig, setStep, studyConfig, loadExampleStudy, setViewMode, setParticipantToken } = useStore();

  // Follow-up study state
  const [parentStudyInfo, setParentStudyInfo] = useState<{ id: string; name: string } | null>(null);

  const [name, setName] = useState(studyConfig?.name || '');
  const [description, setDescription] = useState(studyConfig?.description || '');
  const [researchQuestion, setResearchQuestion] = useState(studyConfig?.researchQuestion || '');
  const [coreQuestions, setCoreQuestions] = useState<string[]>(
    studyConfig?.coreQuestions || ['']
  );
  const [topicAreas, setTopicAreas] = useState<string[]>(
    studyConfig?.topicAreas || ['']
  );
  const [profileSchema, setProfileSchema] = useState<ProfileField[]>(
    studyConfig?.profileSchema || []
  );
  const [aiBehavior, setAiBehavior] = useState<AIBehavior>(
    studyConfig?.aiBehavior || 'standard'
  );
  const [aiProvider, setAiProvider] = useState<AIProviderType>(
    studyConfig?.aiProvider || 'gemini'
  );
  const [aiModel, setAiModel] = useState<string>(
    studyConfig?.aiModel || (studyConfig?.aiProvider === 'claude' ? DEFAULT_CLAUDE_MODEL : studyConfig?.aiProvider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL)
  );
  const [enableReasoning, setEnableReasoning] = useState<boolean | undefined>(
    studyConfig?.enableReasoning
  );
  const [linkExpiration, setLinkExpiration] = useState<LinkExpirationOption>(
    studyConfig?.linkExpiration || 'never'
  );
  const [consentText, setConsentText] = useState(
    studyConfig?.consentText ||
    '感谢您参与本次研究。您的回答将用于了解[研究主题]。您可随时停止参与。您是否同意参与？'
  );

  // Participant link generation
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 预览 state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Study save state
  const [savedStudyId, setSavedStudyId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Config status (API keys)
  const [configStatus, setConfigStatus] = useState<{
    hasAnthropicKey: boolean;
    hasGeminiKey: boolean;
    hasOpenAIKey: boolean;
  } | null>(null);

  // Sync savedStudyId with persisted config
  // Server-assigned IDs are UUIDs, client-side IDs start with "study-"
  useEffect(() => {
    if (studyConfig?.id && !studyConfig.id.startsWith('study-')) {
      // Server UUID - this is a saved study
      setSavedStudyId(studyConfig.id);
    } else {
      // No config or client-generated ID - clear to prevent overwriting other studies
      setSavedStudyId(null);
    }
  }, [studyConfig?.id]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth', { method: 'GET' });
        setIsAuthenticated(res.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch config status when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const fetchConfigStatus = async () => {
        try {
          const res = await fetch('/api/config/status');
          if (res.ok) {
            const data = await res.json();
            setConfigStatus(data);
          }
        } catch {
          // Silently fail - warnings just won't show
        }
      };
      fetchConfigStatus();
    }
  }, [isAuthenticated]);

  // Check for follow-up or edit prefill on mount
  useEffect(() => {
    const prefillType = searchParams.get('prefill');
    if (prefillType === 'followup' || prefillType === 'edit') {
      const prefillData = sessionStorage.getItem('prefillStudyConfig');
      if (prefillData) {
        try {
          const config = JSON.parse(prefillData) as Partial<StudyConfig>;
          // Populate form fields
          if (config.name) setName(config.name);
          if (config.description) setDescription(config.description);
          if (config.researchQuestion) setResearchQuestion(config.researchQuestion);
          if (config.coreQuestions?.length) setCoreQuestions(config.coreQuestions);
          if (config.topicAreas?.length) setTopicAreas(config.topicAreas);
          if (config.profileSchema?.length) setProfileSchema(config.profileSchema);
          if (config.aiBehavior) setAiBehavior(config.aiBehavior);
          if (config.aiProvider) setAiProvider(config.aiProvider);
          if (config.aiModel) setAiModel(config.aiModel);
          if (config.enableReasoning !== undefined) setEnableReasoning(config.enableReasoning);
          if (config.linkExpiration) setLinkExpiration(config.linkExpiration);
          if (config.consentText) setConsentText(config.consentText);

          // Store parent study info for display and saving (followup only)
          if (prefillType === 'followup' && config.parentStudyId && config.parentStudyName) {
            setParentStudyInfo({
              id: config.parentStudyId,
              name: config.parentStudyName
            });
          }

          // For edit mode, set the study ID so saves become updates
          if (prefillType === 'edit') {
            const studyId = searchParams.get('studyId');
            if (studyId) {
              setSavedStudyId(studyId);
              setIsDirty(false); // Not dirty initially - matches saved state
            }
          } else {
            // Mark as dirty since we loaded prefill data that needs saving
            setIsDirty(true);
          }

          // Clear sessionStorage after loading
          sessionStorage.removeItem('prefillStudyConfig');
        } catch (error) {
          console.error('Error parsing prefill config:', error);
        }
      }
    }
  }, [searchParams]);

  // Sync form with studyConfig when it changes (e.g., after loading example)
  useEffect(() => {
    if (studyConfig) {
      setName(studyConfig.name);
      setDescription(studyConfig.description);
      setResearchQuestion(studyConfig.researchQuestion);
      setCoreQuestions(studyConfig.coreQuestions.length > 0 ? studyConfig.coreQuestions : ['']);
      setTopicAreas(studyConfig.topicAreas.length > 0 ? studyConfig.topicAreas : ['']);
      setProfileSchema(studyConfig.profileSchema || []);
      setAiBehavior(studyConfig.aiBehavior);
      setAiProvider(studyConfig.aiProvider || 'gemini');
      setAiModel(studyConfig.aiModel || (studyConfig.aiProvider === 'claude' ? DEFAULT_CLAUDE_MODEL : studyConfig.aiProvider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL));
      setEnableReasoning(studyConfig.enableReasoning);
      setLinkExpiration(studyConfig.linkExpiration || 'never');
      setConsentText(studyConfig.consentText);
    }
  }, [studyConfig]);

  // Question management
  const addQuestion = () => { setCoreQuestions([...coreQuestions, '']); setIsDirty(true); };
  const removeQuestion = (index: number) => {
    if (coreQuestions.length > 1) {
      setCoreQuestions(coreQuestions.filter((_, i) => i !== index));
      setIsDirty(true);
    }
  };
  const updateQuestion = (index: number, value: string) => {
    const updated = [...coreQuestions];
    updated[index] = value;
    setCoreQuestions(updated);
    setIsDirty(true);
  };

  // Topic management
  const addTopic = () => { setTopicAreas([...topicAreas, '']); setIsDirty(true); };
  const removeTopic = (index: number) => {
    if (topicAreas.length > 1) {
      setTopicAreas(topicAreas.filter((_, i) => i !== index));
      setIsDirty(true);
    }
  };
  const updateTopic = (index: number, value: string) => {
    const updated = [...topicAreas];
    updated[index] = value;
    setTopicAreas(updated);
    setIsDirty(true);
  };

  // Profile field management
  const addProfileField = (preset?: ProfileField) => {
    if (preset) {
      if (!profileSchema.some(f => f.id === preset.id)) {
        setProfileSchema([...profileSchema, preset]);
        setIsDirty(true);
      }
    } else {
      const newField: ProfileField = {
        id: `field-${Date.now()}`,
        label: '',
        extractionHint: '',
        required: false
      };
      setProfileSchema([...profileSchema, newField]);
      setIsDirty(true);
    }
  };

  const removeProfileField = (id: string) => {
    setProfileSchema(profileSchema.filter(f => f.id !== id));
    setIsDirty(true);
  };

  const updateProfileField = (id: string, updates: Partial<ProfileField>) => {
    setProfileSchema(profileSchema.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
    setIsDirty(true);
  };

  const toggleFieldRequired = (id: string) => {
    setProfileSchema(profileSchema.map(f =>
      f.id === id ? { ...f, required: !f.required } : f
    ));
    setIsDirty(true);
  };

  const buildConfig = (): StudyConfig => {
    const normalizedAiModel = aiProvider === 'openai' ? aiModel.trim() : aiModel;

    return {
      id: studyConfig?.id || `study-${Date.now()}`,
      name: name || '未命名研究',
      description,
      researchQuestion,
      coreQuestions: coreQuestions.filter(q => q.trim()),
      topicAreas: topicAreas.filter(t => t.trim()),
      profileSchema: profileSchema.filter(f => f.label.trim()),
      aiBehavior,
      aiProvider,
      aiModel: normalizedAiModel,
      enableReasoning,
      linkExpiration,
      linksEnabled: true,
      consentText,
      createdAt: studyConfig?.createdAt || Date.now(),
      ...(parentStudyInfo && {
        parentStudyId: parentStudyInfo.id,
        parentStudyName: parentStudyInfo.name,
        generatedFrom: 'synthesis' as const
      })
    };
  };

  const handleSubmit = () => {
    const config = buildConfig();
    setStudyConfig(config);
    setStep('consent');
    router.push('/consent');
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    const config = buildConfig();
    setStudyConfig(config);

    // Generate a temporary preview token for API authentication
    try {
      const { token } = await generateParticipantLink(config);
      setParticipantToken(token);
    } catch (error) {
      // If token generation fails (e.g., not logged in), proceed anyway
      // The admin session cookie will be used as fallback for authenticated researchers
      console.warn('Could not generate preview token, using session auth:', error);
    }

    setIsPreviewLoading(false);
    setViewMode('participant');
    setStep('consent');
    router.push('/consent');
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const config = buildConfig();
      setStudyConfig(config);

      const response = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyConfig: config })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setLinkError('auth');
          setIsAuthenticated(false);
        } else {
          const data = await response.json();
          setLinkError(data.error || '生成链接失败');
        }
        return;
      }

      const data = await response.json();
      setParticipantLink(data.url);
    } catch (error) {
      console.error('Error generating link:', error);
      setLinkError('网络错误，请重试。');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (participantLink) {
      navigator.clipboard.writeText(participantLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleSaveStudy = async () => {
    // Fix auth race condition: check for explicit false, not falsy
    if (isAuthenticated === false) {
      router.push('/login');
      return;
    }
    if (isAuthenticated === null) {
      return; // Auth check in progress - button should be disabled anyway
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const config = buildConfig();
      const isUpdate = !!savedStudyId;

      // For updates, the API may return 409 if study has interviews
      const response = await fetch(
        isUpdate ? `/api/studies/${savedStudyId}` : '/api/studies',
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          router.push('/login');
          return;
        }

        // Handle storage not configured (503)
        if (response.status === 503) {
          setSaveError('尚未配置存储。请在部署设置中连接 Vercel KV（Upstash Redis）。');
          return;
        }

        // Handle confirmation required (409) - study has interviews
        if (response.status === 409) {
          const data = await response.json();
          if (data.requiresConfirmation) {
            const confirmed = window.confirm(
              `${data.warning}\n\n是否继续？`
            );
            if (confirmed) {
              // Retry with confirmed: true
              const retryResponse = await fetch(`/api/studies/${savedStudyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, confirmed: true })
              });
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setSavedStudyId(retryData.study.id);
                setStudyConfig(retryData.study.config);
                setSaveSuccess(true);
                setIsDirty(false);
                // Navigate to study detail page after confirmed save
                router.push(`/studies/${retryData.study.id}`);
              }
            }
            return;
          }
        }

        // Generic error
        const data = await response.json().catch(() => ({}));
        setSaveError(data.error || '保存研究失败，请重试。');
        return;
      }

      const data = await response.json();
      setSavedStudyId(data.study.id);
      setSaveSuccess(true);
      setStudyConfig(data.study.config);
      setIsDirty(false);

      // Navigate to study detail page after successful save
      router.push(`/studies/${data.study.id}`);
    } catch (error) {
      console.error('Error saving study:', error);
      setSaveError('网络错误，请检查网络连接后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = Boolean(
    name.trim() &&
    researchQuestion.trim() &&
    (aiProvider !== 'openai' || aiModel.trim())
  );

  const behaviorOptions: { id: AIBehavior; label: string; desc: string }[] = [
    {
      id: 'structured',
      label: '覆盖所有问题（结构化）',
      desc: '优先完成访谈，减少追问，并将跑题内容拉回主题。'
    },
    {
      id: 'standard',
      label: '兼顾覆盖与深度（标准）',
      desc: '默认模式：追问关键洞察后继续下一个问题。'
    },
    {
      id: 'exploratory',
      label: '发掘新洞察（探索式）',
      desc: '优先深入探究，跟进有价值的线索和情绪。'
    }
  ];

  const providerOptions: { id: AIProviderType; label: string; desc: string }[] = [
    {
      id: 'gemini',
      label: 'Google Gemini',
      desc: '速度快、成本低，适合高频研究。'
    },
    {
      id: 'claude',
      label: 'Anthropic Claude',
      desc: '推理细腻，适合复杂的探索式访谈。'
    },
    {
      id: 'openai',
      label: 'OpenAI（Chat API）',
      desc: '兼容性广，可配合任何兼容 OpenAI Chat API 的端点使用。'
    }
  ];

  const availablePresets = PROFILE_PRESETS.filter(
    preset => !profileSchema.some(f => f.id === preset.id)
  );

  return (
    <div className="min-h-screen bg-stone-900 p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push('/studies')}
              className="p-2 text-stone-400 hover:text-stone-300 rounded-lg hover:bg-stone-800 transition-colors"
              title="返回全部研究"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center">
              <FileText className="text-stone-300" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-white">研究设置</h1>

            <div className="flex gap-2 ml-auto">
              <button
                onClick={loadExampleStudy}
                className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl transition-colors flex items-center gap-2"
              >
                <Lightbulb size={16} />
                加载示例
              </button>
              {isValid && (
                <>
                  <button
                    onClick={handleSaveStudy}
                    disabled={!isAuthenticated || isSaving || (!!savedStudyId && !isDirty)}
                    className={`px-4 py-2 text-sm rounded-xl transition-colors flex items-center gap-2 disabled:cursor-not-allowed ${
                      savedStudyId && !isDirty
                        ? 'bg-green-900/50 text-green-400 border border-green-700'
                        : saveSuccess
                        ? 'bg-green-700 text-white'
                        : 'bg-stone-700 hover:bg-stone-600 text-stone-300'
                    } ${isSaving || isAuthenticated === null ? 'opacity-50' : ''}`}
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : savedStudyId && !isDirty ? (
                      <CheckCircle size={16} />
                    ) : saveSuccess ? (
                      <Check size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {isSaving ? '保存中...' : savedStudyId && isDirty ? '更新研究' : savedStudyId ? '已保存' : saveSuccess ? '已保存！' : '保存研究'}
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                    className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreviewLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Eye size={16} />
                    )}
                    {isPreviewLoading ? '加载中...' : '预览'}
                  </button>
                </>
              )}
            </div>
          </div>
          <p className="text-stone-400 ml-[52px]">
            配置您的研究访谈
          </p>
        </motion.div>

        {/* Save Error Banner */}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 flex items-start gap-3"
          >
            <div className="text-red-400 flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-red-300 mb-1">保存失败</h4>
              <p className="text-sm text-red-400/80">{saveError}</p>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-400 hover:text-red-300 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-stone-800/50 rounded-2xl border border-stone-700 p-8 space-y-8"
        >
          {/* 后续研究 Banner */}
          {parentStudyInfo && (
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 flex items-start gap-3">
              <GitBranch size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white">后续研究</h4>
                <p className="text-sm text-stone-400">
                  基于以下研究的发现：{' '}
                  <button
                    onClick={() => router.push(`/studies/${parentStudyInfo.id}`)}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {parentStudyInfo.name}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-stone-100 flex items-center gap-2">
              <Sparkles size={18} className="text-stone-400" />
              研究详情
            </h2>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                研究名称 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                placeholder="例如：医疗健康领域的 AI 应用"
                className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                研究问题 *
              </label>
              <textarea
                value={researchQuestion}
                onChange={(e) => { setResearchQuestion(e.target.value); setIsDirty(true); }}
                placeholder="您希望了解什么？"
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">
                描述（可选）
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                placeholder="简要说明研究背景..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none"
              />
            </div>
          </div>

          {/* 参与者画像 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-stone-100 flex items-center gap-2">
                <User size={18} className="text-stone-400" />
                参与者画像
              </h2>
              <button
                onClick={() => addProfileField()}
                className="text-sm text-stone-400 hover:text-stone-300 flex items-center gap-1"
              >
                <Plus size={16} /> 添加自定义字段
              </button>
            </div>
            <p className="text-sm text-stone-400">
              访谈中需要收集的参与者信息
            </p>

            {availablePresets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-stone-500">快速添加：</span>
                {availablePresets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => addProfileField(preset)}
                    className="px-3 py-1 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-full transition-colors"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {profileSchema.map((field) => (
                <div
                  key={field.id}
                  className="bg-stone-800 rounded-xl p-4 border border-stone-700"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateProfileField(field.id, { label: e.target.value })}
                        placeholder="字段标签（例如：当前职位）"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 text-sm"
                      />
                      <input
                        type="text"
                        value={field.extractionHint}
                        onChange={(e) => updateProfileField(field.id, { extractionHint: e.target.value })}
                        placeholder="给 AI 的提取提示（例如：其职位或岗位）"
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFieldRequired(field.id)}
                        className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                          field.required
                            ? 'bg-stone-600 text-stone-200'
                            : 'bg-stone-700 text-stone-400'
                        }`}
                        title={field.required ? '必填字段' : '可选字段'}
                      >
                        {field.required ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {field.required ? '必填' : '可选'}
                      </button>
                      <button
                        onClick={() => removeProfileField(field.id)}
                        className="p-1.5 text-stone-500 hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {profileSchema.length === 0 && (
                <div className="text-center py-4 text-stone-500 text-sm">
                  暂未添加参与者画像字段。请在上方添加以收集参与者信息。
                </div>
              )}
            </div>
          </div>

          {/* 核心问题 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-stone-100">
                核心问题
              </h2>
              <button
                onClick={addQuestion}
                className="text-sm text-stone-400 hover:text-stone-300 flex items-center gap-1"
              >
                <Plus size={16} /> 添加问题
              </button>
            </div>
            <p className="text-sm text-stone-400">
              访谈中必须提出的问题
            </p>
            <div className="space-y-2">
              {coreQuestions.map((q, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-stone-500 text-sm pt-3 w-6 text-right">{i + 1}.</span>
                  <textarea
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={`问题 ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none"
                  />
                  {coreQuestions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(i)}
                      className="p-2.5 text-stone-500 hover:text-red-400 mt-1"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 主题领域 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg text-stone-100">
                主题领域
              </h2>
              <button
                onClick={addTopic}
                className="text-sm text-stone-400 hover:text-stone-300 flex items-center gap-1"
              >
                <Plus size={16} /> 添加主题
              </button>
            </div>
            <p className="text-sm text-stone-400">
              AI 应深入探讨的主题（例如：担忧、动机、权衡）
            </p>
            <div className="space-y-2">
              {topicAreas.map((t, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-stone-500 text-sm pt-3 w-6 text-right">{i + 1}.</span>
                  <textarea
                    value={t}
                    onChange={(e) => updateTopic(i, e.target.value)}
                    placeholder={`主题领域 ${i + 1}...`}
                    rows={2}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none"
                  />
                  {topicAreas.length > 1 && (
                    <button
                      onClick={() => removeTopic(i)}
                      className="p-2.5 text-stone-500 hover:text-red-400 mt-1"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI 服务商 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-stone-100">AI 服务商</h2>
            <p className="text-sm text-stone-400">
              选择驱动访谈的 AI 模型
            </p>
            <div className="space-y-2">
              {providerOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    aiProvider === option.id
                      ? 'border-stone-500 bg-stone-700'
                      : 'border-stone-700 hover:border-stone-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="aiProvider"
                    checked={aiProvider === option.id}
                    onChange={() => {
                      setAiProvider(option.id);
                      // Reset model to provider's default when switching providers
                      setAiModel(option.id === 'claude' ? DEFAULT_CLAUDE_MODEL : option.id === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL);
                      setIsDirty(true);
                    }}
                    className="mt-1 accent-stone-500"
                  />
                  <div>
                    <div className="font-medium text-stone-100">{option.label}</div>
                    <div className="text-xs text-stone-400">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Model Selection */}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-stone-300">
                模型
              </label>
              {aiProvider === 'openai' ? (
                <>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => { setAiModel(e.target.value); setIsDirty(true); }}
                    placeholder="例如：gpt-4o-mini"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  />
                  <p className="text-xs text-stone-500">
                    输入 OpenAI Chat Completions API 支持的模型 ID。兼容端点由部署环境中的 OPENAI_BASE_URL 配置。
                  </p>
                </>
              ) : (
                <>
                  <select
                    value={aiModel}
                    onChange={(e) => { setAiModel(e.target.value); setIsDirty(true); }}
                    className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  >
                    {(aiProvider === 'gemini' ? GEMINI_MODELS : CLAUDE_MODELS).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-stone-500">
                    {(aiProvider === 'gemini' ? GEMINI_MODELS : CLAUDE_MODELS).find(m => m.id === aiModel)?.desc || ''}
                  </p>
                </>
              )}
            </div>

            {/* AI 推理模式 */}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-stone-300">
                AI 推理模式
              </label>
              <select
                value={enableReasoning === undefined ? 'auto' : enableReasoning ? 'on' : 'off'}
                onChange={(e) => {
                  const v = e.target.value;
                  setEnableReasoning(v === 'auto' ? undefined : v === 'on');
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
              >
                <option value="auto">自动（推荐）</option>
                <option value="on">始终启用</option>
                <option value="off">始终禁用</option>
              </select>
              <p className="text-xs text-stone-500">
                自动：访谈时关闭（响应更快），综合分析时开启（使用已配置的综合模型进行更深入分析，可能增加 API 成本）。
              </p>
            </div>

            {/* Warning: Claude selected but no API key */}
            {aiProvider === 'claude' && configStatus && !configStatus.hasAnthropicKey && (
              <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-200 text-sm">缺少 Anthropic API 密钥</h4>
                  <p className="text-xs text-stone-400 mt-1">
                    Claude 访谈需要环境变量 <code className="text-stone-300">ANTHROPIC_API_KEY</code>。
                    请在 Vercel 控制台的“项目设置 → 环境变量”中配置。
                  </p>
                  <a
                    href="https://github.com/your-repo/research-tool-v2#configuring-api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-2"
                  >
                    查看配置指南 <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* AI Behavior */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-stone-100">AI 访谈风格</h2>
            <div className="space-y-2">
              {behaviorOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    aiBehavior === option.id
                      ? 'border-stone-500 bg-stone-700'
                      : 'border-stone-700 hover:border-stone-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="aiBehavior"
                    checked={aiBehavior === option.id}
                    onChange={() => { setAiBehavior(option.id); setIsDirty(true); }}
                    className="mt-1 accent-stone-500"
                  />
                  <div>
                    <div className="font-medium text-stone-100">{option.label}</div>
                    <div className="text-xs text-stone-400">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 链接设置 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-stone-100 flex items-center gap-2">
              <Clock size={18} className="text-stone-400" />
              链接设置
            </h2>
            <p className="text-sm text-stone-400">
              设置参与者链接的过期时间。您也可以在研究详情页撤销链接。
            </p>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-stone-300">链接有效期</span>
                <select
                  value={linkExpiration}
                  onChange={(e) => { setLinkExpiration(e.target.value as LinkExpirationOption); setIsDirty(true); }}
                  className="mt-1 w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                >
                  <option value="never">永不过期</option>
                  <option value="7days">7 天后过期</option>
                  <option value="30days">30 天后过期</option>
                  <option value="90days">90 天后过期</option>
                </select>
              </label>
              <p className="text-xs text-stone-500">
                参与者访问已过期链接时将看到错误提示。
              </p>
            </div>
          </div>

          {/* 知情同意 */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg text-stone-100">知情同意</h2>
            <textarea
              value={consentText}
              onChange={(e) => { setConsentText(e.target.value); setIsDirty(true); }}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500 resize-none text-sm"
            />
          </div>

          {/* 生成参与者链接 */}
          {isValid && (
            <div className="space-y-4 pt-4 border-t border-stone-700">
              <h2 className="font-semibold text-lg text-stone-100 flex items-center gap-2">
                <LinkIcon size={18} className="text-stone-400" />
                参与者链接
              </h2>

              {participantLink ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={participantLink}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-300 text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-3 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl transition-colors flex items-center gap-2"
                    >
                      {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                      {linkCopied ? '已复制！' : '复制'}
                    </button>
                  </div>
                  <p className="text-xs text-stone-500">
                    将此链接分享给参与者。研究配置已嵌入链接中。
                  </p>
                </div>
              ) : isAuthenticated === false || linkError === 'auth' ? (
                <div className="space-y-3">
                  <div className="bg-stone-800 border border-stone-600 rounded-xl p-4 text-sm text-stone-300">
                    <p className="mb-3">需要登录后才能生成参与者链接。</p>
                    <button
                      type="button"
                      onClick={() => router.push('/login')}
                      className="px-4 py-2 bg-stone-600 hover:bg-stone-500 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <LogIn size={16} />
                      以研究者身份登录
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    disabled={isGeneratingLink}
                    className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-stone-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon size={18} />
                    {isGeneratingLink ? '生成中...' : '生成参与者链接'}
                  </button>
                  {linkError && linkError !== 'auth' && (
                    <p className="text-sm text-red-400">{linkError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-stone-700">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full py-4 bg-stone-600 hover:bg-stone-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              开始访谈 <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudySetup;
