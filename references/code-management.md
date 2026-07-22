# 代码管理 API 参考

## 目录
- [分支操作](#分支操作)
- [文件操作](#文件操作)
- [仓库操作](#仓库操作)
- [合并请求](#合并请求)
- [提交操作](#提交操作)

## 分支操作

### 创建分支
```
POST /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/branches?branch={branch}&ref={ref}
```
参数：
- `organizationId`: 组织 ID
- `repositoryId`: 仓库 ID（如 `123456` 或 `groupName%2FrepoName`）
- `branch`: 新分支名
- `ref`: 源分支或提交（默认 master）

### 获取分支
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/branches/{branchName}
```

### 删除分支
```
DELETE /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/branches/{branchName}
```

### 列出分支
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/branches
```
查询参数：
- `page`: 页码
- `perPage`: 每页数量
- `sort`: 排序（name_asc, name_desc, updated_asc, updated_desc）
- `search`: 搜索关键词

## 文件操作

### 获取文件内容
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/files/{filePath}/blobs
```
查询参数：
- `ref`: 分支或提交

### 创建文件
```
POST /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/files
```
请求体：
```json
{
  "filePath": "path/to/file.txt",
  "content": "文件内容（Base64）",
  "branch": "master",
  "commitMessage": "提交信息"
}
```

### 更新文件
```
PUT /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/files
```

### 删除文件
```
DELETE /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/files
```

### 列出文件树
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/files/tree
```

## 仓库操作

### 获取仓库信息
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}
```

### 列出仓库
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories
```
查询参数：
- `page`: 页码
- `perPage`: 每页数量
- `search`: 搜索关键词
- `orderBy`: 排序字段

## 合并请求

### 创建合并请求
```
POST /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests
```
请求体：
```json
{
  "sourceBranch": "feature-branch",
  "targetBranch": "master",
  "title": "合并请求标题",
  "description": "描述",
  "reviewerUserIds": ["user1", "user2"],
  "createFrom": "WEB"
}
```

`createFrom` 默认使用 `WEB`。如果必须使用 `COMMAND_LINE`，云效还要求提供源提交 ID：

```json
{
  "sourceBranch": "feature-branch",
  "targetBranch": "master",
  "title": "合并请求标题",
  "createFrom": "COMMAND_LINE",
  "sourceCommitId": "<full-source-commit-id>"
}
```

先通过 `get_branch` 获取 `sourceBranch` 当前完整 commit ID。缺少
`sourceCommitId` 时 CLI 会在请求发出前拒绝参数，避免平台返回
`source commit can not be null`。

### 合并与撤回边界

- 创建 MR 不代表授权合并。只有用户明确要求合并当前 MR 时才执行。
- 关闭 MR 也是独立的外部状态变更。只有用户明确要求关闭当前 MR 时才执行。
- 合并前重新查询 MR，检查目标分支、源提交、冲突状态和卡点状态。
- 已合并 MR 默认通过“revert 分支 + 新 MR”撤回，不直接改写目标分支历史。
- 只有用户明确要求强制撤回，并且确认待撤回提交之后没有其他提交时，才允许使用精确 lease：

```bash
git fetch origin
git log --format='%H %an %s' <parent>..origin/<target-branch>
git push \
  --force-with-lease=refs/heads/<target-branch>:<expected-current-sha> \
  origin \
  <parent>:refs/heads/<target-branch>
```

如果远端目标分支已经变化，`--force-with-lease` 必须失败；不要改用无 lease 的
`--force` 绕过保护。

### 关闭合并请求

接口合同以阿里云云效
[CloseChangeRequest 官方文档](https://help.aliyun.com/zh/yunxiao/developer-reference/closechangerequest-close-merge-request)
为准。

先使用 `get_change_request` 确认目标仓库、MR 局部 ID 和当前状态；仅当 MR 尚未
合并且用户明确授权关闭时，调用原生工具：

```bash
node "$ALIYUN_DEVOPS_SKILL_DIR/scripts/yunxiao-cli/index.mjs" call close_change_request '{
  "organizationId": "<organization-id>",
  "repositoryId": "<repository-id-or-encoded-full-path>",
  "localId": "<mr-local-id>"
}'
```

不要为关闭 MR 手写 `api POST`。原生工具会编码未编码的仓库完整路径、根据
`YUNXIAO_API_BASE_URL` 选择中心版或 Region 版路径，并校验返回值为
`{"result": true|false}`。Region 版可以省略 `organizationId`。

中心版：

```text
POST /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests/{localId}/close
```

Region 版：

```text
POST /oapi/v1/codeup/repositories/{repositoryId}/changeRequests/{localId}/close
```

### 获取合并请求
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests/{localId}
```

### 列出合并请求
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests
```
查询参数：
- `state`: 状态（opened, merged, closed）
- `page`, `perPage`: 分页
- `search`: 搜索

### 创建评论
```
POST /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests/{localId}/comments
```
请求体：
```json
{
  "commentType": "GLOBAL_COMMENT",
  "content": "评论内容"
}
```
评论类型：
- `GLOBAL_COMMENT`: 全局评论
- `INLINE_COMMENT`: 行内评论（需要 filePath, lineNumber）

### 列出评论
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/changeRequests/{localId}/comments
```

## 提交操作

### 列出提交
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/commits
```

### 获取提交详情
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/commits/{sha}
```

### 代码比较
```
GET /oapi/v1/codeup/organizations/{organizationId}/repositories/{repositoryId}/compare
```
查询参数：
- `from`: 源分支/提交
- `to`: 目标分支/提交

## 注意事项

1. **repositoryId 编码**: 如果仓库 ID 包含斜杠（如 `group/nested/repo`），需要 URL 编码为 `group%2Fnested%2Frepo`；原生工具可自动编码未编码的完整路径
2. **branchName 编码**: 如果分支名包含斜杠（如 `feature/xxx`），需要 URL 编码
3. **文件内容**: 创建/更新文件时，内容需要 Base64 编码
