import { zodToJsonSchema } from 'zod-to-json-schema';
import { GetEnvVariableGroupsRequestSchema, CreateVariableGroupRequestSchema, DeleteVariableGroupRequestSchema, GetVariableGroupRequestSchema, UpdateVariableGroupRequestSchema, GetAppVariableGroupsRequestSchema, GetAppVariableGroupsRevisionRequestSchema } from '../operations/appstack/variableGroups.js';
// Export all appstack variable groups tools
export const getAppStackVariableGroupTools = () => [
    {
        name: 'get_env_variable_groups',
        description: '[application delivery] Get variable groups for an environment',
        inputSchema: zodToJsonSchema(GetEnvVariableGroupsRequestSchema),
    },
    {
        name: 'create_variable_group',
        description: '[application delivery] Create a variable group',
        inputSchema: zodToJsonSchema(CreateVariableGroupRequestSchema),
    },
    {
        name: 'delete_variable_group',
        description: '[application delivery] Delete a variable group',
        inputSchema: zodToJsonSchema(DeleteVariableGroupRequestSchema),
    },
    {
        name: 'get_variable_group',
        description: '[application delivery] Get a variable group',
        inputSchema: zodToJsonSchema(GetVariableGroupRequestSchema),
    },
    {
        name: 'update_variable_group',
        description: '[application delivery] Update a variable group',
        inputSchema: zodToJsonSchema(UpdateVariableGroupRequestSchema),
    },
    {
        name: 'get_app_variable_groups',
        description: '[application delivery] Get variable groups for an application',
        inputSchema: zodToJsonSchema(GetAppVariableGroupsRequestSchema),
    },
    {
        name: 'get_app_variable_groups_revision',
        description: '[application delivery] Get the revision of variable groups for an application',
        inputSchema: zodToJsonSchema(GetAppVariableGroupsRevisionRequestSchema),
    }
];
