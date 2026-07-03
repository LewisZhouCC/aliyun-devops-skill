import { zodToJsonSchema } from 'zod-to-json-schema';
import { CreateGlobalVarRequestSchema, GetGlobalVarRequestSchema, UpdateGlobalVarRequestSchema, ListGlobalVarsRequestSchema } from '../operations/appstack/globalVars.js';
// Export all appstack global variables tools
export const getAppStackGlobalVarTools = () => [
    {
        name: 'create_global_var',
        description: '[application delivery] Create a global variable group',
        inputSchema: zodToJsonSchema(CreateGlobalVarRequestSchema),
    },
    {
        name: 'get_global_var',
        description: '[application delivery] Get a global variable group',
        inputSchema: zodToJsonSchema(GetGlobalVarRequestSchema),
    },
    {
        name: 'update_global_var',
        description: '[application delivery] Update a global variable group',
        inputSchema: zodToJsonSchema(UpdateGlobalVarRequestSchema),
    },
    {
        name: 'list_global_vars',
        description: '[application delivery] List global variable groups',
        inputSchema: zodToJsonSchema(ListGlobalVarsRequestSchema),
    }
];
