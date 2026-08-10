# OpenAI 模型自定义输入开发文档

## 1. 需求

在研究配置页中：

- 当 AI Provider 为 OpenAI 时，将模型控件从固定下拉框改为模型 ID 文本输入框。
- Gemini 与 Claude 继续使用现有下拉框。
- OpenAI 默认值仍为 `gpt-4o-mini`，用户可直接覆盖。
- 编辑研究、生成后续研究或加载已有配置时，完整保留并显示原有 OpenAI 模型 ID。

本需求不提供“预设下拉 + Custom 选项”，也不引入 Combobox、自定义模式标记或特殊哨兵值。

## 2. 当前代码事实

### 2.1 当前限制位于前端控件

`src/components/StudySetup.tsx:895-914` 使用一个 `<select>` 处理全部 Provider：

- Gemini 读取 `GEMINI_MODELS`。
- Claude 读取 `CLAUDE_MODELS`。
- OpenAI 读取 `OPENAI_MODELS`。

OpenAI 当前只能从以下三个选项中选择：

- `gpt-4o-mini`
- `gpt-4o`
- `o4-mini`

定义位于 `src/types.ts:81-86`。

已有配置若包含列表外的 OpenAI 模型，`aiModel` state 能保存该值，但 `<select>` 中没有对应 `<option>`，因此控件无法正确呈现和编辑该模型，说明 UI 与现有数据能力不一致。

### 2.2 数据类型已经允许任意模型 ID

`StudyConfig.aiModel` 当前类型为可选 `string`：

```ts
aiModel?: string;
```

定义位于 `src/types.ts:101-123`，没有模型枚举或联合类型限制，不需要修改数据结构。

`StudySetup` 的 `buildConfig()` 会把 `aiModel` 原样写入 `StudyConfig`，见 `src/components/StudySetup.tsx:288-310`。

### 2.3 保存与传输链路没有模型白名单

现有链路均未校验模型是否属于 `OPENAI_MODELS`：

1. 新建研究：`src/app/api/studies/route.ts:58-96`
2. 更新研究：`src/app/api/studies/[id]/route.ts:83-133`
3. 生成参与链接：`src/app/api/generate-link/route.ts:57-92`
4. 编辑研究时恢复配置：`src/components/StudySetup.tsx:151-200`
5. 后续研究继承模型：`src/app/api/studies/[id]/generate-followup/route.ts:65-83`

非空自定义模型 ID 已能通过创建、更新、编辑、后续研究和参与链接链路传递，无需为本需求修改存储 API 或 Token 结构。

参与链接会把完整 `StudyConfig` 写入签名 Token。因此，已生成的链接继续使用生成链接时记录的模型；之后修改研究配置不会自动改变旧链接中的模型。

### 2.4 Provider 会透传研究模型

`getInterviewProvider()` 从 `studyConfig.aiModel` 读取模型并传给对应 Provider，见 `src/lib/providers/index.ts:20-51`。

`OpenAIProvider` 的模型解析顺序为：

1. `studyConfig.aiModel` 传入的非空值
2. `OPENAI_MODEL`
3. `AI_MODEL`
4. `DEFAULT_OPENAI_MODEL`

实现位于 `src/lib/providers/openai.ts:37-49`。

自定义模型实际用于：

- 访谈回复：`src/lib/providers/openai.ts:95-121`
- 访谈开场白：`src/lib/providers/openai.ts:142-150`

两处最终都调用：

```ts
this.client.chat.completions.create({
  model: this.model,
  // ...
});
```

### 2.5 自定义模型不控制综合分析模型

单份综合分析、汇总分析和后续研究生成没有使用 `studyConfig.aiModel`，而是固定使用 `OPENAI_SYNTHESIS_MODEL`。该常量当前为 `gpt-4o`，见 `src/types.ts:93-96`。

对应调用位于：

- 单份综合分析：`src/lib/providers/openai.ts:159-171`
- 汇总分析：`src/lib/providers/openai.ts:227-238`
- 后续研究生成：`src/lib/providers/openai.ts:306-332`

因此，本需求中的“自定义模型”准确含义是：**自定义 OpenAI Chat 访谈与开场白使用的模型 ID**，不改变综合分析模型策略。

### 2.6 OpenAI-compatible 端点的既有能力与限制

`OpenAIProvider` 支持通过服务端环境变量 `OPENAI_BASE_URL` 设置兼容端点，见 `src/lib/providers/openai.ts:42-44`。该配置是部署级配置，不是研究级配置，本需求不新增 Base URL 输入框。

