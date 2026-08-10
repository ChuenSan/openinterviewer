# 简体中文本地化开发方案

## 目标

将 OpenInterviewer 的默认产品体验完整切换为简体中文，包括研究者界面、参与者界面、AI 访谈与分析提示词、演示数据及页面元信息。

本次改动是单语言汉化，不新增语言切换、locale 路由或 i18n 依赖。

## 原则

- 只翻译产品内置文案，不修改用户已保存或自行输入的内容。
- 保留 API 字段名、TypeScript 类型、结构化输出键、模型 ID、环境变量名和路由不变。
- 保持 AI 结构化响应协议不变，仅将自然语言指令和兜底文案改为中文。
- 不改变业务流程、数据结构、权限与部署行为。
- 术语在所有界面和提示词中保持一致。

## 术语表

| 英文 | 中文 |
| --- | --- |
| Study | 研究 |
| Research Question | 研究问题 |
| Core Questions | 核心问题 |
| Topic Areas | 主题领域 |
| Participant | 参与者 |
| Participant Profile | 参与者画像 |
| Interview | 访谈 |
| Transcript | 访谈记录 |
| Consent | 知情同意 |
| Synthesis | 综合分析 |
| Aggregate Synthesis | 汇总分析 |
| Stated Preferences | 明示偏好 |
| Revealed Preferences | 潜在偏好 |
| Themes | 主题 |
| Contradictions | 矛盾点 |
| Key Insights | 关键洞察 |
| Follow-up Study | 后续研究 |
| Dashboard | 仪表盘 |
| Settings | 设置 |
| Export | 导出 |
| Preview | 预览 |
| Standard | 标准 |
| Structured | 结构化 |
| Exploratory | 探索式 |

产品名 OpenInterviewer、AI 服务商名称、模型名称和技术名词不翻译。

## 改动范围

### 1. 页面元信息

文件：`src/app/layout.tsx`

- 页面标题和描述改为中文。
- `<html lang="en">` 改为 `<html lang="zh-CN">`。

### 2. 研究者端界面

主要文件：

- `src/components/Login.tsx`
- `src/components/Onboarding.tsx`
- `src/components/Settings.tsx`
- `src/components/StudyList.tsx`
- `src/components/StudySetup.tsx`
- `src/components/StudyDetail.tsx`
- `src/components/Dashboard.tsx`
- `src/components/InterviewDetail.tsx`
- `src/components/Synthesis.tsx`
- `src/components/Export.tsx`

翻译范围：

- 标题、说明、按钮、标签、占位符和选项描述。
- 加载、空状态、成功、失败、确认和校验提示。
- 日期、数量和进度附近的固定文案。
- 设置与引导流程中的 API、存储和部署说明。

不翻译：

- 服务商名、模型 ID、API Key、URL 和环境变量。
- 用户填写的研究名称、研究问题、核心问题、主题及画像字段。
- 已保存的访谈和分析内容。

### 3. 参与者端界面

主要文件：

- `src/components/Consent.tsx`
- `src/components/InterviewChat.tsx`
- `src/components/PreviewBanner.tsx`
- `src/app/p/[token]/page.tsx`

翻译知情同意、访谈输入、发送、完成、预览、加载和异常状态。研究者自定义的知情同意文本保持原样。

### 4. AI 提示词

主要文件：

- `src/lib/prompts/interview.ts`
- `src/lib/prompts/greeting.ts`
- `src/lib/prompts/synthesis.ts`
- `src/lib/ai.ts` 中面向用户的兜底响应

要求：

- 明确要求 AI 使用简体中文访谈和分析。
- 研究者输入的原始内容原样注入提示词，不自动翻译。
- 保留 JSON 字段名及响应结构，避免影响现有解析代码。
- 保留 schema、枚举值以及供应商结构化输出配置。
- 将自然语言示例值改为中文，但不得修改机器读取的键。

### 5. 演示数据

文件：`src/lib/demoData.ts`

汉化以下预置内容：

- 演示研究名称、描述、研究问题、核心问题和主题领域。
- 画像字段标签、提取提示和选项值。
- 知情同意文本。
- 三组参与者画像、访谈记录、行为数据和单次分析。
- 汇总分析及后续研究示例。

保持所有 ID、时间戳、状态值、对象结构和引用关系不变。

### 6. 其他固定文案

完成主要文件后，对 `src/app`、`src/components` 和 `src/lib` 做残留英文检查。只处理面向用户或模型的自然语言，不修改代码标识符、日志协议、第三方错误原文和技术常量。

## 实施顺序

1. 建立并统一术语。
2. 汉化页面元信息和研究者端界面。
3. 汉化参与者端界面。
4. 汉化 AI 提示词与兜底响应。
5. 汉化演示数据。
6. 搜索残留英文并按范围复核。
7. 执行静态检查和生产构建。
8. 手动检查关键流程。

## 验收标准

### 静态验收

- `bun run lint` 通过。
- `bun run build` 通过。
- TypeScript 类型、结构化输出 schema 和数据模型没有因翻译发生变化。
- 面向用户的主要页面无明显英文固定文案残留。

### 手动验收

#### 研究者流程

1. 登录页面与错误提示为中文。
2. 首次引导和设置页面为中文。
3. 新建、编辑、保存和查看研究的完整流程为中文。
4. 研究列表、研究详情、访谈详情、分析和导出页面为中文。
5. 加载演示数据后，研究、访谈及分析内容均为中文。

#### 参与者流程

1. 打开分享链接后，加载和错误状态为中文。
2. 知情同意页面及预览横幅为中文。
3. AI 使用简体中文开场、追问和结束访谈。
4. 输入、发送、完成及异常提示为中文。

#### 数据兼容性

1. 新建研究仍能正常保存、编辑和生成分享链接。
2. 访谈结果仍能完成单次与汇总分析。
3. AI 返回的 JSON 仍可被现有代码解析。
4. 用户输入和历史数据不会被自动翻译或改写。

## 风险与控制

### 结构化输出被误改

风险：翻译 JSON 键或枚举值会导致解析失败。

控制：只翻译提示词的自然语言，保留所有 schema、字段名和程序状态值。

### 术语不一致

风险：同一概念在不同页面出现多种译法。

控制：以本文术语表为准，完成后全局复核高频术语。

### 模板字符串损坏

风险：提示词中的反引号、插值表达式或引号在翻译时被破坏。

控制：逐文件检查模板边界，并通过生产构建验证。

### 演示数据引用失配

风险：修改主题名称后，行为数据中的主题键和列表不一致。

控制：同一主题在研究配置、`timePerTopic`、`messagesPerTopic` 和 `topicsExplored` 中同步更新，保留 ID 不变。

### 第三方内容误翻译

风险：模型 ID、API 名称或用户内容被改写后失效。

控制：仅处理确定属于产品内置文案的字符串。

## 不在本次范围

- 中英文切换和语言偏好存储。
- locale 路由、翻译字典、翻译平台或 i18n 框架。
- 自动翻译已有研究、访谈和分析数据。
- 修改 API 数据结构或新增语言字段。
- 与汉化无关的功能修复、UI 重构和样式调整。
