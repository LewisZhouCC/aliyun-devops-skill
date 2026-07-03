/**
 * 项目（Project）相关操作
 *
 * 概念说明：
 * - 项目（Project）是云效平台中的项目管理单元，包含工作项、迭代等管理概念
 * - 项目与代码库（Repository）是不同的概念，代码库属于CodeUp产品，用于代码管理
 * - 一个项目可以关联多个代码库，但两者是不同的资源类型
 */
import { yunxiaoRequest, isRegionEdition } from "../../common/utils.js";
import { resolveOrganizationId } from "../organization/organization.js";
import { ProjectInfoSchema } from "./types.js";
// Re-export SearchProgramsSchema for use in handlers
export { SearchProgramsSchema } from "./types.js";
/**
 * 获取项目详情
 * @param organizationId
 * @param id
 */
export async function getProjectFunc(organizationId, id) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${id}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${id}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return ProjectInfoSchema.parse(response);
}
/**
 * 搜索项目
 * @param organizationId
 * @param name
 * @param status
 * @param createdAfter
 * @param createdBefore
 * @param creator
 * @param adminUserId
 * @param logicalStatus
 * @param advancedConditions
 * @param extraConditions
 * @param orderBy
 * @param page
 * @param perPage
 * @param sort
 * @param scenarioFilter
 * @param userId
 */
export async function searchProjectsFunc(organizationId, name, status, createdAfter, createdBefore, creator, adminUserId, // Project administrator user ID
logicalStatus, advancedConditions, extraConditions, // Should be constructed using buildExtraConditions for common filters
orderBy, // Possible values: "gmtCreate", "name"
page, perPage, sort, // Possible values: "desc", "asc"
scenarioFilter, // Common project filter scenarios
userId // User ID to use with scenarioFilter
) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects:search`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects:search`;
    const payload = {};
    if (scenarioFilter && userId) {
        extraConditions = buildExtraConditions(scenarioFilter, userId);
    }
    const conditions = buildProjectConditions({
        name,
        status,
        createdAfter,
        createdBefore,
        creator,
        adminUserId,
        logicalStatus,
        advancedConditions
    });
    if (conditions) {
        payload.conditions = conditions;
    }
    if (extraConditions) {
        payload.extraConditions = extraConditions;
    }
    if (orderBy) {
        payload.orderBy = orderBy;
    }
    if (page !== undefined) {
        payload.page = page;
    }
    if (perPage !== undefined) {
        payload.perPage = perPage;
    }
    if (sort) {
        payload.sort = sort;
    }
    const response = await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
    if (!Array.isArray(response)) {
        return [];
    }
    return response.map(project => ProjectInfoSchema.parse(project));
}
/**
 * 搜索项目集
 * @param organizationId
 * @param name
 * @param status
 * @param gmtCreateStart
 * @param gmtCreateEnd
 * @param creator
 * @param users
 * @param orderBy
 * @param page
 * @param perPage
 * @param sort
 */
export async function searchProgramsFunc(organizationId, name, status, gmtCreateStart, gmtCreateEnd, creator, users, orderBy, page, perPage, sort) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/programs:search`
        : `/oapi/v1/projex/organizations/${finalOrgId}/programs:search`;
    const payload = {};
    if (name) {
        payload.name = name;
    }
    if (status) {
        payload.status = status;
    }
    if (gmtCreateStart) {
        payload.gmtCreateStart = gmtCreateStart;
    }
    if (gmtCreateEnd) {
        payload.gmtCreateEnd = gmtCreateEnd;
    }
    if (creator) {
        payload.creator = creator;
    }
    if (users) {
        payload.users = users;
    }
    if (orderBy) {
        payload.orderBy = orderBy;
    }
    if (page !== undefined) {
        payload.page = page;
    }
    if (perPage !== undefined) {
        payload.perPage = perPage;
    }
    if (sort) {
        payload.sort = sort;
    }
    const response = await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
    if (!Array.isArray(response)) {
        return [];
    }
    return response.map(program => ProjectInfoSchema.parse(program));
}
/**
 * 构建项目过滤条件(源API所需参数conditions是一个固定的JSON结构)
 * @param args
 */
function buildProjectConditions(args) {
    if (args.advancedConditions) {
        return args.advancedConditions;
    }
    const filterConditions = [];
    if (args.name) {
        filterConditions.push({
            className: "string",
            fieldIdentifier: "name",
            format: "input",
            operator: "CONTAINS",
            toValue: null,
            value: [args.name],
        });
    }
    if (args.status) {
        const statusValues = args.status.split(",");
        const values = statusValues.map(v => v.trim());
        filterConditions.push({
            className: "status",
            fieldIdentifier: "status",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.createdAfter) {
        const createdBefore = args.createdBefore ? `${args.createdBefore} 23:59:59` : null;
        filterConditions.push({
            className: "date",
            fieldIdentifier: "gmtCreate",
            format: "input",
            operator: "BETWEEN",
            toValue: createdBefore,
            value: [`${args.createdAfter} 00:00:00`],
        });
    }
    if (args.creator) {
        const creatorValues = args.creator.split(",");
        const values = creatorValues.map(v => v.trim());
        filterConditions.push({
            className: "user",
            fieldIdentifier: "creator",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.adminUserId) {
        const adminValues = args.adminUserId.split(",");
        const values = adminValues.map(v => v.trim());
        filterConditions.push({
            className: "user",
            fieldIdentifier: "project.admin",
            format: "multiList",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.logicalStatus) {
        filterConditions.push({
            className: "string",
            fieldIdentifier: "logicalStatus",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: [args.logicalStatus],
        });
    }
    if (filterConditions.length === 0) {
        return undefined;
    }
    const conditions = {
        conditionGroups: [filterConditions],
    };
    return JSON.stringify(conditions);
}
/**
 * 项目额外过滤条件
 * @param scenario The filter scenario: "manage" (projects I manage), "participate" (projects I participate in), "favorite" (projects I favorited)
 * @param userId The user ID to filter by
 * @returns JSON string for extraConditions parameter
 */
export function buildExtraConditions(scenario, userId) {
    let fieldIdentifier;
    switch (scenario) {
        case "manage":
            fieldIdentifier = "project.admin";
            break;
        case "participate":
            fieldIdentifier = "users";
            break;
        case "favorite":
            fieldIdentifier = "collectMembers";
            break;
        default:
            throw new Error(`Unknown scenario: ${scenario}`);
    }
    const conditions = {
        conditionGroups: [[{
                    className: "user",
                    fieldIdentifier: fieldIdentifier,
                    format: "multiList",
                    operator: "CONTAINS",
                    value: [userId]
                }]]
    };
    return JSON.stringify(conditions);
}
