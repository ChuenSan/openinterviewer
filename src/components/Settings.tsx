'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Database, Key, CheckCircle, XCircle, Loader2,
  AlertCircle, ExternalLink, ArrowLeft, Save, ChevronDown, ChevronUp
} from 'lucide-react';

interface ResearcherProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
  hasRedisConfigured: boolean;
  hasGeminiKey: boolean;
  hasAnthropicKey: boolean;
  hasOpenAIKey: boolean;
}

interface ValidationState {
  loading: boolean;
  valid: boolean | null;
  error: string | null;
}

const Settings: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenAIKey] = useState('');
  const [redisUrl, setRedisUrl] = useState('');
  const [redisToken, setRedisToken] = useState('');

  // Validation state
  const [geminiValidation, setGeminiValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });
  const [anthropicValidation, setAnthropicValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });
  const [openaiValidation, setOpenAIValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });
  const [redisValidation, setRedisValidation] = useState<ValidationState>({ loading: false, valid: null, error: null });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Expandable guide state
  const [geminiGuideOpen, setGeminiGuideOpen] = useState(false);
  const [claudeGuideOpen, setClaudeGuideOpen] = useState(false);
  const [openaiGuideOpen, setOpenAIGuideOpen] = useState(false);
  const [redisGuideOpen, setRedisGuideOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const hasChanges = !!(geminiKey || anthropicKey || openaiKey || (redisUrl && redisToken));

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const body: Record<string, string | undefined> = {};
      if (geminiKey) body.geminiApiKey = geminiKey;
      if (anthropicKey) body.anthropicApiKey = anthropicKey;
      if (openaiKey) body.openaiApiKey = openaiKey;
      if (redisUrl && redisToken) {
        body.redisUrl = redisUrl;
        body.redisToken = redisToken;
      }

      if (Object.keys(body).length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch('/api/onboarding/save-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaveSuccess(true);
        // Refresh profile
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.profile) setProfile(meData.profile);
        // Clear form fields
        setGeminiKey('');
        setAnthropicKey('');
        setOpenAIKey('');
        setRedisUrl('');
        setRedisToken('');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || '保存失败，请重试。');
      }
    } catch {
      setSaveError('连接出错，请重试。');
    } finally {
      setSaving(false);
    }
  };

  const StatusIcon: React.FC<{ configured: boolean }> = ({ configured }) =>
    configured
      ? <CheckCircle size={16} className="text-green-400" />
      : <XCircle size={16} className="text-stone-500" />;

  const ValidationBadge: React.FC<{ state: ValidationState }> = ({ state }) => {
    if (state.loading) return <Loader2 size={16} className="animate-spin text-stone-400" />;
    if (state.valid === true) return <CheckCircle size={16} className="text-green-400" />;
    if (state.valid === false) return <AlertCircle size={16} className="text-red-400" />;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/studies')}
            className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-stone-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">设置</h1>
            {profile && (
              <p className="text-stone-400 text-sm">{profile.email}</p>
            )}
          </div>
        </div>

        {/* Current Status */}
        {profile && (
          <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">当前状态</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon configured={profile.hasGeminiKey} />
                <span className="text-stone-300 text-sm">Gemini 密钥</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon configured={profile.hasAnthropicKey} />
                <span className="text-stone-300 text-sm">Claude 密钥</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon configured={profile.hasOpenAIKey} />
                <span className="text-stone-300 text-sm">OpenAI 密钥</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon configured={profile.hasRedisConfigured} />
                <span className="text-stone-300 text-sm">Redis 存储</span>
              </div>
            </div>
          </div>
        )}

        {/* AI API Keys */}
        <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-stone-400" />
            <h2 className="text-lg font-semibold text-white">AI API 密钥</h2>
          </div>
          <p className="text-stone-400 text-sm mb-4">
            更新 API 密钥。留空则保留当前密钥。
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-stone-300">Gemini API Key</label>
                <ValidationBadge state={geminiValidation} />
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => { setGeminiKey(e.target.value); setGeminiValidation({ loading: false, valid: null, error: null }); }}
                  placeholder={profile?.hasGeminiKey ? '（已设置）' : 'AIza...'}
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
                  设置指南
                </button>

                {geminiGuideOpen && (
                  <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-stone-300">
                      <li>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">aistudio.google.com/apikey</a></li>
                      <li>登录后点击「Create API key」</li>
                      <li>复制密钥（以 AIza 开头）</li>
                    </ol>
                    <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                      <span>•</span>
                      <span>免费额度：每分钟 10 次，每天 250 次</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-stone-300">Claude API Key</label>
                <ValidationBadge state={anthropicValidation} />
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => { setAnthropicKey(e.target.value); setAnthropicValidation({ loading: false, valid: null, error: null }); }}
                  placeholder={profile?.hasAnthropicKey ? '（已设置）' : 'sk-ant-...'}
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
                  设置指南
                </button>

                {claudeGuideOpen && (
                  <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-stone-300">
                      <li>前往 <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">console.anthropic.com</a></li>
                      <li>注册并领取 5 美元免费额度（需美国手机号验证）</li>
                      <li>进入 API Keys → Create API Key → 复制密钥（以 sk-ant- 开头）</li>
                    </ol>
                    <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                      <span>•</span>
                      <span>5 美元免费额度约可完成 15-100 场访谈</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                  placeholder={profile?.hasOpenAIKey ? '（已设置）' : 'sk-...'}
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
                  设置指南
                </button>

                {openaiGuideOpen && (
                  <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-stone-300">
                      <li>前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">platform.openai.com/api-keys</a></li>
                      <li>创建新的密钥（以 sk- 开头）</li>
                      <li>或使用任何 OpenAI 兼容接口，并设置 OPENAI_BASE_URL</li>
                    </ol>
                    <div className="flex items-start gap-1.5 text-stone-400 mt-2">
                      <span>•</span>
                      <span>兼容 Groq、Together、DeepSeek、Ollama 等</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Redis Storage */}
        <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-stone-400" />
            <h2 className="text-lg font-semibold text-white">Upstash Redis 存储</h2>
          </div>
          <p className="text-stone-400 text-sm mb-4">
            更新 Redis 凭据。留空则保留当前连接。
            <span className="text-amber-400"> 注意：更改 Redis URL 将断开与当前数据的连接。</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-300 mb-1 block">REST API URL</label>
              <input
                type="text"
                value={redisUrl}
                onChange={(e) => { setRedisUrl(e.target.value); setRedisValidation({ loading: false, valid: null, error: null }); }}
                placeholder={profile?.hasRedisConfigured ? '（已设置）' : 'https://your-db.upstash.io'}
                className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-300 mb-1 block">REST API Token</label>
              <input
                type="password"
                value={redisToken}
                onChange={(e) => { setRedisToken(e.target.value); setRedisValidation({ loading: false, valid: null, error: null }); }}
                placeholder={profile?.hasRedisConfigured ? '（已设置）' : 'AXxx...'}
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
                设置指南
              </button>

              {redisGuideOpen && (
                <div className="mt-2 p-3 bg-stone-800/30 border border-stone-600 rounded-lg text-xs space-y-2">
                  <ol className="list-decimal list-inside space-y-1 text-stone-300">
                    <li>前往 <a href="https://console.upstash.com" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-300 underline">console.upstash.com</a> 并登录</li>
                    <li>点击「+ Create Database」→ 选择 Regional 和 Free 套餐</li>
                    <li>创建完成后，进入数据库详情 → REST API 部分</li>
                    <li>复制 REST URL（https://*.upstash.io）和 REST Token</li>
                  </ol>
                  <div className="flex items-start gap-1.5 text-amber-400 mt-2">
                    <span>⚠</span>
                    <span>请使用 REST URL（https://），不要使用普通 URL（redis://）</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {/* Partial Redis warning */}
        {((redisUrl && !redisToken) || (!redisUrl && redisToken)) && (
          <div className="flex items-center gap-2 p-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            更新存储凭据需要同时填写 Redis URL 和 Token。
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle size={14} /> 保存成功
              </span>
            )}
            {saveError && (
              <span className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle size={14} /> {saveError}
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-6 py-3 bg-stone-600 hover:bg-stone-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save size={18} />
                保存更改
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
