// Demo Data for OpenInterviewer
// Provides realistic example study, interviews, and synthesis for demonstration

import {
  StoredStudy,
  StoredInterview,
  StudyConfig,
  InterviewMessage,
  SynthesisResult,
  ParticipantProfile,
  BehaviorData,
  AggregateSynthesisResult
} from '@/types';

// ============================================
// Demo Study Configuration
// ============================================

const DEMO_STUDY_ID = 'demo-study-adaptive-self';

export const DEMO_STUDY_CONFIG: StudyConfig = {
  id: DEMO_STUDY_ID,
  name: '适应性自我：AI 时代的职业身份',
  description: '探讨知识工作者如何在 AI 工具成为日常工作重要组成部分的过程中，调整职业身份与实践方式。本研究考察创意和分析类职业采用 AI 的心理、实践与社会维度。',
  researchQuestion: '当 AI 工具重塑工作性质时，专业人士如何重新定义自身价值与身份？',
  coreQuestions: [
    '请谈谈您最近使用 AI 工具的一个项目。您的体验如何？',
    '自从开始使用 AI 助手后，您的日常工作流程发生了哪些变化？',
    '您认为 AI 擅长处理工作中的哪些部分？哪些部分您更愿意亲自完成？',
    '您的同事或团队成员采用 AI 工具的方式与您不同吗？这如何影响协作？',
    '展望未来，您认为自己的职业角色将如何随 AI 能力的发展而演变？'
  ],
  topicAreas: [
    'AI 工具使用情况',
    '职业身份',
    '工作流程变化',
    '团队动态',
    '未来展望'
  ],
  profileSchema: [
    { id: 'role', label: '当前职位', extractionHint: '其职位名称或职业角色', required: true },
    { id: 'industry', label: '行业', extractionHint: '其所在的领域或行业', required: true },
    { id: 'ai_frequency', label: 'AI 使用频率', extractionHint: '其使用 AI 工具的频率（每天、每周等）', required: true, options: ['每天', '每周数次', '每周', '每月', '很少'] },
    { id: 'comfort_level', label: '对 AI 的适应程度', extractionHint: '其自述的 AI 工具适应程度', required: false, options: ['非常适应', '适应', '一般', '不适应', '非常不适应'] },
    { id: 'years_experience', label: '当前职位年限', extractionHint: '其担任当前职位或从事当前职业的时长', required: false }
  ],
  aiBehavior: 'standard',
  aiProvider: 'gemini',
  enableReasoning: true,
  consentText: '本访谈属于一项关于专业人士适应 AI 工具的研究。您的回答将被匿名化，仅用于研究目的。访谈约需 15-20 分钟。您可以跳过任何问题，或随时结束访谈。',
  createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
};

export const DEMO_STORED_STUDY: StoredStudy = {
  id: DEMO_STUDY_ID,
  config: DEMO_STUDY_CONFIG,
  createdAt: DEMO_STUDY_CONFIG.createdAt,
  updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  interviewCount: 3,
  isLocked: true
};

// ============================================
// Demo Interview 1: Sarah - 产品经理
// ============================================

