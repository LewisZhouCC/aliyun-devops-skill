import { zodToJsonSchema } from 'zod-to-json-schema';
import * as types from '../common/types.js';
export const getTagTools = () => [
    {
        name: "create_tag",
        description: "[Tag Management] Create a tag",
        inputSchema: zodToJsonSchema(types.CreateTagSchema),
    },
    {
        name: "create_tag_group",
        description: "[Tag Management] Create a tag group",
        inputSchema: zodToJsonSchema(types.CreateTagGroupSchema),
    },
    {
        name: "list_tag_groups",
        description: "[Tag Management] Get a list of tag groups",
        inputSchema: zodToJsonSchema(types.BaseTagSchema),
    },
    {
        name: "delete_tag_group",
        description: "[Tag Management] Delete a tag group",
        inputSchema: zodToJsonSchema(types.DeleteTagGroupSchema),
    },
    {
        name: "update_tag_group",
        description: "[Tag Management] Update a tag group",
        inputSchema: zodToJsonSchema(types.UpdateTagGroupSchema),
    },
    {
        name: "get_tag_group",
        description: "[Tag Management] Get a tag group",
        inputSchema: zodToJsonSchema(types.GetTagGroupSchema),
    },
    {
        name: "delete_tag",
        description: "[Tag Management] Delete a tag",
        inputSchema: zodToJsonSchema(types.DeleteTagSchema),
    },
    {
        name: "update_tag",
        description: "[Tag Management] Update a tag",
        inputSchema: zodToJsonSchema(types.UpdateTagSchema),
    },
];
