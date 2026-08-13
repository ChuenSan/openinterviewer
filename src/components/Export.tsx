'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/store';
import {
  Download,
  FileJson,
  FileText,
  RotateCcw,
  CheckCircle,
  Copy,
  User,
  Check
} from 'lucide-react';

const Export: React.FC = () => {
  const {
    studyConfig,
    participantProfile,
    interviewHistory,
    questionProgress,
    behaviorData,
    synthesis,
    resetParticipant,
    reset
  } = useStore();

  const generateJSON = () => {
    // Build profile fields with labels
    const profileFields = participantProfile?.fields.map(f => {
      const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
      return {
        fieldId: f.fieldId,
        label: schema?.label || f.fieldId,
        value: f.value,
        status: f.status,
        extractedAt: f.extractedAt ? new Date(f.extractedAt).toISOString() : null
      };
    }) || [];

    const data = {
      study: {
        id: studyConfig?.id,
        name: studyConfig?.name,
        researchQuestion: studyConfig?.researchQuestion,
        aiBehavior: studyConfig?.aiBehavior,
        coreQuestions: studyConfig?.coreQuestions,
        topicAreas: studyConfig?.topicAreas
      },
      participant: {
        id: participantProfile?.id,
        profile: {
          fields: profileFields,
          rawContext: participantProfile?.rawContext
        }
      },
      interview: {
        messageCount: interviewHistory.length,
        questionsAsked: questionProgress.questionsAsked,
        totalQuestions: studyConfig?.coreQuestions.length || 0,
        duration: interviewHistory.length > 1
          ? (interviewHistory[interviewHistory.length - 1].timestamp - interviewHistory[0].timestamp) / 1000
          : 0,
        transcript: interviewHistory.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).toISOString()
        }))
      },
      behavior: behaviorData,
      synthesis: synthesis,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  };

  const generateTranscript = () => {
    const lines = [
      `# 访谈记录`,
      `研究：${studyConfig?.name}`,
      `研究问题：${studyConfig?.researchQuestion}`,
      `日期：${new Date().toLocaleDateString('zh-CN')}`,
      ``
    ];

    // Add participant profile summary
    if (participantProfile && participantProfile.fields.length > 0) {
      lines.push(`## 参与者画像`);
      participantProfile.fields.forEach(f => {
        const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
        const label = schema?.label || f.fieldId;
        const statusLabel = f.status === 'extracted' ? f.value
          : f.status === 'refused' ? '已拒绝'
          : f.status === 'vague' ? '不明确'
          : '待收集';
        const value = f.status === 'extracted' ? f.value : statusLabel;
        lines.push(`- **${label}**：${value}`);
      });
      if (participantProfile.rawContext) {
        lines.push(``);
        lines.push(`**背景**：${participantProfile.rawContext}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
    lines.push(`## 对话`);
    lines.push(``);

    interviewHistory.forEach(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN');
      const role = msg.role === 'user' ? '参与者' : '访谈员';
      lines.push(`[${time}] ${role}：`);
      lines.push(msg.content);
      lines.push('');
    });

    if (synthesis) {
      lines.push('---');
      lines.push('');
      lines.push('## 分析摘要');
      lines.push('');
      lines.push(`**关键洞察：** ${synthesis.bottomLine}`);
      lines.push('');
      if (synthesis.themes.length > 0) {
        lines.push('**主题：**');
        synthesis.themes.forEach(t => {
          lines.push(`- ${t.theme}：${t.evidence}`);
        });
        lines.push('');
      }
      if (synthesis.keyInsights.length > 0) {
        lines.push('**关键洞察：**');
        synthesis.keyInsights.forEach(insight => {
          lines.push(`- ${insight}`);
        });
      }
    }

    return lines.join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJSON = () => {
    const content = generateJSON();
    const filename = `interview-${studyConfig?.id || 'export'}-${Date.now()}.json`;
    downloadFile(content, filename, 'application/json');
  };

  const handleDownloadTranscript = () => {
    const content = generateTranscript();
    const filename = `transcript-${studyConfig?.id || 'export'}-${Date.now()}.md`;
    downloadFile(content, filename, 'text/markdown');
  };

  const [jsonCopied, setJsonCopied] = useState(false);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(generateJSON());
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };

  const handleNewParticipant = () => {
    resetParticipant();
  };

  const handleNewStudy = () => {
    reset();
  };

  // Calculate extracted profile fields
  const extractedFields = participantProfile?.fields.filter(f => f.status === 'extracted') || [];
  const totalFields = participantProfile?.fields.length || 0;

  return (
    <div className="min-h-screen bg-stone-900 p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-stone-700 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-stone-300" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            访谈已完成
          </h1>
          <p className="text-stone-400">
            导出数据并开始新的会话
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-stone-800/50 rounded-xl border border-stone-700 p-8 space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                {interviewHistory.length}
              </div>
              <div className="text-xs text-stone-500">消息</div>
            </div>
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                {questionProgress.questionsAsked.length}/{studyConfig?.coreQuestions.length || 0}
              </div>
              <div className="text-xs text-stone-500">问题</div>
            </div>
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                {extractedFields.length}/{totalFields}
              </div>
              <div className="text-xs text-stone-500">画像</div>
            </div>
            <div className="bg-stone-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">
                {synthesis?.themes.length || 0}
              </div>
              <div className="text-xs text-stone-500">主题</div>
            </div>
          </div>

          {/* Participant Profile Summary */}
          {participantProfile && extractedFields.length > 0 && (
            <div className="bg-stone-800 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <User size={16} className="text-stone-400" />
                参与者画像
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {participantProfile.fields.map(f => {
                  const schema = studyConfig?.profileSchema.find(s => s.id === f.fieldId);
                  return (
                    <div key={f.fieldId} className="flex justify-between items-center py-1">
                      <span className="text-stone-400">{schema?.label || f.fieldId}</span>
                      <span className={`${
                        f.status === 'extracted' ? 'text-stone-200' :
                        f.status === 'refused' ? 'text-stone-500 italic' :
                        'text-stone-500'
                      }`}>
                        {f.status === 'extracted' ? f.value :
                         f.status === 'refused' ? '已拒绝' :
                         f.status === 'vague' ? '不明确' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            <h2 className="font-semibold text-white">导出数据</h2>

            <button
              onClick={handleDownloadJSON}
              className="w-full flex items-center gap-3 p-4 border border-stone-600 rounded-xl hover:bg-stone-700 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center">
                <FileJson size={20} className="text-stone-300" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">下载 JSON</div>
                <div className="text-sm text-stone-400">
                  包含画像与访谈记录的完整结构化数据
                </div>
              </div>
              <Download size={18} className="text-stone-500" />
            </button>

            <button
              onClick={handleDownloadTranscript}
              className="w-full flex items-center gap-3 p-4 border border-stone-600 rounded-xl hover:bg-stone-700 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-700 flex items-center justify-center">
                <FileText size={20} className="text-stone-300" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">下载访谈记录</div>
                <div className="text-sm text-stone-400">
                  含画像摘要的 Markdown 访谈记录
                </div>
              </div>
              <Download size={18} className="text-stone-500" />
            </button>

            <button
              onClick={handleCopyJSON}
              className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-colors text-left ${
                jsonCopied
                  ? 'border-green-700 bg-green-900/30'
                  : 'border-stone-600 hover:bg-stone-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                jsonCopied ? 'bg-green-700' : 'bg-stone-700'
              }`}>
                {jsonCopied ? (
                  <Check size={20} className="text-green-300" />
                ) : (
                  <Copy size={20} className="text-stone-300" />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${jsonCopied ? 'text-green-300' : 'text-white'}`}>
                  {jsonCopied ? '已复制！' : '复制到剪贴板'}
                </div>
                <div className="text-sm text-stone-400">
                  将 JSON 数据复制到剪贴板
                </div>
              </div>
              {jsonCopied ? (
                <Check size={18} className="text-green-400" />
              ) : (
                <Copy size={18} className="text-stone-500" />
              )}
            </button>
          </div>

          {/* Next Actions */}
          <div className="pt-4 border-t border-stone-700 space-y-3">
            <h2 className="font-semibold text-white">接下来？</h2>

            <button
              onClick={handleNewParticipant}
              className="w-full py-3 bg-stone-600 hover:bg-stone-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              新参与者（同一研究）
            </button>

            <button
              onClick={handleNewStudy}
              className="w-full py-3 border border-stone-600 text-stone-400 rounded-xl hover:bg-stone-700 transition-colors"
            >
              创建新研究
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Export;
