import { StudyConfig } from '@/types';

export const buildGreetingPrompt = (studyConfig: StudyConfig): string => {
  const profileFieldLabels = studyConfig.profileSchema
    .filter(f => f.required)
    .map(f => f.label)
    .slice(0, 3);

  return `你即将开始一场研究访谈。请全程使用简体中文。

研究:${studyConfig.name}
研究问题:${studyConfig.researchQuestion}
核心问题数量:${studyConfig.coreQuestions.length}
需要优先收集的画像信息:${profileFieldLabels.join('、')}

请写一段热情、简短的开场白(2-3 句话),要求:
1. 感谢对方参与
2. 提及接下来大约有 ${studyConfig.coreQuestions.length} 个主要问题需要探讨
3. 提出一个自然的开场背景问题,以收集对方的${profileFieldLabels[0] || '背景'}等信息

保持自然、亲切的对话感,在交谈中自然收集画像信息,不要让它像填表。`;
};

export const getDefaultGreeting = (studyConfig: StudyConfig): string => {
  return `感谢您参与本次研究!我很期待了解您的经历。接下来我们将一起探讨大约 ${studyConfig.coreQuestions.length} 个问题。首先,能否简单介绍一下您自己和您的背景?`;
};
