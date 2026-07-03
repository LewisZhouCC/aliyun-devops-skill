#!/usr/bin/env node
/**
 * 云效 DevOps CLI - 基于 MCP Server 的完整工具
 *
 * 用法:
 *   yunxiao --help                    显示帮助
 *   yunxiao list                      列出所有工具
 *   yunxiao list --category code      按类别筛选
 *   yunxiao search <keyword>          搜索工具
 *   yunxiao tool <tool_name>          查看工具详情
 *   yunxiao call <tool_name> [json]   调用工具
 *   yunxiao api <method> <endpoint>   直接调用 API
 */

import { readFileSync } from 'node:fs';
import { getAllTools } from './dist/tool-registry/index.js';
import { handleToolRequest } from './dist/tool-handlers/index.js';
import { yunxiaoRequest } from './dist/common/utils.js';

// 类别映射
const CATEGORIES = {
  base: '基础工具',
  code: '代码管理',
  org: '组织管理',
  project: '项目管理',
  pipeline: '流水线',
  packages: '制品仓库',
  appstack: '应用交付',
  test: '测试管理'
};

const ALIAS_GUIDE = [
  {
    aliases: ['codeup', '代码库', '仓库', 'mr', 'merge request', '合并请求'],
    module: '代码管理',
    examples: ['get_repository', 'get_change_request', 'list_change_requests']
  },
  {
    aliases: ['projex', '项目', '工作项', '需求', '缺陷', '迭代', 'sprint'],
    module: '项目管理',
    examples: ['get_project', 'search_workitems', 'list_sprints']
  },
  {
    aliases: ['flow', 'pipeline', '流水线', '构建', '发布流水线'],
    module: '流水线',
    examples: ['get_pipeline', 'list_pipeline_runs', 'get_pipeline_job_run_log']
  },
  {
    aliases: ['appstack', '应用交付', '发布单', '变更单', 'release'],
    module: '应用交付',
    examples: ['create_appstack_change_request', 'list_appstack_change_requests']
  }
];

// 根据工具名和描述判断类别
function getCategory(name, desc) {
  const d = (desc || '').toLowerCase();
  const n = name.toLowerCase();

  if (d.includes('[code management]') || /branch|file|repository|change_request|commit/.test(n)) return 'code';
  if (d.includes('[pipeline') || /pipeline|service_connection|vm_deploy/.test(n)) return 'pipeline';
  if (d.includes('[project') || /workitem|sprint|effort/.test(n)) return 'project';
  if (/organization|member|department/.test(n)) return 'org';
  if (/package|artifact/.test(n)) return 'packages';
  if (/appstack|application|change_order|orchestration|variable_group|release/.test(n)) return 'appstack';
  if (/test/.test(n)) return 'test';
  return 'base';
}

