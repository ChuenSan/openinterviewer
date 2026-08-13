'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StoredStudy } from '@/types';
import { getAllStudies, deleteStudy } from '@/services/storageService';
import {
  Loader2,
  Plus,
  BookOpen,
  Users,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Eye,
  Link as LinkIcon,
  MoreVertical,
  LogOut,
  AlertTriangle,
  Database,
  Sparkles
} from 'lucide-react';

const StudyList: React.FC = () => {
  const router = useRouter();
  const [studies, setStudies] = useState<StoredStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [kvWarning, setKvWarning] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudies();
  }, []);

  const loadStudies = async () => {
    setLoading(true);
    try {
      const { studies: data, warning } = await getAllStudies();
      setStudies(data);
      setKvWarning(warning || null);
    } catch (error) {
      console.error('Error loading studies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这项研究吗？此操作无法撤销。')) {
      return;
    }

    setDeletingId(id);
    try {
      const result = await deleteStudy(id);
      if (result.success) {
        setStudies(studies.filter(s => s.id !== id));
      } else {
        alert(result.error || '删除研究失败');
      }
    } catch (error) {
      console.error('Error deleting study:', error);
      alert('删除研究失败');
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setDemoMessage(null);
    try {
      const response = await fetch('/api/demo/seed', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setDemoMessage({
          type: 'success',
          text: `演示数据已加载：${data.data.studiesSeeded} 项研究，${data.data.interviewsSeeded} 场访谈`
        });
        await loadStudies(); // Refresh the list
      } else {
        setDemoMessage({ type: 'error', text: data.error || '加载演示数据失败' });
      }
    } catch (error) {
      console.error('Error loading demo:', error);
      setDemoMessage({ type: 'error', text: '加载演示数据失败' });
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClearDemo = async () => {
    if (!confirm('确定要清除全部演示数据吗？')) return;

    setLoadingDemo(true);
    setDemoMessage(null);
    try {
      const response = await fetch('/api/demo/seed', { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        setDemoMessage({ type: 'success', text: '演示数据已清除' });
        await loadStudies(); // Refresh the list
      } else {
        setDemoMessage({ type: 'error', text: data.error || '清除演示数据失败' });
      }
    } catch (error) {
      console.error('Error clearing demo:', error);
      setDemoMessage({ type: 'error', text: '清除演示数据失败' });
    } finally {
      setLoadingDemo(false);
    }
  };

  // Check if demo data exists
  const hasDemoData = studies.some(s => s.id.startsWith('demo-'));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-stone-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-700 flex items-center justify-center">
                <BookOpen className="text-stone-300" size={20} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">我的研究</h1>
                <p className="text-stone-400">
                  {studies.length} 项研究
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/setup')}
                className="px-4 py-2 text-sm bg-stone-600 hover:bg-stone-500 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                创建研究
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-xl transition-colors flex items-center gap-2"
              >
                <Users size={16} />
                全部访谈
              </button>
              {hasDemoData ? (
                <button
                  onClick={handleClearDemo}
                  disabled={loadingDemo}
                  className="px-4 py-2 text-sm border border-amber-700/50 text-amber-400 hover:bg-amber-900/30 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                  清除演示
                </button>
              ) : (
                <button
                  onClick={handleLoadDemo}
                  disabled={loadingDemo || !!kvWarning}
                  className="px-4 py-2 text-sm border border-purple-700/50 text-purple-400 hover:bg-purple-900/30 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingDemo ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  加载演示
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm border border-stone-600 text-stone-400 hover:bg-stone-700 rounded-xl transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          </div>
        </motion.div>

        {/* KV Warning Banner */}
        {kvWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-300 mb-1">存储尚未配置</h4>
              <p className="text-sm text-amber-400/80">{kvWarning}</p>
              <p className="text-sm text-amber-400/60 mt-2">
                请参阅 README，按说明使用 Vercel KV（Upstash Redis）完成配置。
              </p>
            </div>
          </motion.div>
        )}

        {/* Demo Message Banner */}
        {demoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-xl p-4 flex items-center gap-3 ${
              demoMessage.type === 'success'
                ? 'bg-green-900/30 border border-green-700/50'
                : 'bg-red-900/30 border border-red-700/50'
            }`}
          >
            {demoMessage.type === 'success' ? (
              <Sparkles size={20} className="text-green-400 flex-shrink-0" />
            ) : (
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
            )}
            <p className={`text-sm ${demoMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
              {demoMessage.text}
            </p>
            <button
              onClick={() => setDemoMessage(null)}
              className="ml-auto text-stone-500 hover:text-stone-300"
            >
              ×
            </button>
          </motion.div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-stone-400" />
          </div>
        ) : studies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-stone-800/50 rounded-2xl border border-stone-700 p-12 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-stone-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">暂无研究</h2>
            <p className="text-stone-400 mb-6">
              创建第一项研究，或加载演示数据来体验平台。
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/setup')}
                className="px-6 py-3 bg-stone-600 hover:bg-stone-500 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                创建研究
              </button>
              {!kvWarning && (
                <button
                  onClick={handleLoadDemo}
                  disabled={loadingDemo}
                  className="px-6 py-3 border border-purple-700/50 text-purple-400 hover:bg-purple-900/30 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingDemo ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  加载演示数据
                </button>
              )}
            </div>
            {!kvWarning && (
              <p className="text-stone-500 text-sm mt-4">
                演示包含一项示例研究、3 场已完成访谈及 AI 分析
              </p>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {studies.map((study, index) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 hover:border-stone-500 transition-colors relative"
              >
                {/* Menu button */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === study.id ? null : study.id)}
                    className="p-2 text-stone-500 hover:text-stone-400 rounded-lg hover:bg-stone-700"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {menuOpenId === study.id && (
                    <div className="absolute right-0 mt-1 w-48 bg-stone-800 border border-stone-700 rounded-xl shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          router.push(`/studies/${study.id}`);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-stone-300 hover:bg-stone-700 flex items-center gap-2"
                      >
                        <Eye size={14} />
                        查看详情
                      </button>
                      <button
                        onClick={() => {
                          // Store study config in sessionStorage for setup page
                          sessionStorage.setItem('prefillStudyConfig', JSON.stringify(study.config));
                          router.push(`/setup?prefill=edit&studyId=${study.id}`);
                          setMenuOpenId(null);
                        }}
                        disabled={study.isLocked}
                        className="w-full px-4 py-2 text-left text-sm text-stone-300 hover:bg-stone-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <LinkIcon size={14} />
                        编辑并生成链接
                      </button>
                      <button
                        onClick={() => handleDelete(study.id)}
                        disabled={deletingId === study.id || study.interviewCount > 0}
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-stone-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingId === study.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        删除
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/studies/${study.id}`)}
                >
                  <div className="flex items-start gap-3 mb-3 pr-8">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1">
                        {study.config.name}
                      </h3>
                      {study.config.description && (
                        <p className="text-sm text-stone-400 line-clamp-2">
                          {study.config.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-stone-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{study.interviewCount} 场访谈</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDate(study.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                      study.isLocked
                        ? 'bg-stone-700 text-stone-400'
                        : 'bg-green-900/50 text-green-400'
                    }`}>
                      {study.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                      {study.isLocked ? '已锁定' : '可编辑'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-stone-700 text-stone-400">
                      {study.config.coreQuestions.length} 个问题
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyList;
