import { zodToJsonSchema } from 'zod-to-json-schema';
import { ListCommitsRequestSchema, GetCommitRequestSchema, CreateCommitCommentRequestSchema } from '../common/types.js';
// Export all commit tools
export const getCommitTools = () => [
    {
        name: 'list_commits',
        description: '[Code Management] List commits in a Codeup repository',
        inputSchema: zodToJsonSchema(ListCommitsRequestSchema),
    },
    {
        name: 'get_commit',
        description: '[Code Management] Get information about a commit',
        inputSchema: zodToJsonSchema(GetCommitRequestSchema),
    },
    {
        name: 'create_commit_comment',
        description: '[Code Management] Create a comment on a commit',
        inputSchema: zodToJsonSchema(CreateCommitCommentRequestSchema),
    }
];