const SARAH_PROFILE: ParticipantProfile = {
  id: 'profile-sarah',
  fields: [
    { fieldId: 'role', value: '产品经理', status: 'extracted', extractedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    { fieldId: 'industry', value: '金融科技初创公司', status: 'extracted', extractedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    { fieldId: 'ai_frequency', value: '每天', status: 'extracted', extractedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    { fieldId: 'comfort_level', value: '非常适应', status: 'extracted', extractedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 },
    { fieldId: 'years_experience', value: '6 年', status: 'extracted', extractedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 }
  ],
  rawContext: 'Sarah 是一家金融科技初创公司的高级产品经理,拥有 6 年经验。她每天使用 Claude 起草规格、分析用户反馈和头脑风暴产品策略。对 AI 非常热情,认为它是赋能而非威胁。',
  timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000
};

const SARAH_TRANSCRIPT: InterviewMessage[] = [
  { id: 'msg-s1', role: 'ai', content: "您好！感谢您参与这场关于专业人士使用 AI 工具体验的研究访谈。我很想了解您的工作，以及 AI 如何参与您的职业历程。首先，您能简单介绍一下目前的职位吗？", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 },
  { id: 'msg-s2', role: 'user', content: "当然可以!我是一家金融科技初创公司的产品经理,入行大约 6 年,最近 2 年在现在这家公司。我们在做面向小微企业的贷款工具。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 60000 },
  { id: 'msg-s3', role: 'ai', content: "这个领域很有活力。我想听听您最近一个使用 AI 工具的项目——那段体验是怎样的?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 120000 },
  { id: 'msg-s4', role: 'user', content: "我现在几乎每天都在用 Claude。上周我在为新的信用评分功能写一份重要的产品规格,用它分析了约 200 条用户反馈、起草初稿,还帮我梳理边界情况。以前要花 3-4 天的事,现在大概 8 小时就完成了。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 180000 },
  { id: 'msg-s5', role: 'ai', content: "效率提升很惊人。不过我很好奇——您说它帮您“梳理边界情况”,具体是怎么做到的?感觉像在和同事协作吗?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 240000 },
  { id: 'msg-s6', role: 'user', content: "嗯,和同事不太一样。和同事会有来回讨论、质疑和各自的经验。Claude 更像是一位博览群书、从不厌烦我提问的助手——它会提出我可能忽略的点,但最终做判断的还是我。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 300000 },
  { id: 'msg-s7', role: 'ai', content: "这个区分很重要——您保留判断,它处理广度。自从用上这些工具后,您的日常工作方式发生了什么变化?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 360000 },
  { id: 'msg-s8', role: 'user', content: "说实话?我现在花在策略上的时间多多了。以前一天大部分都在“处理”——看工单、整理会议纪要、写邮件。现在这些事只需一小部分时间,我可以真正思考全局。就像没换工作却升了职。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 420000 },
  { id: 'msg-s9', role: 'ai', content: "“没换工作却升了职”——这个说法很妙。但我也想知道另一面:有没有什么是您失去了的,或发生了意料之外的变化?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 480000 },
  { id: 'msg-s10', role: 'user', content: "问得好。有时我担心自己在丢失一些“肌肉”。比如我以前写作很利落,因为写得够多。现在从零写东西时感觉……有点生疏了?不过也可能只是因为我拿它跟 Claude 的产出比。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 540000 },
  { id: 'msg-s11', role: 'ai', content: "能力提升与技能保持之间的张力很有意思。我想问问您的团队——同事们采用 AI 工具的方式和您不同吗?这对协作有什么影响?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 600000 },
  { id: 'msg-s12', role: 'user', content: "情况不一!我们的工程师很常用 Copilot,但对其他 AI 持怀疑态度。我的 CEO 是超级 AI 爱好者,可能比我更甚。但一些资深同事几乎不用。这就造成一种微妙的局面:我出活太快,其他人跟不上,我得小心别让他们觉得自己慢。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 660000 },
  { id: 'msg-s13', role: 'ai', content: "看来还有人际层面需要平衡——要注意 AI 带来的速度对团队动态的影响。展望未来,随着这些能力继续发展,您如何看待自己职业角色的演变?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 720000 },
  { id: 'msg-s14', role: 'user', content: "我真心感到乐观。我认为拥抱 AI 的产品经理会变得像“迷你 CEO”——我们会有更多精力进行战略思考、建立关联、深入理解用户。而那些不用的人……说实话会被甩开。不是因为 AI 取代他们,而是用 AI 的产品经理就是会更出色。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 780000 },
  { id: 'msg-s15', role: 'ai', content: "听起来您把 AI 看作放大器而非替代品——扩展采用者的可能性。结束前,关于工作中使用 AI 的体验,您还有什么想分享的吗?", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 840000 },
  { id: 'msg-s16', role: 'user', content: "只是觉得我们还处在非常早期的阶段。让我想象 5 年后的工作,我真的想象不出来。但我知道,我想成为参与塑造那个未来的人,而不只是被动应对。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 900000 },
  { id: 'msg-s17', role: 'ai', content: "这种面向未来、主动塑造的视角很有感染力。非常感谢您分享这些经历与洞见,Sarah。这是一场关于职业生活中如何驾驭 AI 的丰富对话。", timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000 + 960000 }
];

const SARAH_SYNTHESIS: SynthesisResult = {
  statedPreferences: [
    '重视战略性思考胜过常规处理性事务',
    '倾向于保留判断与决策权',
    '希望主动塑造受 AI 影响的未来',
    '重视 AI 工具带来的效率提升'
  ],
  revealedPreferences: [
    '从高层次战略性工作中获得职业身份认同',
    '在意团队动态,不希望让他人感到相形见绌',
    '尽管热情高涨,仍对技能退化有些焦虑',
    '将 AI 采用视为职业竞争力的差异点'
  ],
  themes: [
    { theme: '角色跃升', evidence: '“就像没换工作却升了职”——AI 让她能聚焦更战略性的工作', frequency: 4 },
    { theme: '技能张力', evidence: '担心写作变得“生疏”——能力提升与技能保持之间的矛盾', frequency: 2 },
    { theme: '团队平衡', evidence: '小心不让较慢的同事“觉得自己慢”——人际敏感度', frequency: 2 },
    { theme: '竞争叙事', evidence: '不采用者“会被甩开”——AI 作为职业分化因素', frequency: 3 }
  ],
  contradictions: [
    '对 AI 的益处充满热情,同时又担心个人技能的流失',
    '认为 AI 是一种赋能,但又把不采用 AI 视为职业风险'
  ],
  keyInsights: [
    '采用 AI 被体验为能力的扩展,而非替代',
    '速度差异催生了需要主动管理的团队动态',
    '即使在热情的采用者中,技能退化的担忧依然存在',
    '职业身份正从“执行者”转向“战略思考者”'
  ],
  bottomLine: 'Sarah 代表了热情的 AI 采用者:她成功地将 AI 工具重构为能力放大器,从而转向更具战略性的工作。然而,热情之下也隐藏着对技能保持与团队动态的细腻担忧。'
};

const SARAH_BEHAVIOR: BehaviorData = {
  timePerTopic: {
    'AI 工具使用情况': 180000,
    '职业身份': 240000,
    '工作流程变化': 180000,
    '团队动态': 120000,
    '未来展望': 180000
  },
  messagesPerTopic: {
    'AI 工具使用情况': 4,
    '职业身份': 4,
    '工作流程变化': 3,
    '团队动态': 2,
    '未来展望': 3
  },
  topicsExplored: ['AI 工具使用情况', '职业身份', '工作流程变化', '团队动态', '未来展望'],
  contradictions: ['热情与技能退化担忧并存']
};

export const SARAH_INTERVIEW: StoredInterview = {
  id: 'interview-demo-sarah',
  studyId: DEMO_STUDY_ID,
  studyName: DEMO_STUDY_CONFIG.name,
  participantProfile: SARAH_PROFILE,
  transcript: SARAH_TRANSCRIPT,
  synthesis: SARAH_SYNTHESIS,
  behaviorData: SARAH_BEHAVIOR,
  createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
  completedAt: Date.now() - 5 * 24 * 60 * 60 * 1000 + 1200000,
  status: 'completed'
};

// ============================================
// Demo Interview 2: Marcus - UX Designer
// ============================================

const MARCUS_PROFILE: ParticipantProfile = {
  id: 'profile-marcus',
  fields: [
    { fieldId: 'role', value: '高级用户体验设计师', status: 'extracted', extractedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
    { fieldId: 'industry', value: '企业软件', status: 'extracted', extractedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
    { fieldId: 'ai_frequency', value: '每周数次', status: 'extracted', extractedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
    { fieldId: 'comfort_level', value: '适应', status: 'extracted', extractedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
    { fieldId: 'years_experience', value: '12 年', status: 'extracted', extractedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 }
  ],
  rawContext: 'Marcus 是一名拥有 12 年企业软件经验的高级 UX 设计师。他最初对 AI 工具持怀疑态度,后来逐渐将其用于创意发散与迭代。他坚信人类判断力在设计中的不可替代价值。',
  timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000
};

const MARCUS_TRANSCRIPT: InterviewMessage[] = [
  { id: 'msg-m1', role: 'ai', content: "欢迎您！感谢您抽出时间参加本次访谈。我们正在探讨专业人士如何在工作中体验 AI 工具。您能先介绍一下自己的职位吗？", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 },
  { id: 'msg-m2', role: 'user', content: "我是一名高级 UX 设计师,从业约 12 年,目前在一家为医疗行政管理开发工具的企业软件公司工作。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000 },
  { id: 'msg-m3', role: 'ai', content: "在一个重视深厚专业能力的领域里,这是很丰富的经验。我想听听您最近一个使用 AI 工具的项目——体验如何?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 120000 },
  { id: 'msg-m4', role: 'user', content: "说实话,我长期以来都是怀疑派,“AI 做不了真正的设计”基本是我的立场。但团队负责人推动我们尝试用 Midjourney 做创意发散,结果我……很惊讶。一次操作一小时就生成了大约 100 个视觉方向,正常情况下那要画好几天的草图。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 180000 },
  { id: 'msg-m5', role: 'ai', content: "从怀疑到这样,转变很大!看到那 100 个方向时,您在想什么?感受如何?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 240000 },
  { id: 'msg-m6', role: 'user', content: "百感交集。一方面觉得“哇,这对探索太有用了”;另一方面又几乎感到……被威胁?如果一小时能做完过去几天的工作,那我那些日子的价值又算什么?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 300000 },
  { id: 'msg-m7', role: 'ai', content: "这种惊叹与威胁并存的感受非常真实。您是如何化解的,还是仍在消化中?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 360000 },
  { id: 'msg-m8', role: 'user', content: "我想我找到了一个有用的定位。AI 可以无限生成变体,但它不知道哪一个真正解决了用户的问题。那仍然是我的工作。就像有一个极快但毫无品味的速写画师——品味由我来提供。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 420000 },
  { id: 'msg-m9', role: 'ai', content: "“品味由我来提供”——这是很有力的重构。这改变了您的日常工作流程吗?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 480000 },
  { id: 'msg-m10', role: 'user', content: "当然。现在迭代快多了。以前开利益相关方会议我只带 3 个概念,现在能带 15 个,并根据反馈现场调整。不知怎么,这让设计过程更具协作性了,因为大家对单个方向不再那么敝帚自珍。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 540000 },
  { id: 'msg-m11', role: 'ai', content: "不再敝帚自珍——很有意思。听起来 AI 改变的不只是速度,还有与工作的情感关系。与您相比,同事们的适应情况如何?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 600000 },
  { id: 'msg-m12', role: 'user', content: "一半一半。初级设计师很喜欢——他们觉得自己能做出超出资历水准的东西。但我的一些资深同行非常抵触。有位同行直接说:“我花 15 年精通 Photoshop,不是为了让机器来做。”我理解,但我也认为那是在打一场必输的仗。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 660000 },
  { id: 'msg-m13', role: 'ai', content: "您理解他们的抵触,但认为那是徒劳的。展望未来,您认为设计师这个角色会如何演变?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 720000 },
  { id: 'msg-m14', role: 'user', content: "我认为设计师会变得更像创意总监——少一些亲手操作工具,多一些引导与筛选。技艺部分——推像素、精确执行——正在被自动化。仍然属于人类的是理解人、做判断、讲故事。如果只会推像素,那确实危险了。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 780000 },
  { id: 'msg-m15', role: 'ai', content: "从执行转向判断与筛选。您现在有什么不同的做法,来为那个未来做准备吗?", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 840000 },
  { id: 'msg-m16', role: 'user', content: "有的。我把更多时间花在研究、用户访谈和理解场景上——这些 AI 无法直接生成的东西。说实话,也让我重新找回了当初进入设计行业的原因:那从来不是关于工具,而是为人们解决问题。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 900000 },
  { id: 'msg-m17', role: 'ai', content: "与初心的重新连接非常美好。感谢您坦诚地分享从怀疑到融合的历程,Marcus。您关于品味、判断与设计专业能力演变的见解非常有价值。", timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 + 960000 }
];

const MARCUS_SYNTHESIS: SynthesisResult = {
  statedPreferences: [
    '认为人类判断力与“品味”不可替代',
    '偏好协作式、迭代式的设计流程',
    '希望专注于理解用户,而非精通工具',
    '主张适应变化而非抗拒'
  ],
  revealedPreferences: [
    '尽管心存怀疑,仍需外部推动才尝试 AI 工具',
    '在重构自身价值后,最初的威胁感减弱了',
    '同情抵触的同事,同时认为他们的立场没有出路',
    '以回归设计本质来回应 AI 带来的变化'
  ],
  themes: [
    { theme: '怀疑者转变', evidence: '从“AI 做不了真正的设计”到“一小时 100 个方向”——外部推动促成了重新评估', frequency: 3 },
    { theme: '价值重构', evidence: '“品味由我来提供”——将生成与判断分离', frequency: 4 },
    { theme: '执念减弱', evidence: '更多概念、更少执念、更强协作', frequency: 2 },
    { theme: '代际分化', evidence: '初级设计师拥抱,资深同行抵触——对技艺的不同态度', frequency: 2 }
  ],
  contradictions: [
    '既深切理解抵触同事的立场,又认为那没有出路',
    '重视技艺造诣,同时承认其重要性正在下降'
  ],
  keyInsights: [
    '外部推动机制能通过直接体验转化 AI 怀疑者',
    '重构个人价值主张(品味 vs. 生成)能化解威胁感',
    'AI 工具可能降低对单个设计方案的情感执念,从而促进协作',
    '当技艺技能被自动化时,资深专业人士面临身份危机'
  ],
  bottomLine: 'Marcus 代表了转变后的怀疑者:他通过将自身价值从执行重构为判断而找到了平衡。他的经历表明,直接体验加上新的心智模型,可以把对 AI 的抵触转化为富有成效的采用。'
};

const MARCUS_BEHAVIOR: BehaviorData = {
  timePerTopic: {
    'AI 工具使用情况': 240000,
    '职业身份': 300000,
    '工作流程变化': 120000,
    '团队动态': 120000,
    '未来展望': 180000
  },
  messagesPerTopic: {
    'AI 工具使用情况': 4,
    '职业身份': 5,
    '工作流程变化': 2,
    '团队动态': 2,
    '未来展望': 3
  },
  topicsExplored: ['AI 工具使用情况', '职业身份', '工作流程变化', '团队动态', '未来展望'],
  contradictions: ['理解抵触的同时认为其徒劳']
};

export const MARCUS_INTERVIEW: StoredInterview = {
  id: 'interview-demo-marcus',
  studyId: DEMO_STUDY_ID,
  studyName: DEMO_STUDY_CONFIG.name,
  participantProfile: MARCUS_PROFILE,
  transcript: MARCUS_TRANSCRIPT,
  synthesis: MARCUS_SYNTHESIS,
  behaviorData: MARCUS_BEHAVIOR,
  createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
  completedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 + 1200000,
  status: 'completed'
};

// ============================================
// Demo Interview 3: Priya - 内容经理
// ============================================

const PRIYA_PROFILE: ParticipantProfile = {
  id: 'profile-priya',
  fields: [
    { fieldId: 'role', value: '内容经理', status: 'extracted', extractedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
    { fieldId: 'industry', value: '数字媒体', status: 'extracted', extractedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
    { fieldId: 'ai_frequency', value: '每天', status: 'extracted', extractedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
    { fieldId: 'comfort_level', value: '适应', status: 'extracted', extractedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 },
    { fieldId: 'years_experience', value: '8 年', status: 'extracted', extractedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 }
  ],
  rawContext: 'Priya 是一家数字媒体公司的内容经理,从业 8 年。她每天用 AI 起草初稿,但坚持严格的编辑把关。她正纠结于效率与真实性之间的张力,尤其是受众信任问题。',
  timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000
};

const PRIYA_TRANSCRIPT: InterviewMessage[] = [
  { id: 'msg-p1', role: 'ai', content: "您好！感谢您参加本次研究访谈。我们正在探讨专业人士如何在工作中应对 AI。您能介绍一下您目前的职位吗？", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 },
  { id: 'msg-p2', role: 'user', content: "我是一家数字媒体公司的内容经理,主要做新闻和生活方式内容。我在内容/编辑领域一共做了大约 8 年。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000 },
  { id: 'msg-p3', role: 'ai', content: "内容与媒体正处在 AI 讨论的中心。我想听听您最近一个使用 AI 工具的项目——您的体验如何?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 120000 },
  { id: 'msg-p4', role: 'user', content: "我们每天都用 AI 写初稿。我选定一个主题,喂入研究资料和我们的风格指南,几分钟就能拿回一版草稿,而不是几个小时。我的工作已从写作转向编辑与打磨。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 180000 },
  { id: 'msg-p5', role: 'ai', content: "这是很大的转变——从创作者变成编辑。您如何看待这个角色的变化?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 240000 },
  { id: 'msg-p6', role: 'user', content: "很复杂。一方面,我们的产量能达到 3 倍;另一方面……我入行是因为热爱写作。现在我花在修补 AI 文稿上的时间,比写自己的东西还多。效率很高,但有时会感到空洞。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 300000 },
  { id: 'msg-p7', role: 'ai', content: "“高效但空洞”——这个说法很触动人心。能多说说那种空洞感吗?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 360000 },
  { id: 'msg-p8', role: 'user', content: "为一句子反复推敲、找到恰好那个词……那种创作上的摩擦力感觉很重要。现在我有时会发布技术上没问题的文章,但感觉不到那是自己的作品。就像我是机器操作员,而不是作者。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 420000 },
  { id: 'msg-p9', role: 'ai', content: "创作归属感与挣扎的丧失。这会影响您如何看待自己的受众吗?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 480000 },
  { id: 'msg-p10', role: 'user', content: "这其实是我最大的矛盾。读者信任我们是因为真实的观点。如果他们知道有多少内容是 AI 辅助的,还会信任我们吗?我们没有披露这一点,这感觉……不太对。但话又说回来,经过编辑的产出就是我的观点,不是吗?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 540000 },
  { id: 'msg-p11', role: 'ai', content: "您正在纠结于真实的透明度与真实性问题。在团队里这种情况如何体现?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 600000 },
  { id: 'msg-p12', role: 'user', content: "我们并不公开谈论这件事。每个人都在用 AI,但有一种心照不宣的……羞耻感?好像那是个不可告人的秘密。这很奇怪,因为管理层明确鼓励用它提效。但老派的新闻价值观根深蒂固。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 660000 },
  { id: 'msg-p13', role: 'ai', content: "官方鼓励与心照不宣的羞耻之间的落差很有意思。展望未来,您认为内容工作会如何演变?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 720000 },
  { id: 'msg-p14', role: 'user', content: "我认为不管我们愿不愿意,披露要求终会到来。读者会要求的。说实话,这也许是好事——它迫使我们想清楚人的价值究竟在哪里。调查报道、深度的人文故事、原创的观点——那才是我想专注的。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 780000 },
  { id: 'msg-p15', role: 'ai', content: "所以这种压力或许能让人看清人类贡献的真正价值所在。您在为那一刻做什么准备?", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 840000 },
  { id: 'msg-p16', role: 'user', content: "我在主动为只有人能做的工作保留时间——真实的采访、原创报道、有真诚声音的随笔。这更难,因为 AI 能填满你给它的任何时间,但我认为那些能力才是未来最重要的。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 900000 },
  { id: 'msg-p17', role: 'ai', content: "在 AI 扩张到各处的同时,为不可化约的人性工作保留空间。感谢您如此深思熟虑且坦诚的分享,Priya。您关于真实性、披露与创作工作性质变化的思考非常有价值。", timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000 + 960000 }
];

const PRIYA_SYNTHESIS: SynthesisResult = {
  statedPreferences: [
    '珍视真实的声音与原创观点',
    '认同对受众保持透明',
    '希望专注于独属于人类的新闻工作',
    '效率有价值,但并非全部'
  ],
  revealedPreferences: [
    '尽管不安,仍参与了不披露的做法',
    '怀念写作中的创作挣扎',
    '对已发布作品感到归属感的丧失',
    '职业实践与个人价值观之间的张力'
  ],
  themes: [
    { theme: '真实性危机', evidence: '“高效但空洞”——产量提升以创作归属感为代价', frequency: 4 },
    { theme: '披露张力', evidence: '不披露“感觉不太对”——悬而未决的伦理问题', frequency: 3 },
    { theme: '组织性羞耻', evidence: '尽管管理层鼓励,仍“心照不宣地感到羞耻”', frequency: 2 },
    { theme: '防御性策略', evidence: '主动为“只有人能做的工作”保留时间', frequency: 2 }
  ],
  contradictions: [
    '每天使用 AI,同时觉得它削弱了真实的声音',
    '认同透明,却参与了不披露',
    '管理层鼓励使用 AI,团队却对此感到羞耻'
  ],
  keyInsights: [
    '采用 AI 可能在真实性与披露方面引发伦理张力',
    '创意型职业可能经历归属感与身份认同的丧失',
    '组织文化可能同时强制推行 AI 又对其污名化',
    '对人类价值的清晰认知可能来自外部压力(披露要求)'
  ],
  bottomLine: 'Priya 代表了在伦理上充满矛盾的采用者:她大量使用 AI,同时真切地担忧真实性与披露问题。她的经历凸显了一个事实:AI 的效率在提升产能的同时,也可能掏空创作的满足感。'
};

const PRIYA_BEHAVIOR: BehaviorData = {
  timePerTopic: {
    'AI 工具使用情况': 180000,
    '职业身份': 360000,
    '工作流程变化': 60000,
    '团队动态': 120000,
    '未来展望': 180000
  },
  messagesPerTopic: {
    'AI 工具使用情况': 3,
    '职业身份': 6,
    '工作流程变化': 1,
    '团队动态': 2,
    '未来展望': 3
  },
  topicsExplored: ['AI 工具使用情况', '职业身份', '工作流程变化', '团队动态', '未来展望'],
  contradictions: ['每天使用与真实性担忧并存', '认同透明却参与不披露']
};

export const PRIYA_INTERVIEW: StoredInterview = {
  id: 'interview-demo-priya',
  studyId: DEMO_STUDY_ID,
  studyName: DEMO_STUDY_CONFIG.name,
  participantProfile: PRIYA_PROFILE,
  transcript: PRIYA_TRANSCRIPT,
  synthesis: PRIYA_SYNTHESIS,
  behaviorData: PRIYA_BEHAVIOR,
  createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  completedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 + 1200000,
  status: 'completed'
};

// ============================================
// Demo Aggregate Synthesis
// ============================================

export const DEMO_AGGREGATE_SYNTHESIS: AggregateSynthesisResult = {
  studyId: DEMO_STUDY_ID,
  interviewCount: 3,
  commonThemes: [
    {
      theme: '角色从执行转向判断',
      frequency: 3,
      representativeQuotes: [
        '“就像没换工作却升了职”——Sarah',
        '“品味由我来提供”——Marcus',
        '“我的工作已从写作转向编辑与打磨”——Priya'
      ]
    },
    {
      theme: '技能退化担忧',
      frequency: 3,
      representativeQuotes: [
        '“我以前写作很利落……现在感觉有点生疏了”——Sarah',
        '“我花 15 年精通 Photoshop,不是为了让机器来做”——Marcus 的同事',
        '“我花在修补 AI 文稿上的时间,比写自己的东西还多”——Priya'
      ]
    },
    {
      theme: '需要人际层面的平衡',
      frequency: 3,
      representativeQuotes: [
        '“我得小心别让他们觉得自己慢”——Sarah',
        '“初级设计师很喜欢……资深同行非常抵触”——Marcus',
        '“有一种心照不宣的羞耻感”——Priya'
      ]
    },
    {
      theme: '以身份重构作为适应策略',
      frequency: 3,
      representativeQuotes: [
        '“拥抱 AI 的产品经理会变得像迷你 CEO”——Sarah',
        '“设计师会变得更像创意总监”——Marcus',
        '“调查报道、深度的人文故事——那才是我想专注的”——Priya'
      ]
    }
  ],
  divergentViews: [
    {
      topic: '与 AI 的情感关系',
      viewA: 'Sarah:热情的放大器视角——AI 是纯粹的能力扩展',
      viewB: 'Priya:矛盾的使用者——AI 带来效率,却伴随真实性代价'
    },
    {
      topic: '采用路径',
      viewA: 'Sarah:自我驱动的早期采用者,内在动机强',
      viewB: 'Marcus:在外部推动与直接体验中转变的怀疑者'
    },
    {
      topic: '透明度关切',
      viewA: 'Sarah 与 Marcus:聚焦个人能力,而非披露问题',
      viewB: 'Priya:纠结于受众信任相关的伦理问题'
    }
  ],
  keyFindings: [
    '在所有受访职业中,采用 AI 都会引发身份再协商:专业人士正将自身价值从执行重新定义为判断、筛选与战略思考',
    '即使是热情的采用者也对技能退化心存担忧,说明无论采用态度如何,这几乎是一种普遍焦虑',
    'AI 带来的速度差异在团队中催生了新的动态,需要主动管理,并造成代际张力',
    '不同职业面临不同的伦理张力——创意/媒体领域尤其纠结于真实性与披露问题',
    '成功的适应需要找到新的心智模型(“品味由我来提供”、“迷你 CEO”),在融入 AI 能力的同时保住职业身份'
  ],
  researchImplications: [
    '培训项目应同时覆盖工具熟练度与身份/价值重构',
    '组织需要围绕 AI 披露与团队动态建立明确规范',
    '后续研究应探讨技能退化担忧如何影响长期职业发展',
    '可能需要针对特定行业的 AI 使用伦理框架,尤其是在创意/媒体领域'
  ],
  bottomLine: '在三位来自不同领域的知识工作者中,采用 AI 根本上是一场身份挑战,而非技能挑战。所有参与者都能成功使用 AI 工具,但更深层的工作在于重新定义职业价值,并应对社会与伦理层面的复杂性。热情者(Sarah)、转变后的怀疑者(Marcus)与伦理上矛盾的采用者(Priya),代表了 AI 时代职业重塑这一共同旅程上的不同位置。',
  generatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000
};

// ============================================
// Export Arrays for Seeding
// ============================================

export const DEMO_STUDIES: StoredStudy[] = [DEMO_STORED_STUDY];
export const DEMO_INTERVIEWS: StoredInterview[] = [SARAH_INTERVIEW, MARCUS_INTERVIEW, PRIYA_INTERVIEW];
