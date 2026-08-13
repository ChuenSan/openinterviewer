'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Database, Key, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, AlertCircle, ExternalLink, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

type Step = 'welcome' | 'ai-keys' | 'redis' | 'done';
const STEPS: Step[] = ['welcome', 'ai-keys', 'redis', 'done'];

interface ValidationState {
  loading: boolean;
  valid: boolean | null;
  error: string | null;
}

const Onboarding: React.FC = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<{ name?: string } | null>(null);

  // AI keys state
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiValidation, setGeminiValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });
  const [anthropicValidation, setAnthropicValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });
  const [openaiKey, setOpenAIKey] = useState('');
  const [openaiValidation, setOpenAIValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });

  // Redis state
  const [redisUrl, setRedisUrl] = useState('');
  const [redisToken, setRedisToken] = useState('');
  const [redisValidation, setRedisValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });

  const [saving, setSaving] = useState(false);

  // Expandable guide state
  const [geminiGuideOpen, setGeminiGuideOpen] = useState(false);
  const [claudeGuideOpen, setClaudeGuideOpen] = useState(false);
  const [openaiGuideOpen, setOpenAIGuideOpen] = useState(false);
  const [redisGuideOpen, setRedisGuideOpen] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
      })
      .catch(() => {});
  }, []);

  const step = STEPS[currentStep];

  const validateAiKey = async (provider: 'gemini' | 'claude' | 'openai', apiKey: string) => {
    const setValidation = provider === 'gemini' ? setGeminiValidation : provider === 'claude' ? setAnthropicValidation : setOpenAIValidation;
    setValidation({ loading: true, valid: null, error: null });

    try {
      const res = await fetch('/api/onboarding/validate-ai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      setValidation({ loading: false, valid: data.valid, error: data.error || null });
    } catch {
      setValidation({ loading: false, valid: false, error: '验证失败' });
    }
  };

  const validateRedis = async () => {
    setRedisValidation({ loading: true, valid: null, error: null });

    try {
      const res = await fetch('/api/onboarding/validate-redis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redisUrl, redisToken }),
      });
      const data = await res.json();
      setRedisValidation({ loading: false, valid: data.valid, error: data.error || null });
    } catch {
      setRedisValidation({ loading: false, valid: false, error: '验证失败' });
    }
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const saveAndComplete = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Save credentials
      const saveRes = await fetch('/api/onboarding/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redisUrl: redisUrl || undefined,
          redisToken: redisToken || undefined,
          geminiApiKey: geminiKey || undefined,
          anthropicApiKey: anthropicKey || undefined,
          openaiApiKey: openaiKey || undefined,
        }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json().catch(() => ({}));
        setSaveError(data.error || '保存凭据失败，请重试。');
        setSaving(false);
        return;
      }

      // Mark onboarding complete
      const completeRes = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!completeRes.ok) {
        setSaveError('完成引导失败，请重试。');
        setSaving(false);
        return;
      }

      router.push('/studies');
    } catch {
      setSaveError('连接出错，请重试。');
      setSaving(false);
    }
  };

  const canProceedFromAiKeys = geminiValidation.valid || anthropicValidation.valid || openaiValidation.valid;
  const canProceedFromRedis = redisValidation.valid;

  const ValidationBadge: React.FC<{ state: ValidationState }> = ({ state }) => {
    if (state.loading) return <Loader2 size={16} className="animate-spin text-stone-400" />;
    if (state.valid === true) return <CheckCircle size={16} className="text-green-400" />;
    if (state.valid === false) return <AlertCircle size={16} className="text-red-400" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full"
      >
        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-stone-400' : 'bg-stone-700'
              }`}
            />
          ))}
        </div>

        <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-8">
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-full bg-stone-700 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={28} className="text-stone-300" />
                  </div>
                  <h1 className="text-2xl font-bold text-white">
                    {profile?.name ? `欢迎，${profile.name.split(' ')[0]}！` : '欢迎！'}
                  </h1>
                  <p className="text-stone-400 mt-3 leading-relaxed">
                    我们来完成初始配置。OpenInterviewer 采用 <strong className="text-stone-300">自带存储</strong> 模式——
                    数据保存在你自己的基础设施中，研究数据完全由你掌控。
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 bg-stone-800 rounded-lg">
                    <Key size={18} className="text-stone-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-stone-200 text-sm font-medium">AI API 密钥</p>
                      <p className="text-stone-400 text-xs">用于 AI 访谈的 Gemini 或 Claude 密钥</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-stone-800 rounded-lg">
                    <Database size={18} className="text-stone-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-stone-200 text-sm font-medium">Upstash Redis</p>
                      <p className="text-stone-400 text-xs">用于存储研究和访谈的免费套餐数据库</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'ai-keys' && (
              <motion.div key="ai-keys" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-white mb-1">AI API 密钥</h2>
                <p className="text-stone-400 text-sm mb-6">
                  至少添加一个 AI 服务商密钥。也可以同时添加多个，方便切换。
                </p>

                <div className="space-y-5">
                  {/* Gemini */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-stone-300">Google Gemini API Key</label>
                      <ValidationBadge state={geminiValidation} />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => { setGeminiKey(e.target.value); setGeminiValidation({ loading: false, valid: null, error: null }); }}
                        placeholder="AIza..."
                        className="flex-1 px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                      <button
                        onClick={() => validateAiKey('gemini', geminiKey)}
                        disabled={!geminiKey || geminiValidation.loading}
                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm rounded-lg transition-colors"
                      >
                        测试
                      </button>
                    </div>
                    {geminiValidation.error && <p className="text-red-400 text-xs mt-1">{geminiValidation.error}</p>}

                    {/* Expandable setup guide */}
                    <div className="mt-2">
                      <button
                        onClick={() => setGeminiGuideOpen(!geminiGuideOpen)}
                        className="text-xs text-stone-500 hover:text-stone-400 inline-flex items-center gap-1"
                      >
                        {geminiGuideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        如何获取 Gemini API 密钥
                      </button>

                      {geminiGuideOpen && (
                        <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                          <ol className="list-decimal list-inside space-y-1 text-stone-300">
                            <li>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">aistudio.google.com/apikey</a></li>
                            <li>使用任意 Google 账号登录</li>
                            <li>点击「Create API key」（会自动创建 Google Cloud 项目）</li>
                            <li>复制密钥（以 AIza 开头）</li>
                          </ol>
                          <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                            <span>•</span>
                            <span>无需信用卡</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-stone-400">
                            <span>•</span>
                            <span>免费额度：Gemini 2.5 Flash 每分钟 10 次，每天 250 次</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claude */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-stone-300">Anthropic Claude API Key</label>
                      <ValidationBadge state={anthropicValidation} />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => { setAnthropicKey(e.target.value); setAnthropicValidation({ loading: false, valid: null, error: null }); }}
                        placeholder="sk-ant-..."
                        className="flex-1 px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                      <button
                        onClick={() => validateAiKey('claude', anthropicKey)}
                        disabled={!anthropicKey || anthropicValidation.loading}
                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm rounded-lg transition-colors"
                      >
                        测试
                      </button>
                    </div>
                    {anthropicValidation.error && <p className="text-red-400 text-xs mt-1">{anthropicValidation.error}</p>}

                    {/* Expandable setup guide */}
                    <div className="mt-2">
                      <button
                        onClick={() => setClaudeGuideOpen(!claudeGuideOpen)}
                        className="text-xs text-stone-500 hover:text-stone-400 inline-flex items-center gap-1"
                      >
                        {claudeGuideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        如何获取 Claude API 密钥
                      </button>

                      {claudeGuideOpen && (
                        <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                          <ol className="list-decimal list-inside space-y-1 text-stone-300">
                            <li>前往 <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">console.anthropic.com</a></li>
                            <li>使用邮箱或 Google 账号注册</li>
                            <li>领取 5 美元免费额度（需手机验证，仅限美国号码）</li>
                            <li>进入 API Keys → Create API Key → 复制密钥（以 sk-ant- 开头）</li>
                          </ol>
                          <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                            <span>•</span>
                            <span>5 美元免费额度约可完成 15-100 场 Haiku 访谈</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-amber-400">
                            <span>•</span>
                            <span>免费额度用完后需绑定信用卡</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OpenAI */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-stone-300">OpenAI API Key</label>
                      <ValidationBadge state={openaiValidation} />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => { setOpenAIKey(e.target.value); setOpenAIValidation({ loading: false, valid: null, error: null }); }}
                        placeholder="sk-proj-..."
                        className="flex-1 px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                      />
                      <button
                        onClick={() => validateAiKey('openai', openaiKey)}
                        disabled={!openaiKey || openaiValidation.loading}
                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm rounded-lg transition-colors"
                      >
                        测试
                      </button>
                    </div>
                    {openaiValidation.error && <p className="text-red-400 text-xs mt-1">{openaiValidation.error}</p>}

                    {/* Expandable setup guide */}
                    <div className="mt-2">
                      <button
                        onClick={() => setOpenAIGuideOpen(!openaiGuideOpen)}
                        className="text-xs text-stone-500 hover:text-stone-400 inline-flex items-center gap-1"
                      >
                        {openaiGuideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        如何获取 OpenAI API 密钥
                      </button>

                      {openaiGuideOpen && (
                        <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                          <ol className="list-decimal list-inside space-y-1 text-stone-300">
                            <li>前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">platform.openai.com/api-keys</a></li>
                            <li>使用 OpenAI 账号注册或登录</li>
                            <li>点击「Create new secret key」</li>
                            <li>复制密钥（以 sk-proj- 开头）</li>
                          </ol>
                          <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                            <span>•</span>
                            <span>新账号可获 5 美元免费额度（3 个月后过期）</span>
                          </div>
                          <div className="flex items-start gap-1.5 text-amber-400">
                            <span>•</span>
                            <span>免费额度用完后需绑定信用卡或预付费账单</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'redis' && (
              <motion.div key="redis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-white mb-1">Upstash Redis</h2>
                <p className="text-stone-400 text-sm mb-6">
                  你的研究和访谈数据将存储在自己的 Upstash Redis 数据库中。
                  免费套餐足够起步使用。
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-stone-300">REST API URL</label>
                    </div>
                    <input
                      type="text"
                      value={redisUrl}
                      onChange={(e) => { setRedisUrl(e.target.value); setRedisValidation({ loading: false, valid: null, error: null }); }}
                      placeholder="https://your-db.upstash.io"
                      className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-300 mb-1 block">REST API Token</label>
                    <input
                      type="password"
                      value={redisToken}
                      onChange={(e) => { setRedisToken(e.target.value); setRedisValidation({ loading: false, valid: null, error: null }); }}
                      placeholder="AXxx..."
                      className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ValidationBadge state={redisValidation} />
                      {redisValidation.valid && <span className="text-green-400 text-sm">已连接</span>}
                      {redisValidation.error && <span className="text-red-400 text-sm">{redisValidation.error}</span>}
                    </div>
                    <button
                      onClick={validateRedis}
                      disabled={!redisUrl || !redisToken || redisValidation.loading}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-300 text-sm rounded-lg transition-colors"
                    >
                      {redisValidation.loading ? '测试中...' : '测试连接'}
                    </button>
                  </div>

                  {/* Expandable setup guide */}
                  <div>
                    <button
                      onClick={() => setRedisGuideOpen(!redisGuideOpen)}
                      className="text-xs text-stone-500 hover:text-stone-400 inline-flex items-center gap-1"
                    >
                      {redisGuideOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      如何配置 Upstash Redis
                    </button>

                    {redisGuideOpen && (
                      <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                        <ol className="list-decimal list-inside space-y-1 text-stone-300">
                          <li>前往 <a href="https://console.upstash.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">console.upstash.com</a>，使用 Google / GitHub 注册</li>
                          <li>点击「+ Create Database」</li>
                          <li>选择 Regional（推荐），并选择最近的区域</li>
                          <li>选择 Free 套餐（256 MB，每月 50 万次命令）</li>
                          <li>创建完成后，进入数据库详情 → REST API 部分</li>
                          <li>复制 REST URL（https://*.upstash.io）和 REST Token</li>
                        </ol>
                        <div className="flex items-start gap-1.5 text-amber-400 mt-2">
                          <span>⚠</span>
                          <span>请使用 REST URL（https://），不要使用普通 Redis URL（redis://）</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-stone-400">
                          <span>•</span>
                          <span>免费套餐：1 个数据库，256 MB，每月 50 万次命令</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={28} className="text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">一切就绪！</h2>
                  <p className="text-stone-400 text-sm mb-6">
                    你的凭据已加密保存。
                    现在可以创建第一项研究了。
                  </p>

                  <div className="space-y-2 mb-6 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-stone-300">
                        AI：{geminiValidation.valid && anthropicValidation.valid ? 'Gemini + Claude' : geminiValidation.valid ? 'Gemini' : openaiValidation.valid ? 'OpenAI' : 'Claude'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="text-stone-300">存储：Upstash Redis 已连接</span>
                    </div>
                  </div>

                  {saveError && (
                    <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      <AlertCircle size={16} className="flex-shrink-0" />
                      {saveError}
                    </div>
                  )}

                  <button
                    onClick={saveAndComplete}
                    disabled={saving}
                    className="w-full py-3 bg-stone-600 hover:bg-stone-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        创建第一项研究
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          {step !== 'done' && (
            <div className="flex justify-between mt-8 pt-6 border-t border-stone-700">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-300 disabled:opacity-30 transition-colors"
              >
                <ArrowLeft size={14} />
                返回
              </button>
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (step === 'ai-keys' && !canProceedFromAiKeys) ||
                  (step === 'redis' && !canProceedFromRedis)
                }
                className="flex items-center gap-1 text-sm text-stone-200 hover:text-white disabled:opacity-30 transition-colors"
              >
                {step === 'welcome' ? '开始配置' : '下一步'}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
