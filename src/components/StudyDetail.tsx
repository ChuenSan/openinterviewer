'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StoredStudy, StoredInterview, AggregateSynthesisResult } from '@/types';
import { getStudy, getStudyInterviews } from '@/services/storageService';
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Users,
  Settings,
  BarChart3,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Clock,
  MessageSquare,
  Lightbulb,
  Sparkles,
  AlertCircle,
  GitBranch,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check
} from 'lucide-react';

interface StudyDetailProps {
  studyId: string;
}

type TabType = 'overview' | 'interviews' | 'settings';

const StudyDetail: React.FC<StudyDetailProps> = ({ studyId }) => {
  const router = useRouter();
  const [study, setStudy] = useState<StoredStudy | null>(null);
  const [interviews, setInterviews] = useState<StoredInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [aggregateSynthesis, setAggregateSynthesis] = useState<AggregateSynthesisResult | null>(null);
  const [isGeneratingAggregate, setIsGeneratingAggregate] = useState(false);
  const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
  const [isTogglingLinks, setIsTogglingLinks] = useState(false);
  const [participantLink, setParticipantLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    loadStudyData();
  }, [studyId]);

  const loadStudyData = async () => {
    setLoading(true);
    try {
      const [studyData, interviewData] = await Promise.all([
        getStudy(studyId),
        getStudyInterviews(studyId)
      ]);
      setStudy(studyData);
      setInterviews(interviewData);
    } catch (error) {
      console.error('Error loading study:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLinksEnabled = async () => {
    if (!study) return;

    const newLinksEnabled = !(study.config.linksEnabled ?? true);
    setIsTogglingLinks(true);

    try {
      const response = await fetch(`/api/studies/${studyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...study.config,
            linksEnabled: newLinksEnabled
          }
        })
      });

      if (!response.ok) {
        throw new Error('更新研究失败');
      }

      // Update local state
      setStudy({
        ...study,
        config: {
          ...study.config,
          linksEnabled: newLinksEnabled
        }
      });
    } catch (error) {
      console.error('Error toggling links:', error);
      alert('更新链接设置失败');
    } finally {
      setIsTogglingLinks(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!study) return;

    setGeneratingLink(true);
    try {
      const response = await fetch('/api/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyConfig: study.config })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成链接失败');
      }

      const data = await response.json();
      if (data.url) {
        setParticipantLink(data.url);
      }
    } catch (error) {
      console.error('Error generating link:', error);
      alert(error instanceof Error ? error.message : '生成链接失败');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (participantLink) {
      navigator.clipboard.writeText(participantLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateAggregateSynthesis = async () => {
    if (interviews.length < 2) {
      alert('至少需要 2 场访谈才能生成汇总分析');
      return;
    }

    setIsGeneratingAggregate(true);
    try {
      const response = await fetch('/api/synthesis/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成综合分析失败');
      }

      const data = await response.json();
      setAggregateSynthesis(data.synthesis);
    } catch (error) {
      console.error('Error generating aggregate synthesis:', error);
      alert(error instanceof Error ? error.message : '生成综合分析失败');
    } finally {
      setIsGeneratingAggregate(false);
    }
  };

  const handleGenerateFollowup = async () => {
    if (!aggregateSynthesis) {
      alert('请先生成汇总分析');
      return;
    }

    setIsGeneratingFollowup(true);
    try {
      const response = await fetch(`/api/studies/${studyId}/generate-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesis: aggregateSynthesis })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成后续研究失败');
      }

      const data = await response.json();

      // Store prefill config in sessionStorage and navigate to setup
      sessionStorage.setItem('prefillStudyConfig', JSON.stringify(data.followUpConfig));
      router.push('/setup?prefill=followup');
    } catch (error) {
      console.error('Error generating follow-up study:', error);
      alert(error instanceof Error ? error.message : '生成后续研究失败');
    } finally {
      setIsGeneratingFollowup(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start: number, end: number) => {
    const minutes = Math.round((end - start) / 1000 / 60);
    return `${minutes} 分钟`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-stone-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">未找到研究</h2>
          <p className="text-stone-400 mb-4">您查找的研究不存在。</p>
          <button
            onClick={() => router.push('/studies')}
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-xl"
          >
            返回研究列表
          </button>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '概览', icon: <BarChart3 size={16} /> },
    { id: 'interviews', label: '访谈', icon: <Users size={16} /> },
    { id: 'settings', label: '设置', icon: <Settings size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-stone-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/studies')}
            className="text-stone-400 hover:text-stone-300 flex items-center gap-2 mb-4"
          >
            <ArrowLeft size={16} />
            返回研究列表
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-stone-700 flex items-center justify-center">
                <BookOpen className="text-stone-300" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{study.config.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {study.interviewCount} 场访谈
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    创建于 {formatDate(study.createdAt)}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    study.isLocked
                      ? 'bg-stone-700 text-stone-400'
                      : 'bg-green-900/50 text-green-400'
                  }`}>
                    {study.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                    {study.isLocked ? '已锁定' : '可编辑'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-stone-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-stone-400 text-white'
                  : 'border-transparent text-stone-500 hover:text-stone-400'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Research Question */}
              <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-stone-400" />
                  研究问题
                </h3>
                <p className="text-stone-300">{study.config.researchQuestion}</p>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-4 text-center">
                  <div className="text-3xl font-bold text-white">{study.interviewCount}</div>
                  <div className="text-sm text-stone-400">访谈</div>
                </div>
                <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-4 text-center">
                  <div className="text-3xl font-bold text-white">{study.config.coreQuestions.length}</div>
                  <div className="text-sm text-stone-400">核心问题</div>
                </div>
                <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-4 text-center">
                  <div className="text-3xl font-bold text-white">{study.config.topicAreas.length}</div>
                  <div className="text-sm text-stone-400">主题领域</div>
                </div>
              </div>

              {/* Aggregate Synthesis */}
              <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <BarChart3 size={16} className="text-stone-400" />
                    汇总分析
                  </h3>
                  <button
                    onClick={handleGenerateAggregateSynthesis}
                    disabled={isGeneratingAggregate || interviews.length < 2}
                    className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingAggregate ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isGeneratingAggregate ? '分析中...' : '分析全部访谈'}
                  </button>
                </div>

                {interviews.length < 2 ? (
                  <p className="text-stone-500 text-sm">
                    至少需要 2 场访谈才能生成汇总分析。
                  </p>
                ) : aggregateSynthesis ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-2">关键发现</h4>
                      <ul className="space-y-1">
                        {aggregateSynthesis.keyFindings.map((finding, i) => (
                          <li key={i} className="text-stone-300 text-sm flex items-start gap-2">
                            <span className="text-stone-500">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-2">核心结论</h4>
                      <p className="text-stone-300 text-sm bg-stone-800 rounded-lg p-3">
                        {aggregateSynthesis.bottomLine}
                      </p>
                    </div>

                    {/* Generate Follow-up Study Button */}
                    <div className="pt-4 border-t border-stone-700">
                      <button
                        onClick={handleGenerateFollowup}
                        disabled={isGeneratingFollowup}
                        className="px-4 py-2 text-sm bg-stone-600 hover:bg-stone-500 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingFollowup ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <GitBranch size={14} />
                        )}
                        {isGeneratingFollowup ? '生成中...' : '创建后续研究'}
                      </button>
                      <p className="text-xs text-stone-500 mt-2">
                        根据本次分析中发现的缺口与模式，生成一项新研究。
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-500 text-sm">
                    点击「分析全部访谈」以生成跨访谈洞察。
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-4">
              {interviews.length === 0 ? (
                <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-12 text-center">
                  <Users size={32} className="text-stone-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">暂无访谈</h3>
                  <p className="text-stone-400 text-sm">
                    分享参与者链接即可开始收集访谈。
                  </p>
                </div>
              ) : (
                interviews.map((interview, index) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 hover:border-stone-600 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/interview/${interview.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Participant info */}
                        {interview.participantProfile && interview.participantProfile.fields.length > 0 && (
                          <div className="text-sm text-stone-300 mb-3">
                            {interview.participantProfile.fields
                              .filter(f => f.status === 'extracted' && f.value)
                              .slice(0, 3)
                              .map(f => f.value)
                              .join(' • ')}
                          </div>
                        )}

                        {/* Key insight */}
                        {interview.synthesis?.bottomLine && (
                          <div className="flex items-start gap-2 text-sm text-stone-300 bg-stone-800 rounded-lg p-3 mb-3">
                            <Lightbulb size={16} className="text-stone-400 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{interview.synthesis.bottomLine}</span>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDuration(interview.createdAt, interview.completedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {interview.transcript.length} 条消息
                          </div>
                          <div>
                            {formatDate(interview.createdAt)}
                          </div>
                        </div>
                      </div>

                      <button
                        className="p-2 text-stone-400 hover:text-stone-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/interview/${interview.id}`);
                        }}
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {study.interviewCount > 0 && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-white">
                      已收集 {study.interviewCount} 场访谈
                    </h4>
                    <p className="text-sm text-stone-400">
                      本研究已收集数据。仍可编辑，但可能影响与已有回答的一致性。
                    </p>
                  </div>
                </div>
              )}

              {/* Study Config Display */}
              <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">研究名称</label>
                  <p className="text-stone-200">{study.config.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">描述</label>
                  <p className="text-stone-200">{study.config.description || '暂无描述'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">研究问题</label>
                  <p className="text-stone-200">{study.config.researchQuestion}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">
                    核心问题（{study.config.coreQuestions.length}）
                  </label>
                  <ul className="space-y-2">
                    {study.config.coreQuestions.map((q, i) => (
                      <li key={i} className="text-stone-300 text-sm pl-4 border-l-2 border-stone-700">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">
                    主题领域（{study.config.topicAreas.length}）
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {study.config.topicAreas.map((topic, i) => (
                      <span key={i} className="px-3 py-1 bg-stone-700 text-stone-300 text-sm rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">AI 访谈风格</label>
                  <p className="text-stone-200">{
                    study.config.aiBehavior === 'structured' ? '结构化' :
                    study.config.aiBehavior === 'exploratory' ? '探索式' : '标准'
                  }</p>
                </div>
              </div>

              {/* Link Management */}
              <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6 space-y-4">
                <h3 className="font-semibold text-stone-100 flex items-center gap-2">
                  <LinkIcon size={18} className="text-stone-400" />
                  链接管理
                </h3>

                <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-xl">
                  <div>
                    <div className="font-medium text-stone-200">参与者访问</div>
                    <p className="text-sm text-stone-400">
                      {(study.config.linksEnabled ?? true)
                        ? '访问已开启 — 参与者可使用下方链接'
                        : '访问已关闭 — 同一链接将显示错误，直至重新开启'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleLinksEnabled}
                    disabled={isTogglingLinks}
                    className={`w-14 h-7 rounded-full transition-colors flex items-center px-1 ${
                      (study.config.linksEnabled ?? true)
                        ? 'bg-green-600'
                        : 'bg-stone-600'
                    } ${isTogglingLinks ? 'opacity-50' : ''}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      (study.config.linksEnabled ?? true) ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {study.config.linkExpiration && study.config.linkExpiration !== 'never' && (
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <Clock size={14} />
                    <span>链接有效期：生成后 {
                      study.config.linkExpiration === '7days' ? '7 天' :
                      study.config.linkExpiration === '30days' ? '30 天' : '90 天'
                    }</span>
                  </div>
                )}

                {!(study.config.linksEnabled ?? true) && (
                  <div className="text-xs text-amber-400 bg-amber-900/30 p-3 rounded-lg">
                    注意：所有参与者链接当前已禁用。尝试访问本研究的参与者将看到错误提示。
                  </div>
                )}
              </div>

              {/* Participant Link Generator */}
              <div className="bg-stone-800/50 rounded-xl border border-stone-700 p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <LinkIcon size={18} />
                  参与者链接
                </h3>

                <div className="space-y-4">
                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateLink}
                    disabled={generatingLink || !(study.config.linksEnabled ?? true)}
                    className="px-4 py-2 bg-stone-600 hover:bg-stone-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    {generatingLink ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
                    生成新链接
                  </button>

                  {/* Link Display (when generated) */}
                  {participantLink && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={participantLink}
                        readOnly
                        className="flex-1 bg-stone-900 border border-stone-600 rounded-lg px-3 py-2 text-stone-300 text-sm font-mono"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg flex items-center gap-1"
                      >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                        {copied ? '已复制' : '复制'}
                      </button>
                    </div>
                  )}

                  {/* Explanation */}
                  <p className="text-xs text-stone-500">
                    每次点击都会生成一条新的唯一链接。所有链接共用上方的启用/禁用开关。
                    {!(study.config.linksEnabled ?? true) && ' 链接当前已禁用 — 请先在上方开启访问。'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudyDetail;
