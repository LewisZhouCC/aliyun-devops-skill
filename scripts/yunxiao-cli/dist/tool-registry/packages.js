import { zodToJsonSchema } from 'zod-to-json-schema';
import * as types from '../common/types.js';
export const getPackageManagementTools = () => [
    // Package Repository Operations
    {
        name: "list_package_repositories",
        description: "[Packages Management] List package repositories in an organization with filtering options",
        inputSchema: zodToJsonSchema(types.ListPackageRepositoriesSchema),
    },
    // Package Artifact Operations
    {
        name: "list_artifacts",
        description: "[Packages Management] List artifacts in a package repository with filtering options",
        inputSchema: zodToJsonSchema(types.ListArtifactsSchema),
    },
    {
        name: "get_artifact",
        description: "[Packages Management] Get information about a single artifact in a package repository",
        inputSchema: zodToJsonSchema(types.GetArtifactSchema),
    },
];
