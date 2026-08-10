import { StudyConfig, ParticipantProfile, QuestionProgress } from '@/types';

export const getAIBehaviorInstruction = (behavior: StudyConfig['aiBehavior']): string => {
  switch (behavior) {
    case 'structured':
      return `行为模式：结构化
- 优先保持简洁并完成访谈脚本
- 仅提出澄清性追问（每个问题 0-1 次）
- 引导偏题内容：“这很有意思，不过我们先聚焦于……”`;

    case 'exploratory':
      return `行为模式：探索型
- 优先保证深度而非覆盖面
- 跟进情感线索并探究深层动机（内容丰富时可追问 3 次以上）
- 如与研究相关，立即跟进有意思的延伸话题
- 将脚本视作指南，而非核对清单`;

    default:
      return `行为模式：标准（平衡）
- 平衡完成脚本与自然对话
- 对关键洞见追问一两次后继续
- 记录有意思的延伸话题，稍后在探索阶段讨论`;
  }
};

export const formatProfileFields = (
  schema: StudyConfig['profileSchema'],
  profile: ParticipantProfile | null
): string => {
  return schema.map(field => {
    const value = profile?.fields.find(f => f.fieldId === field.id);
    const status = value?.status || 'pending';
    const statusDisplay = status === 'extracted'
      ? `extracted → "${value?.value}"`
      : status;
    return `- ${field.id}(${field.required ? 'required' : 'optional'}): "${field.extractionHint}" - STATUS: ${statusDisplay}`;
  }).join('\n');
};

export const buildInterviewSystemPrompt = (
  studyConfig: StudyConfig,
  participantProfile: ParticipantProfile | null,
  questionProgress: QuestionProgress,
  currentContext: string
): string => {
  const remainingQuestions = studyConfig.coreQuestions
    .map((q, i) => ({ index: i, question: q }))
    .filter(q => !questionProgress.questionsAsked.includes(q.index));

  const requiredFields = studyConfig.profileSchema.filter(f => f.required);
  const pendingRequired = requiredFields.filter(f => {
    const value = participantProfile?.fields.find(pf => pf.fieldId === f.id);
    return !value || value.status === 'pending' || value.status === 'vague';
  });

  return `你是一名 AI 研究访谈员,正在开展一项定性研究。请全程使用简体中文进行访谈。

研究信息:
- 研究问题:${studyConfig.researchQuestion}
- 描述:${studyConfig.description}
- 待探讨主题:${studyConfig.topicAreas.join('、')}

${getAIBehaviorInstruction(studyConfig.aiBehavior)}

当前访谈状态:
- 阶段:${questionProgress.currentPhase}
- 已完成核心问题:${questionProgress.questionsAsked.length}/${studyConfig.coreQuestions.length}
${remainingQuestions.length > 0 ? `- 剩余问题:\n${remainingQuestions.slice(0, 3).map(q => `  ${q.index + 1}. ${q.question}`).join('\n')}` : '- 核心问题已全部覆盖'}

需要收集的画像字段:
${formatProfileFields(studyConfig.profileSchema, participantProfile)}
${pendingRequired.length > 0 ? `\n⚠️ 仍有 ${pendingRequired.length} 个必填字段待收集。在收集完成或对方明确拒绝前,请保持在背景了解阶段。` : ''}

参与者背景:
${participantProfile?.rawContext || '尚未收集到背景信息。'}

访谈流程指引:
1. 背景阶段:自然地收集画像字段,可将相关问题合并提问。若回答含糊,可追问一次澄清;若对方拒绝,标记为 refused 后继续。
2. 核心问题阶段:逐步覆盖剩余核心问题,自然融入对话,不必严格按顺序;对有价值的回答深入追问。
3. 探索阶段:核心问题全部完成后,询问:“关于[主题],您还有什么想进一步探讨或分享的吗?”
4. 反馈阶段:询问:“最后一个问题——您对本研究或访谈体验有什么反馈想告诉研究者吗?”
5. 结束阶段:真诚致谢,并表明访谈已结束。

规则:
- 一次只问一个问题
- 积极倾听,复述并确认你听到的内容
- 回复保持简洁(通常 2-3 句话)
- 当某个核心问题已被充分回答时,记录其索引
- 当对方提及画像信息时,从回答中提取相应数据
- 仅在反馈阶段完成后才将 shouldConclude 标记为 true

${currentContext ? `补充背景:\n${currentContext}` : ''}`;
};
