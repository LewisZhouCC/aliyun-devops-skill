---
name: aliyun-devops
description: 当用户需要查询或操作阿里云云效 DevOps / Yunxiao 资源时使用，包括 Codeup 代码仓库、Flow 流水线、Projex 项目/工作项、AppStack 应用交付、制品仓库、测试管理、组织成员等。适用于用户提供 devops.aliyun.com 链接，或提到云效、Yunxiao、Codeup、Flow、Projex、AppStack、pipeline、流水线、合并请求、工作项、项目、发布单、部署单、测试用例等场景。不要用于普通阿里云 ECS/OSS/RDS/Kubernetes 问题，除非问题明确关联云效 DevOps。
---

# 阿里云 DevOps 技能

本技能提供与阿里云云效平台交互的完整能力，包含 177 个工具。

## 前置条件

```bash
export YUNXIAO_ACCESS_TOKEN="<token>"
# 可选：仅私有化/region 站点需要覆盖
export YUNXIAO_API_BASE_URL="https://openapi-rdc.aliyuncs.com"
export YUNXIAO_REGION_DEFAULT_ORG_ID="default"
```

**重要**: 环境变量只用于身份认证和运行环境配置。组织 ID、项目 ID、流水线 ID、仓库 ID、负责人 ID 等资源参数应来自用户请求、云效链接、CLI 查询结果或临时参数文件，不要作为全局环境变量固定下来。

获取令牌：云效控制台 → 个人设置 → 个人访问令牌

## 核心原则：优先使用 CLI 查询

**在查阅 references 文档之前，必须优先使用 CLI 帮助命令！**

CLI 位置：

- Claude Code：`${CLAUDE_SKILL_DIR}/scripts/yunxiao-cli/index.mjs`
- Codex：`${CODEX_HOME:-$HOME/.codex}/skills/aliyun-devops/scripts/yunxiao-cli/index.mjs`

示例命令里先设置一个兼容变量：

```bash
ALIYUN_DEVOPS_SKILL_DIR="${CLAUDE_SKILL_DIR:-${CODEX_HOME:-$HOME/.codex}/skills/aliyun-devops}"
```

### 快速查询命令

```bash
# 查看帮助
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" --help

# 列出所有工具
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" list

# 按类别筛选 (base/code/org/project/pipeline/packages/appstack/test)
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" list --category=pipeline

# 搜索工具
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" search branch

# 查看工具详情（包含完整参数说明）
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" tool create_branch
```

### 调用工具

```bash
# 调用工具（使用完整的 MCP 业务逻辑）
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call get_current_organization_info

# call 输出是 MCP envelope；业务 JSON 位于 content[].text 中。
# 提取当前 organizationId 时必须解包并校验，不能直接读取顶层字段。
org_result="$(node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call get_current_organization_info)"
organization_id="$(printf '%s' "$org_result" | jq -er '
  .content[] | select(.type == "text") | .text | fromjson | .lastOrganization
')"
test -n "$organization_id" && test "$organization_id" != "null"

# 带参数调用
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call create_branch '{"organizationId":"<organization-id>","repositoryId":"<repository-id>","branch":"feature/new"}'

# 关闭尚未合并的 MR（外部状态变更，必须先取得明确授权）
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call close_change_request '{"organizationId":"<organization-id>","repositoryId":"<repository-id>","localId":"<mr-local-id>"}'

# 复杂 JSON/Markdown 参数建议写入文件后再调用，避免 shell 引号转义问题
cat >/tmp/workitem.json <<'EOF'
{
  "organizationId": "<organization-id>",
  "spaceId": "<space-id>",
  "subject": "示例工作项",
  "workitemTypeId": "<workitem-type-id>",
  "formatType": "MARKDOWN",
  "description": "## 背景\n\n多行 Markdown 直接塞 shell 很容易炸引号。"
}
EOF
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call create_work_item @/tmp/workitem.json

# 直接调用 API
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" api GET /oapi/v1/organization/current
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" api POST /endpoint --data '{"key":"value"}'
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" api POST /endpoint --data @/tmp/payload.json

# 从 Projex 项目链接直接创建工作项（推荐用于 issue / task）
cat >/tmp/workitem.json <<'EOF'
{
  "subject": "示例工作项标题",
  "category": "Task",
  "assignedTo": "<user-id>",
  "formatType": "MARKDOWN",
  "description": "## 背景\n\n这里写多行 Markdown。"
}
EOF
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" create-work-item --dry-run https://devops.aliyun.com/projex/project/<project-id> @/tmp/workitem.json
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" create-work-item https://devops.aliyun.com/projex/project/<project-id> @/tmp/workitem.json
```

