import { zodToJsonSchema } from 'zod-to-json-schema';
import { ListDirectoriesRequestSchema, CreateTestcaseDirectoryRequestSchema, GetTestcaseFieldConfigRequestSchema, CreateTestcaseRequestSchema, SearchTestcasesRequestSchema, GetTestcaseRequestSchema, DeleteTestcaseRequestSchema, } from '../operations/testhub/testcases.js';
import { ListTestPlanRequestSchema, GetTestResultListRequestSchema, UpdateTestResultRequestSchema, } from '../operations/testhub/testplans.js';
// Export all test management tools
export const getTestManagementTools = () => [
    {
        name: 'list_testcase_directories',
        description: '[test management] 获取测试用例目录列表',
        inputSchema: zodToJsonSchema(ListDirectoriesRequestSchema),
    },
    {
        name: 'create_testcase_directory',
        description: '[test management] 创建测试用例目录',
        inputSchema: zodToJsonSchema(CreateTestcaseDirectoryRequestSchema),
    },
    {
        name: 'get_testcase_field_config',
        description: '[test management] 获取测试用例字段配置',
        inputSchema: zodToJsonSchema(GetTestcaseFieldConfigRequestSchema),
    },
    {
        name: 'create_testcase',
        description: '[test management] 创建测试用例',
        inputSchema: zodToJsonSchema(CreateTestcaseRequestSchema),
    },
    {
        name: 'search_testcases',
        description: '[test management] 搜索测试用例',
        inputSchema: zodToJsonSchema(SearchTestcasesRequestSchema),
    },
    {
        name: 'get_testcase',
        description: '[test management] 获取测试用例信息',
        inputSchema: zodToJsonSchema(GetTestcaseRequestSchema),
    },
    {
        name: 'delete_testcase',
        description: '[test management] 删除测试用例',
        inputSchema: zodToJsonSchema(DeleteTestcaseRequestSchema),
        annotations: {
            destructiveHint: true,
        },
    },
    {
        name: 'list_test_plans',
        description: '[test management] 获取测试计划列表',
        inputSchema: zodToJsonSchema(ListTestPlanRequestSchema),
    },
    {
        name: 'get_test_result_list',
        description: '[test management] 获取测试计划中测试用例列表',
        inputSchema: zodToJsonSchema(GetTestResultListRequestSchema),
    },
    {
        name: 'update_test_result',
        description: '[test management] 更新测试结果',
        inputSchema: zodToJsonSchema(UpdateTestResultRequestSchema),
    },
];
