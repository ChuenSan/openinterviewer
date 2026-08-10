'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import OAuthLogin from './OAuthLogin';

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'standalone' | 'hosted' | null>(null);

  // Check deployment mode
  useEffect(() => {
    fetch('/api/config/mode')
      .then(res => res.json())
      .then(data => setMode(data.mode))
      .catch(() => setMode('standalone'));
  }, []);

  // Check for OAuth error in URL params
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        oauth_init_failed: '无法开始登录,请重试。',
        oauth_failed: '登录失败,请重试。',
        missing_params: '无效的回调,请重试。',
        invalid_state: '会话已过期,请重试。',
        user_fetch_failed: '无法获取您的个人资料,请重试。',
        no_email: '无法获取您的邮箱,请确认 GitHub 邮箱已验证。',
      };
      setError(errorMessages[oauthError] || '登录失败,请重试。');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '身份验证失败');
        return;
      }

      // Redirect to studies on success (validate to prevent open redirect)
      const rawRedirect = searchParams.get('redirect') || '/studies';
      const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
        ? rawRedirect
        : '/studies';
      router.push(redirect);
    } catch {
      setError('连接出错,请重试。');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while checking mode
  if (mode === null) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full"
      >
        <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-stone-700 flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-stone-300" />
            </div>
            <h1 className="text-xl font-bold text-white">研究者登录</h1>
            <p className="text-stone-400 text-sm mt-1">
              {mode === 'hosted'
                ? '登录以访问您的研究仪表盘'
                : '请输入管理员密码以访问仪表盘'
              }
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {mode === 'hosted' ? (
            <OAuthLogin loading={loading} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-300 mb-1">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  className="w-full px-4 py-3 rounded-xl bg-stone-800 border border-stone-600 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-stone-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!password.trim() || loading}
                className="w-full py-3 bg-stone-600 hover:bg-stone-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-stone-700 text-center">
            <button
              onClick={() => router.push('/setup')}
              className="text-sm text-stone-400 hover:text-stone-300 transition-colors"
            >
              返回研究设置
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