## 查询流程

1. **先用 CLI 查询** → `list`、`search`、`tool` 命令获取工具信息
2. **如果用户直接给的是云效链接或只说 Codeup / Projex / Flow** → 先根据链接路径手工路由到对应模块，再用 `search` / `tool` 查具体工具
3. **CLI 信息不足时** → 查阅 references/ 目录下的详细文档
4. **执行操作** → 优先使用 `call` 命令；遇到 wrapper 参数名与真实 API 不一致时，退回 `api` 命令

`call` 的标准输出是 MCP `CallToolResult`，不是业务对象本身。需要把一个调用的结果作为下一次调用参数时：

- 从 `.content[] | select(.type == "text") | .text | fromjson` 解包业务 JSON；
- 使用 `jq -e` 校验必需字段存在；
- 禁止把空字符串、`null` 或未解包的 envelope 字段作为 `organizationId`、`repositoryId`、`pipelineId` 等资源标识继续调用；
- 如果解包失败，先打印经过筛选的类型/字段结构用于诊断，不要把完整响应或敏感参数原样输出。

补充：

- 创建 Projex 工作项时，优先使用 `create-work-item`
- 这个命令会自动：
  - 从项目链接解析 `projectId`
  - 从当前 token 解析 `organizationId`
  - 按 `category` 自动查 `workitemTypeId`
- 默认 `category=Task`
- 如果 payload 已显式给出 `workitemTypeId`，则跳过类型自动解析

## 术语路由

- `Codeup`：代码管理，常见对象是仓库、分支、提交、合并请求（MR）
- `Projex`：项目管理，常见对象是项目、工作项、缺陷、迭代
- `Flow`：流水线，常见对象是 pipeline、run、job、日志
- `AppStack`：应用交付，常见对象是应用、发布单、变更单、阶段

用户经常会混着说“云效 / Codeup / 项目管理”。不要按词面硬判，优先看链接归属：

- `https://devops.aliyun.com/projex/project/...` → Projex 项目管理
- `.../codeup/.../repositories/...` → Codeup 代码管理
- `.../flow/.../pipelines/...` → Flow 流水线

### 流水线分组与跨环境安全

流水线名称和分组名称相同，不代表资源属于同一环境。修改现有流水线、分组或生产发布资源前：

1. 至少用两个独立标识确认归属，例如 GitOps 仓库加集群/Namespace，或源码仓库/稳定分支加生产域名。
2. 用 `get_pipeline` 对比线上定义与 owning repository 的版本化定义；生产变更前保存完整可恢复的线上定义和数值 ID。
3. 先用 `list_pipeline_groups`、`get_pipeline_group` 解析明确的数值分组 ID，再调用 `join_pipeline_group`。
4. API 返回成功不代表完成；变更后逐个 `get_pipeline`，确认 `groupId`、触发器和定义未发生非预期变化。
5. `groupId=0` 表示移出当前分组。环境归属不明确时停止修改，创建带环境限定名的新资源。

如果链接明确，优先按链接路由，而不是按用户口头提到的产品名路由。
当前 CLI 已提供 `inspect` 子命令；需要快速判断链接归属时，优先使用 `inspect`，再配合 `search` / `tool` 查具体工具。

## Codeup MR 安全规则

1. 创建 MR 默认使用 `createFrom=WEB`。只有调用方明确需要命令行来源语义时才使用 `COMMAND_LINE`；此时先用 `get_branch` 读取源分支当前完整 commit ID，并作为 `sourceCommitId` 传给 `create_change_request`。缺少该字段时不要发送请求。
2. “提交分支”“创建 MR”“提请审核”只授权创建 MR，不授权合并。即使目标是测试环境，也不能在创建成功后自动继续合并。
3. 只有用户明确要求合并当前 MR 时才执行合并。合并前重新读取 MR，确认目标分支、源提交、冲突状态、卡点状态和远端目标分支最新提交，避免使用创建时的旧状态。
4. 用户要求撤回时先区分状态：
   - 尚未合并：关闭 MR 或删除源分支，不改写目标分支。关闭时先用 `get_change_request` 确认 MR 尚未合并，再优先调用原生 `close_change_request`；不要手写 `api POST`。
   - 已经合并：默认从最新目标分支创建 revert 提交，再通过新的 MR 撤回，保留审计历史。
   - 只有用户明确要求“强制撤回/改写历史”时，才考虑将目标分支回退到合并前提交。执行前必须证明目标分支在待撤回提交之后没有其他提交，并使用绑定当前远端 SHA 的 `--force-with-lease`；条件不满足立即停止。