兼容模型还必须支持当前代码使用的 Chat Completions 与命名 Tool Calling；仅兼容基础文本对话并不足以完成现有访谈流程，见 `src/lib/providers/openai.ts:114-121`。

## 3. 实现方案

### 3.1 改动文件

核心功能只需修改：

- `src/components/StudySetup.tsx`

不需要修改：

- `src/types.ts`
- `src/lib/providers/openai.ts`
- `src/lib/providers/index.ts`
- 研究创建与更新 API
- 参与链接 API
- Prompt 文件

`OPENAI_MODELS` 暂不删除。它可能仍被项目其他改动或后续 UI 使用；本需求只解除研究配置页对该列表的依赖，避免扩大改动范围。

### 3.2 控件分支

将 `src/components/StudySetup.tsx:895-914` 的统一 `<select>` 改为按 Provider 渲染：

```tsx
{aiProvider === 'openai' ? (
  <input
    type="text"
    value={aiModel}
    onChange={(e) => {
      setAiModel(e.target.value);
      setIsDirty(true);
    }}
    placeholder="例如：gpt-4o-mini"
    required
  />
) : (
  <select
    value={aiModel}
    onChange={(e) => {
      setAiModel(e.target.value);
      setIsDirty(true);
    }}
  >
    {(aiProvider === 'gemini' ? GEMINI_MODELS : CLAUDE_MODELS).map((model) => (
      <option key={model.id} value={model.id}>
        {model.label}
      </option>
    ))}
  </select>
)}
```

实际实现沿用现有 Tailwind 样式，保持控件高度、边框、焦点状态和页面布局一致。

OpenAI 输入框下显示明确说明：

> 输入 OpenAI Chat Completions API 支持的模型 ID。兼容端点由部署环境中的 OPENAI_BASE_URL 配置。

Gemini 与 Claude 继续显示当前模型描述。

### 3.3 不新增额外 state

纯文本输入不需要：

- `isCustomOpenAIModel`
- `CUSTOM_MODEL_OPTION_VALUE`
- `__custom__` 哨兵值
- 预设与自定义模式切换逻辑

`aiModel` 是唯一模型值来源，可直接覆盖初始化、编辑恢复、保存和 Provider 创建全链路。

### 3.4 默认值与 Provider 切换

保留当前行为：切换 Provider 时，将模型重置为目标 Provider 的默认值，见 `src/components/StudySetup.tsx:875-884`。

切换到 OpenAI 后，文本框显示：

```text
gpt-4o-mini
```

用户可直接修改。切换到其他 Provider 后再切回 OpenAI，会再次重置为 `gpt-4o-mini`，不会记忆本次尚未保存的 OpenAI 输入。这与现有 Provider 切换语义一致。

### 3.5 编辑与配置同步

现有代码已经直接恢复非空模型值：

- Prefill/Edit：`src/components/StudySetup.tsx:151-200`
- Store 配置同步：`src/components/StudySetup.tsx:202-218`

文本框直接绑定 `aiModel` 后，列表外模型无需任何模式判断即可正确显示。例如，已有配置中的：

```json
{
  "aiProvider": "openai",
  "aiModel": "gpt-4.1-mini"
}
```

会直接显示为 `gpt-4.1-mini`。

## 4. 输入规则

当前 `buildConfig()` 不会 trim 或校验 `aiModel`，现有表单有效性也只检查研究名称和研究问题，见 `src/components/StudySetup.tsx:473`。

为避免把空字符串或纯空格发送为模型 ID，本次实现应采用以下规则：

1. OpenAI 输入框为必填。
2. 有效性判断增加 `aiModel.trim()`。
3. 写入配置时对 OpenAI 模型执行 `trim()`。
4. Gemini 与 Claude 的模型值保持原样。

建议实现：

```ts
const normalizedAiModel = aiProvider === 'openai' ? aiModel.trim() : aiModel;
```

`buildConfig()` 写入 `normalizedAiModel`，表单有效性调整为：

```ts
const isValid =
  name.trim() &&
  researchQuestion.trim() &&
  (aiProvider !== 'openai' || aiModel.trim());
```

这样不会依赖 Provider 内部的环境变量回退，也不会把纯空格作为真实模型 ID 传给 OpenAI API。

## 5. 数据流

