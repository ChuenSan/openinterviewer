import {
  StudyConfig,
  ParticipantProfile,
  InterviewMessage,
  BehaviorData,
  SynthesisResult
} from '@/types';

export const buildSynthesisPrompt = (
  history: InterviewMessage[],
  studyConfig: StudyConfig,
  behaviorData: BehaviorData,
  participantProfile: ParticipantProfile | null
): string => {
  const interviewText = history
    .map(m => `${m.role === 'user' ? '参与者' : '访谈员'}：${m.content}`)
    .join('\n\n');

  const profileSummary = participantProfile?.fields
    .filter(f => f.status === 'extracted' && f.value)
    .map(f => {
      const field = studyConfig.profileSchema.find(s => s.id === f.fieldId);
      return `${field?.label || f.fieldId}：${f.value}`;
    })
    .join('\n') || '无结构化档案数据';

  return `请分析这场研究访谈，提炼关键模式与洞见。所有输出内容必须使用简体中文;研究配置与访谈原文按其原语言分析,不要改写。

研究：
- 研究问题：${studyConfig.researchQuestion}
- 已探讨主题：${studyConfig.topicAreas.join('、')}

参与者档案：
${profileSummary}

背景：${participantProfile?.rawContext || '暂无'}

访谈记录：
${interviewText}

行为数据：
- 访谈阶段：${JSON.stringify(behaviorData.messagesPerTopic)}

请分析：
1. 参与者明确表达的重视事项
2. 其行为或侧重点所揭示的偏好
3. 有证据支撑的关键主题
4. 明示偏好与隐性偏好之间的矛盾
5. 对研究者的关键洞见`;
};

export const synthesisOutputDescription = `
预期输出结构：
{
  "statedPreferences": ["参与者表示其重视或希望获得的内容"],
  "revealedPreferences": ["其行为或侧重点所揭示的内容"],
  "themes": [
    { "theme": "主题名称", "evidence": "支持性引述或行为", "frequency": 3 }
  ],
  "contradictions": ["明示偏好与隐性偏好之间的差异"],
  "keyInsights": ["对研究者可采取行动的洞见"],
  "bottomLine": "一句话总结洞见"
}
`;

export const buildAggregateSynthesisPrompt = (
  studyConfig: StudyConfig,
  syntheses: SynthesisResult[],
  interviewCount: number
): string => {
  const synthesesText = syntheses.map((s, i) => `
--- 访谈 ${i + 1} ---
关键主题：${s.themes.map(t => t.theme).join('、')}
明示偏好：${s.statedPreferences.join('；')}
隐性偏好：${s.revealedPreferences.join('；')}
矛盾：${s.contradictions.join('；') || '未发现'}
关键洞见：${s.keyInsights.join('；')}
结论：${s.bottomLine}
`).join('\n');

  return `请分析 ${interviewCount} 场研究访谈，识别跨参与者的共同模式。所有输出内容必须使用简体中文;原始分析内容按其原语言理解,不要改写。

研究：
- 研究问题：${studyConfig.researchQuestion}
- 已探讨主题：${studyConfig.topicAreas.join('、')}

个体访谈分析：
${synthesesText}

你的任务是识别：
1. 共同主题：多场访谈中出现的模式（注明频次）
2. 分歧观点：参与者观点存在明显差异之处
3. 关键发现：所有访谈中最重要的发现
4. 研究启示：这些发现对研究问题意味着什么
5. 核心结论：用一段话总结这 ${interviewCount} 场访谈的洞见

重点寻找：
- 多位参与者反复提及的主题
- 共识与分歧领域
- 出人意料的模式
- 不同主题之间的关联
- 支持或挑战研究问题的证据`;
};

export const aggregateSynthesisOutputDescription = `
预期输出结构：
{
  "commonThemes": [
    {
      "theme": "主题名称",
      "frequency": 3,
      "representativeQuotes": ["来自不同访谈的示例证据"]
    }
  ],
  "divergentViews": [
    {
      "topic": "存在分歧的领域",
      "viewA": "一种观点",
      "viewB": "对比观点"
    }
  ],
  "keyFindings": ["回答研究问题的主要发现"],
  "researchImplications": ["这些发现对领域或实践的意义"],
  "bottomLine": "用一段话概述所有访谈的关键要点"
}
`;