5. 创建、关闭、合并、revert、强制撤回是相互独立的外部状态变更。不要因为前一步获得授权而推断后续步骤也已获授权。

详细参数与示例见 [references/code-management.md](references/code-management.md)。

## 工作项常见坑

1. 下游同步或自动化系统可能只扫描部分工作项类型，例如 `Task` 和 `Bug`；但云效项目本身可能还支持 `Req`、`Online Fault` 等更多类型。不要默认所有类型都会被下游系统自动处理。
2. 查询工作项类型时：
   - `list_work_item_types` 需要 `projectId`
   - 并且很多项目还要求显式传 `category`（如 `Task` / `Bug`）
3. 创建工作项时：
   - `create_work_item` 使用 `spaceId`
   - 但某些后续查询接口使用的是 `projectId`
   - 两者在很多项目里值可能相同，但语义上不要混用
4. 创建 `Bug` 时，很多项目会要求额外必填字段，例如“严重程度”；如果接口提示字段不能为空，不要硬猜，优先先查项目字段配置或现有工作项样例。
5. `create_work_item` 走公开 OpenAPI 时，`customFieldValues` 需要传 **object**，不是前端页面常见的 `fieldValueList` 数组。
   - 正确示例：
     - `{\"priority\":\"<option-id>\",\"seriousLevel\":\"<option-id>\"}`
   - 常见排查顺序：
     1. `list_work_item_types` 确认当前项目的 `Bug` 类型 ID
     2. `get_work_item_type_field_config` 确认哪些字段 `required=true`
     3. 从字段配置里的 `options[].id` 取合法值，不要直接猜
6. 创建工作项或评论时，如果 `description` / `content` 是长 Markdown、多段中文、带反引号或引号，优先使用 `@json文件` 传参，不要把整段正文直接塞进 shell 单引号里。
7. 当 `call` 封装的参数名或行为与真实 API 不一致时，优先改用 `api` 直调并记录差异。
8. `create-work-item` 的 payload 至少需要：
   - `subject`
   - 可选 `category`：默认 `Task`，也可传 `Bug`
   - 其他字段（如 `assignedTo`、`description`、`formatType`、`customFieldValues`）会透传给 `create_work_item`
9. 创建父子关系：
   - 新建子工作项时，优先在 `create_work_item` 里直接传 `parentId`
   - 已存在工作项需要补父子关系时，使用 `create_work_item_relation_record`
   - 参数语义：`workItemId` 是当前工作项（通常是子任务），`relatedWorkItemId` 是要关联的目标工作项（如父需求），`relationType=PARENT`
   - 可用 `list_work_item_relation_records` 查询关系记录；如需撤销关系，用 `delete_work_item_relation_record`，参数同样传 `workItemId`、`relatedWorkItemId` 和 `relationType`
   - 已验证：通过官方 relationRecords API 创建 `PARENT` 关系后，子工作项的 `parentId` 和 `idPath` 会更新

```bash
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call create_work_item_relation_record '{
  "organizationId": "<organization-id>",
  "workItemId": "child-work-item-id",
  "relatedWorkItemId": "parent-work-item-id",
  "relationType": "PARENT"
}'

node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call list_work_item_relation_records '{
  "organizationId": "<organization-id>",
  "workItemId": "child-work-item-id",
  "relationType": "PARENT"
}'
```

## 安全注意

- CLI 默认不输出 debug 日志；只有在 `YUNXIAO_DEBUG=1` 或 `true` 时才输出
- 即使开启 debug，也不要暴露完整 `x-yunxiao-token`
- 如果需要展示请求头、URL 或错误上下文，应默认做 token 脱敏
- 不要通过 URL query string 传递 token；优先使用环境变量或请求头

## 功能模块参考

仅当 CLI 查询信息不足时查阅：

| 模块 | 参考文档 |
|------|----------|
| 代码管理 | [code-management.md](references/code-management.md) |
| 流水线 | [pipeline.md](references/pipeline.md) |
| 项目管理 | [project-management.md](references/project-management.md) |
| 组织管理 | [organization.md](references/organization.md) |
| 制品仓库 | [packages.md](references/packages.md) |
| 应用交付 | [appstack.md](references/appstack.md) |
| 测试管理 | [test-management.md](references/test-management.md) |

## API 基础信息

- **基础 URL**: `https://openapi-rdc.aliyuncs.com`
- **认证**: Header `x-yunxiao-token: <token>`