// 格式化参数信息
function formatParams(schema) {
  const props = schema?.properties || {};
  const required = schema?.required || [];
  const lines = [];

  for (const [name, prop] of Object.entries(props)) {
    const req = required.includes(name) ? '*' : ' ';
    let type = prop.type || 'any';
    // Handle array types (e.g., ['string', 'null'] from z.string().nullable())
    if (Array.isArray(type)) {
      type = type.join(' | ');
    } else if (typeof type === 'object') {
      type = 'object';
    }
    const enumVals = prop.enum ? ` [${prop.enum.join('|')}]` : '';
    let desc = (prop.description || '').substring(0, 55);
    if ((prop.description || '').length > 55) desc += '...';
    lines.push(`  ${req} ${name.padEnd(28)} (${String(type).padEnd(8)})${enumVals} ${desc}`);
  }

  return lines;
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

function loadJsonArgument(input) {
  if (!input) {
    return {};
  }

  const raw = input.startsWith('@')
    ? readFileSync(input.slice(1), 'utf8')
    : input;

  return JSON.parse(raw);
}

function parseToolTextResult(result) {
  const text = result?.content?.find(item => item.type === 'text')?.text;
  if (!text) {
    throw new Error('工具返回结果中缺少 text content');
  }
  return JSON.parse(text);
}

async function getCurrentOrganizationId() {
  const userInfo = await yunxiaoRequest('/oapi/v1/platform/user', { method: 'GET' });
  if (!userInfo?.lastOrganization) {
    throw new Error('无法从当前登录态获取 organizationId，请先确认 YUNXIAO_ACCESS_TOKEN 是否可用');
  }
  return userInfo.lastOrganization;
}

function parseDevopsResource(input) {
  const raw = (input || '').trim();
  if (!raw) return null;

  const parsedJson = parseJsonSafe(raw);
  if (parsedJson && typeof parsedJson === 'object' && parsedJson.url) {
    return parseDevopsResource(parsedJson.url);
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (!/aliyun\.com$/.test(url.hostname)) {
    return null;
  }

  const path = url.pathname.replace(/\/+$/, '');
  const projexProject = path.match(/\/projex\/project\/([^/]+)$/);
  if (projexProject) {
    return {
      kind: 'projex-project',
      module: '项目管理',
      tool: 'get_project',
      label: 'Projex 项目',
      args: ({ organizationId }) => ({ organizationId, id: projexProject[1] })
    };
  }

  const changeRequest = path.match(/\/codeup\/.*\/repositories\/([^/]+)\/(?:changeRequests|mergeRequests)\/([^/]+)$/i);
  if (changeRequest) {
    return {
      kind: 'codeup-change-request',
      module: '代码管理',
      tool: 'get_change_request',
      label: 'Codeup 合并请求',
      args: ({ organizationId }) => ({
        organizationId,
        repositoryId: decodeURIComponent(changeRequest[1]),
        localId: decodeURIComponent(changeRequest[2])
      })
    };
  }

  const repository = path.match(/\/codeup\/.*\/repositories\/([^/]+)$/i);
  if (repository) {
    return {
      kind: 'codeup-repository',
      module: '代码管理',
      tool: 'get_repository',
      label: 'Codeup 仓库',
      args: ({ organizationId }) => ({
        organizationId,
        repositoryId: decodeURIComponent(repository[1])
      })
    };
  }

  const pipeline = path.match(/\/flow\/.*\/pipelines\/([^/]+)$/i);
  if (pipeline) {
    return {
      kind: 'flow-pipeline',
      module: '流水线',
      tool: 'get_pipeline',
      label: 'Flow 流水线',
      args: ({ organizationId }) => ({
        organizationId,
        pipelineId: decodeURIComponent(pipeline[1])
      })
    };
  }

  return {
    kind: 'unknown-devops-url',
    module: '未知',
    label: '云效链接',
    url: raw
  };
}

function printAliasGuide(keyword) {
  const normalized = (keyword || '').trim().toLowerCase();
  const matches = normalized
    ? ALIAS_GUIDE.filter(item => item.aliases.some(alias => alias.toLowerCase().includes(normalized)))
    : ALIAS_GUIDE;

  const items = matches.length > 0 ? matches : ALIAS_GUIDE;
  console.log('云效术语路由参考:\n');
  for (const item of items) {
    console.log(`  ${item.module}`);
    console.log(`    常见说法: ${item.aliases.join(' / ')}`);
    console.log(`    常用工具: ${item.examples.join(', ')}\n`);
  }
}

async function executeTool(toolName, args) {
  const request = {
    params: {
      name: toolName,
      arguments: args
    }
  };
  return handleToolRequest(request);
}

async function resolveProjexProject(target, organizationId) {
  const resource = parseDevopsResource(target);
  if (resource?.kind === 'projex-project') {
    const result = await executeTool('get_project', resource.args({ organizationId }));
    return parseToolTextResult(result);
  }

  const result = await executeTool('get_project', { organizationId, id: target });
  return parseToolTextResult(result);
}

async function resolveWorkItemTypeId(organizationId, projectId, category) {
  const result = await executeTool('list_work_item_types', {
    organizationId,
    projectId,
    category
  });
  const types = parseToolTextResult(result);
  if (!Array.isArray(types) || types.length === 0) {
    throw new Error(`项目 ${projectId} 下未找到 category=${category} 的工作项类型`);
  }
  const preferred = types.find(item => item.defaultType) || types[0];
  if (!preferred?.id) {
    throw new Error(`项目 ${projectId} 的工作项类型缺少 id`);
  }
  return preferred.id;
}

// 命令: list
function cmdList(args) {
  const tools = getAllTools();
  const categoryFilter = args[0]?.replace('--category=', '').replace('-c=', '');

  const grouped = {};
  for (const tool of tools) {
    const cat = getCategory(tool.name, tool.description);
    if (categoryFilter && cat !== categoryFilter) continue;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(tool);
  }

  let total = 0;
  for (const cat of ['base', 'code', 'org', 'project', 'pipeline', 'packages', 'appstack', 'test']) {
    if (!grouped[cat]) continue;
    const catTools = grouped[cat];
    total += catTools.length;
    console.log(`\n=== ${CATEGORIES[cat] || cat} (${catTools.length}) ===`);
    for (const t of catTools) {
      let desc = (t.description || '').substring(0, 55);
      if ((t.description || '').length > 55) desc += '...';
      console.log(`  ${t.name.padEnd(42)} ${desc}`);
    }
  }
  console.log(`\n共 ${total} 个工具`);
}

// 命令: search
function cmdSearch(keyword) {
  if (!keyword) {
    console.log('用法: yunxiao search <关键词>');
    return;
  }

  const tools = getAllTools();
  const kw = keyword.toLowerCase();
  const results = tools.filter(t =>
    t.name.toLowerCase().includes(kw) ||
    (t.description || '').toLowerCase().includes(kw)
  );

  if (results.length === 0) {
    console.log(`未找到匹配 '${keyword}' 的工具`);
    return;
  }

  console.log(`找到 ${results.length} 个匹配的工具:\n`);
  for (const t of results) {
    const cat = getCategory(t.name, t.description);
    console.log(`  [${CATEGORIES[cat] || cat}] ${t.name}`);
    let desc = (t.description || '').substring(0, 75);
    if ((t.description || '').length > 75) desc += '...';
    console.log(`    ${desc}\n`);
  }
}

// 命令: tool
function cmdTool(toolName) {
  if (!toolName) {
    console.log('用法: yunxiao tool <工具名>');
    return;
  }

  const tools = getAllTools();
  const tool = tools.find(t => t.name === toolName);

  if (!tool) {
    console.log(`未找到工具: ${toolName}`);
    const similar = tools.filter(t => t.name.toLowerCase().includes(toolName.toLowerCase()));
    if (similar.length > 0) {
      console.log(`你是否在找: ${similar.slice(0, 5).map(t => t.name).join(', ')}`);
    }
    return;
  }

  const cat = getCategory(tool.name, tool.description);
  console.log(`工具: ${tool.name}`);
  console.log(`类别: ${CATEGORIES[cat] || cat}`);
  console.log(`\n描述:`);
  console.log(`  ${tool.description || '无'}`);

  const paramLines = formatParams(tool.inputSchema);
  if (paramLines.length > 0) {
    console.log(`\n参数:`);
    for (const line of paramLines) {
      console.log(line);
    }
    console.log(`\n  * 表示必填参数`);
  }
}

// 命令: call
async function cmdCall(toolName, argsJson) {
  if (!toolName) {
    console.log('用法: yunxiao call <工具名> [参数JSON|@参数文件]');
    return;
  }

  const tools = getAllTools();
  const tool = tools.find(t => t.name === toolName);

  if (!tool) {
    console.log(`未找到工具: ${toolName}`);
    return;
  }

  let args = {};
  if (argsJson) {
    try {
      args = loadJsonArgument(argsJson);
    } catch (e) {
      console.error(`JSON 解析错误: ${e.message}`);
      return;
    }
  }

  try {
    const result = await executeTool(toolName, args);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`调用失败: ${e.message}`);
  }
}

// 命令: api
async function cmdApi(method, endpoint, options) {
  if (!method || !endpoint) {
    console.log('用法: yunxiao api <GET|POST|PUT|DELETE> <端点> [--data JSON|@数据文件]');
    return;
  }

  let data = null;
  const dataIdx = options.indexOf('--data');
  if (dataIdx !== -1 && options[dataIdx + 1]) {
    try {
      data = loadJsonArgument(options[dataIdx + 1]);
    } catch (e) {
      console.error(`JSON 解析错误: ${e.message}`);
      return;
    }
  }

  try {
    const result = await yunxiaoRequest(endpoint, {
      method: method.toUpperCase(),
      body: data
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`API 调用失败: ${e.message}`);
  }
}

async function cmdInspect(input) {
  const inspectArgs = Array.isArray(input) ? input : [input];
  const dryRun = inspectArgs.includes('--dry-run');
  const target = inspectArgs.find(arg => arg && !arg.startsWith('--'));

  if (!target) {
    console.log('用法: yunxiao inspect [--dry-run] <云效链接|术语>');
    console.log('示例: yunxiao inspect https://devops.aliyun.com/projex/project/xxxx');
    console.log('示例: yunxiao inspect --dry-run codeup');
    return;
  }

  const resource = parseDevopsResource(target);
  if (!resource) {
    console.log(`未识别为云效链接，改为按术语解释: ${target}\n`);
    printAliasGuide(target);
    return;
  }

  if (resource.kind === 'unknown-devops-url') {
    console.log(`识别到云效链接，但暂未内建该页面的自动路由: ${resource.url}\n`);
    printAliasGuide();
    console.log('建议先根据页面归属模块，使用对应的 search/tool/call 命令继续查询。');
    return;
  }

  try {
    const organizationId = await getCurrentOrganizationId();
    const args = resource.args({ organizationId });
    console.log(`识别结果: ${resource.label}`);
    console.log(`归属模块: ${resource.module}`);
    console.log(`推荐工具: ${resource.tool}`);
    console.log(`调用参数: ${JSON.stringify(args, null, 2)}\n`);
    if (dryRun) {
      console.log('dry-run 模式：仅展示路由结果和推荐调用参数，未实际请求云效 API。');
      return;
    }
    const result = await executeTool(resource.tool, args);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`自动解析失败: ${e.message}`);
  }
}

async function cmdCreateWorkItem(args) {
  const createArgs = Array.isArray(args) ? args : [args];
  const dryRun = createArgs.includes('--dry-run');
  const target = createArgs.find(arg => arg && !arg.startsWith('--'));
  const payloadArg = createArgs.find((arg, index) => {
    if (!arg || arg.startsWith('--')) return false;
    return createArgs.findIndex(item => item === target) !== index;
  });

  if (!target) {
    console.log('用法: yunxiao create-work-item [--dry-run] <Projex项目链接|projectId> <JSON|@file>');
    console.log('示例: yunxiao create-work-item https://devops.aliyun.com/projex/project/xxxx @/tmp/workitem.json');
    return;
  }

  let payload = {};
  if (payloadArg) {
    try {
      payload = loadJsonArgument(payloadArg);
    } catch (e) {
      console.error(`JSON 解析错误: ${e.message}`);
      return;
    }
  }

  if (!payload.subject) {
    console.error('create-work-item 需要 payload.subject');
    return;
  }

  try {
    const organizationId = payload.organizationId || await getCurrentOrganizationId();
    const project = await resolveProjexProject(target, organizationId);
    const category = payload.category || 'Task';
    const workitemTypeId = payload.workitemTypeId || await resolveWorkItemTypeId(organizationId, project.id, category);
    const createPayload = {
      organizationId,
      spaceId: payload.spaceId || project.id,
      subject: payload.subject,
      workitemTypeId,
      assignedTo: payload.assignedTo,
      customFieldValues: payload.customFieldValues,
      description: payload.description,
      formatType: payload.formatType,
      labels: payload.labels,
      parentId: payload.parentId,
      participants: payload.participants,
      sprint: payload.sprint,
      trackers: payload.trackers,
      verifier: payload.verifier,
      versions: payload.versions
    };

    Object.keys(createPayload).forEach(key => createPayload[key] === undefined && delete createPayload[key]);

    console.log(`目标项目: ${project.name} (${project.id})`);
    console.log(`工作项类型: ${category} -> ${workitemTypeId}`);
    console.log(`创建参数: ${JSON.stringify(createPayload, null, 2)}\n`);

    if (dryRun) {
      console.log('dry-run 模式：仅展示解析结果和创建参数，未实际创建工作项。');
      return;
    }

    const result = await executeTool('create_work_item', createPayload);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`创建工作项失败: ${e.message}`);
  }
}