```text
用户在 OpenAI 模型输入框输入模型 ID
  → StudySetup.aiModel
  → trim 后写入 StudyConfig.aiModel
  → 创建或更新研究
  → 生成参与链接时写入签名 Token
  → getInterviewProvider(studyConfig)
  → new OpenAIProvider(studyConfig.aiModel, key)
  → 访谈与开场白调用 chat.completions.create({ model })
```

这条路径不依赖 `OPENAI_MODELS`。

## 6. 已发现但不属于本次 UI 改动的问题

以下问题来自当前代码，应如实记录，但不混入本次小范围 UI 修改。

### 6.1 Hosted/BYOK 模式未向 Provider 传递 OpenAI Key

`ResearcherContext` 已包含 `openaiApiKey`，但以下调用 `getInterviewProvider()` 的路由只传递了 Gemini 与 Anthropic Key：

- `src/app/api/interview/route.ts:76-80`
- `src/app/api/greeting/route.ts:41-45`
- `src/app/api/synthesis/route.ts:73-77`
- `src/app/api/synthesis/aggregate/route.ts:69-73`
- `src/app/api/studies/[id]/generate-followup/route.ts:53-57`

Hosted 模式下，Provider Factory 会因缺少 `openaiApiKey` 而向 `OpenAIProvider` 传入空字符串，随后构造函数抛出缺少 Key 的错误，见 `src/lib/providers/index.ts:33-45` 与 `src/lib/providers/openai.ts:37-41`。

因此：

- Standalone 模式可继续从 `OPENAI_API_KEY` 环境变量读取 Key。
- Hosted/BYOK 模式下，仅改模型输入框不能保证 OpenAI 流程可用。

该问题应单独修复和验证，不应在文档中描述为“后端已经完整可用”或“唯一缺口是 UI”。

### 6.2 Key 校验固定使用 `gpt-4o-mini`

OpenAI Key 校验接口固定请求 `gpt-4o-mini`，见 `src/app/api/onboarding/validate-ai-key/route.ts:85-100`。

如果 `OPENAI_BASE_URL` 指向的兼容端点只提供用户填写的自定义模型，而不提供 `gpt-4o-mini`，则可能出现：实际模型可用，但引导页 Key 校验失败。

该问题不影响模型 ID 的保存机制，但会影响兼容端点的完整使用体验，建议另立任务处理。

### 6.3 综合分析固定为 `gpt-4o`

兼容端点即使支持自定义访谈模型，也必须额外提供 `gpt-4o`，否则综合分析、汇总分析和后续研究生成会进入 Provider 的 fallback 返回路径。

如果产品目标是让一个自定义模型覆盖 OpenAI 全流程，则需另行调整综合分析模型策略；这超出“把 Chat 模型下拉框改为输入框”的范围。

## 7. 验收标准

### 7.1 UI

- 选择 OpenAI 后显示单个模型 ID 文本输入框，不显示 OpenAI 模型下拉框。
- 输入框默认值为 `gpt-4o-mini`。
- Gemini 与 Claude 仍显示原有模型下拉框和描述。
- 控件样式与现有表单一致。

### 7.2 数据

- 可输入 `gpt-4.1-mini` 等不在 `OPENAI_MODELS` 中的值。
- 输入前后空格会被移除。
- 空值或纯空格不能通过当前页面的提交、预览或保存入口。
- 保存后重新编辑研究，输入框显示原模型 ID。
- 后续研究正确继承父研究的非空自定义模型 ID。
- 新生成的参与链接携带自定义模型 ID。

### 7.3 回归

- OpenAI Provider 切换后默认值仍正确。
- Gemini 与 Claude 的默认模型、切换和保存行为不变。
- 研究创建、更新、预览和参与链接生成行为不变。

## 8. 验证方式

项目当前只有以下相关脚本：

```bash
npm run lint
npm run build
```

`package.json` 未配置 Jest、Vitest、Playwright 或 Cypress，也没有 `test` 脚本。因此本次验证包括：

1. 执行 `npm run lint`。
2. 执行 `npm run build`，完成 TypeScript 与 Next.js 构建检查。
3. 手工验证：
   - OpenAI 默认模型显示。
   - 任意模型 ID 输入与脏状态更新。
   - 空值和纯空格拦截。
   - Provider 来回切换。
   - 保存后重新编辑。
   - Preview 与新参与链接配置。
   - Gemini/Claude 下拉框回归。

Hosted/BYOK OpenAI 的端到端调用应在修复 `openaiApiKey` 传递问题后单独验收，不能仅凭本 UI 改动判定通过。
