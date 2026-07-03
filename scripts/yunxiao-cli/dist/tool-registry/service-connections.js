import { zodToJsonSchema } from 'zod-to-json-schema';
import * as types from '../common/types.js';
export const getServiceConnectionTools = () => [
    // Service Connection Operations
    {
        name: "list_service_connections",
        description: "[Service Connection Management] List service connections in an organization with filtering options",
        inputSchema: zodToJsonSchema(types.ListServiceConnectionsSchema),
    },
];