// 显示帮助
function showHelp() {
  console.log(`
云效 DevOps CLI - 基于 MCP Server 的完整工具

用法:
  yunxiao <命令> [选项]

命令:
  list [--category=<cat>]     列出工具 (类别: base,code,org,project,pipeline,packages,appstack,test)
  search <关键词>             搜索工具
  tool <工具名>               查看工具详情和参数
  inspect <链接|术语>         识别云效链接归属并自动调用常见查询
                              可加 --dry-run 只做路由判断
  create-work-item            从 Projex 链接/项目ID + JSON 直接创建工作项
  call <工具名> [JSON|@file]  调用工具 (使用完整的 MCP 业务逻辑)
  api <方法> <端点> [选项]    直接调用 API

示例:
  yunxiao list                          列出所有工具
  yunxiao list --category=pipeline      列出流水线工具
  yunxiao search branch                 搜索包含 branch 的工具
  yunxiao tool create_branch            查看 create_branch 详情
  yunxiao inspect codeup                查看 codeup / projex / flow 的术语路由
  yunxiao inspect --dry-run https://devops.aliyun.com/projex/project/xxxx
  yunxiao inspect https://devops.aliyun.com/projex/project/xxxx
  yunxiao create-work-item --dry-run https://devops.aliyun.com/projex/project/xxxx @/tmp/workitem.json
  yunxiao call get_current_organization_info
  yunxiao call create_work_item @/tmp/workitem.json
  yunxiao api GET /oapi/v1/organization/current
  yunxiao api POST /oapi/v1/example --data @/tmp/payload.json

环境变量:
  YUNXIAO_ACCESS_TOKEN        云效个人访问令牌 (必需)
  YUNXIAO_API_BASE_URL        API 基础 URL (可选)
  YUNXIAO_DEBUG               设为 1/true 时输出调试日志
`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    showHelp();
    return;
  }

  switch (cmd) {
    case 'list':
      cmdList(args.slice(1));
      break;
    case 'search':
      cmdSearch(args[1]);
      break;
    case 'tool':
      cmdTool(args[1]);
      break;
    case 'inspect':
      await cmdInspect(args.slice(1));
      break;
    case 'create-work-item':
      await cmdCreateWorkItem(args.slice(1));
      break;
    case 'call':
      await cmdCall(args[1], args[2]);
      break;
    case 'api':
      await cmdApi(args[1], args[2], args.slice(3));
      break;
    default:
      console.log(`未知命令: ${cmd}`);
      showHelp();
  }
}

main().catch(e => {
  console.error(`错误: ${e.message}`);
  process.exit(1);
});
