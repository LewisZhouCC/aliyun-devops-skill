import { buildUrl, yunxiaoRequest, getYunxiaoApiBaseUrl, getCurrentSessionToken, isRegionEdition } from "../../common/utils.js";
import * as project from "./project.js";
import { createYunxiaoError } from "../../common/errors.js";
import { getUserAgent } from "universal-user-agent";
import { VERSION } from "../../common/version.js";
import { WorkItemSchema } from "./types.js";
import { getCurrentUserFunc, resolveOrganizationId } from "../organization/organization.js";
export async function getWorkItemFunc(organizationId, workItemId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return WorkItemSchema.parse(response);
}
export async function searchWorkitemsFunc(organizationId, category, spaceId, spaceType, subject, status, createdAfter, createdBefore, updatedAfter, updatedBefore, creator, assignedTo, sprint, workitemType, statusStage, tag, priority, subjectDescription, finishTimeAfter, finishTimeBefore, updateStatusAtAfter, updateStatusAtBefore, advancedConditions, orderBy = "gmtCreate", sort = "desc", page, perPage, includeDetails = false // 新增参数：是否自动补充缺失的description等详细信息
) {
    // 处理assignedTo为"self"的情况，自动获取当前用户ID
    let finalAssignedTo = assignedTo;
    let finalCreator = creator;
    if (assignedTo === "self" || creator === "self") {
        try {
            const currentUser = await getCurrentUserFunc();
            if (currentUser.id) {
                if (assignedTo === "self") {
                    finalAssignedTo = currentUser.id;
                }
                if (creator === "self") {
                    finalCreator = currentUser.id;
                }
            }
            else {
                finalAssignedTo = assignedTo;
                finalCreator = creator;
            }
        }
        catch (error) {
            finalAssignedTo = assignedTo;
            finalCreator = creator;
        }
    }
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems:search`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems:search`;
    const payload = {
        category: category,
        spaceId: spaceId,
    };
    // 添加 spaceType 参数，用于区分项目和项目集
    if (spaceType) {
        payload.spaceType = spaceType;
    }
    const conditions = buildWorkitemConditions({
        subject,
        status,
        createdAfter,
        createdBefore,
        updatedAfter,
        updatedBefore,
        creator: finalCreator,
        assignedTo: finalAssignedTo,
        sprint,
        workitemType,
        statusStage,
        tag,
        priority,
        subjectDescription,
        finishTimeAfter,
        finishTimeBefore,
        updateStatusAtAfter,
        updateStatusAtBefore,
        advancedConditions
    });
    if (conditions) {
        payload.conditions = conditions;
    }
    payload.orderBy = orderBy;
    // 添加分页和排序参数
    if (sort) {
        payload.sort = sort;
    }
    if (page !== undefined) {
        payload.page = page;
    }
    if (perPage !== undefined) {
        payload.perPage = perPage;
    }
    // 使用 fetch 直接获取响应，以便读取响应头中的分页信息
    const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
    const fullUrl = isAbsolute ? url : `${getYunxiaoApiBaseUrl()}${url.startsWith("/") ? url : `/${url}`}`;
    const requestHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": `modelcontextprotocol/servers/alibabacloud-devops-mcp-server/v${VERSION} ${getUserAgent()}`,
    };
    const token = getCurrentSessionToken();
    if (token) {
        requestHeaders["x-yunxiao-token"] = token;
    }
    const response = await fetch(fullUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const responseBody = await response.json().catch(() => ({}));
        throw createYunxiaoError(response.status, responseBody, fullUrl, "POST", requestHeaders, payload);
    }
    const responseBody = await response.json();
    // 从响应头中提取分页信息
    const pagination = (() => {
        const xPage = response.headers.get("x-page");
        const xPerPage = response.headers.get("x-per-page");
        const xTotalPages = response.headers.get("x-total-pages");
        const xTotal = response.headers.get("x-total");
        const xNextPage = response.headers.get("x-next-page");
        const xPrevPage = response.headers.get("x-prev-page");
        if (xPage && xPerPage && xTotalPages && xTotal) {
            return {
                page: parseInt(xPage, 10),
                perPage: parseInt(xPerPage, 10),
                totalPages: parseInt(xTotalPages, 10),
                total: parseInt(xTotal, 10),
                nextPage: xNextPage ? parseInt(xNextPage, 10) : null,
                prevPage: xPrevPage ? parseInt(xPrevPage, 10) : null,
            };
        }
        return undefined;
    })();
    if (!Array.isArray(responseBody)) {
        return {
            items: [],
            pagination,
        };
    }
    const workItems = responseBody.map(workitem => WorkItemSchema.parse(workitem));
    // 如果需要补充详细信息，使用分批并发方式获取
    if (includeDetails) {
        const itemsNeedingDetails = workItems.filter(item => item.id.length > 0 &&
            (item.description === null || item.description === undefined || item.description === ""));
        if (itemsNeedingDetails.length > 0) {
            // 分批并发获取详情
            const descriptionMap = await batchGetWorkItemDetails(finalOrgId, itemsNeedingDetails);
            // 更新workItems中的description
            const updatedItems = workItems.map(item => {
                if (descriptionMap.has(item.id)) {
                    return {
                        ...item,
                        description: descriptionMap.get(item.id) || item.description
                    };
                }
                return item;
            });
            return {
                items: updatedItems,
                pagination,
            };
        }
    }
    return {
        items: workItems,
        pagination,
    };
}
// 分批并发获取工作项详情
async function batchGetWorkItemDetails(organizationId, workItems, batchSize = 10, // 每批处理10个
maxItems = 100 // 最多处理100个
) {
    const descriptionMap = new Map();
    // 限制处理数量
    const limitedItems = workItems.slice(0, maxItems);
    // 分批处理
    for (let i = 0; i < limitedItems.length; i += batchSize) {
        const batch = limitedItems.slice(i, i + batchSize);
        // 批次内并发执行
        const batchResults = await Promise.allSettled(batch.map(async (item) => {
            // 再次检查item.id是否为有效字符串
            if (typeof item.id !== 'string' || item.id.length === 0) {
                return {
                    id: item.id || 'unknown',
                    description: null,
                    success: false
                };
            }
            const itemId = item.id;
            try {
                const detailedItem = await getWorkItemFunc(organizationId, itemId);
                return {
                    id: itemId,
                    description: detailedItem.description,
                    success: true
                };
            }
            catch (error) {
                return {
                    id: itemId,
                    description: null,
                    success: false
                };
            }
        }));
        // 处理批次结果
        batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
                // 确保description类型正确，将undefined转换为null
                const description = result.value.description === undefined ? null : result.value.description;
                descriptionMap.set(result.value.id, description);
            }
        });
    }
    return descriptionMap;
}
function buildWorkitemConditions(args) {
    if (args.advancedConditions) {
        return args.advancedConditions;
    }
    const filterConditions = [];
    if (args.subject) {
        filterConditions.push({
            className: "string",
            fieldIdentifier: "subject",
            format: "input",
            operator: "CONTAINS",
            toValue: null,
            value: [args.subject],
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
            className: "dateTime",
            fieldIdentifier: "gmtCreate",
            format: "input",
            operator: "BETWEEN",
            toValue: createdBefore,
            value: [`${args.createdAfter} 00:00:00`],
        });
    }
    if (args.updatedAfter) {
        const updatedBefore = args.updatedBefore ? `${args.updatedBefore} 23:59:59` : null;
        filterConditions.push({
            className: "dateTime",
            fieldIdentifier: "gmtModified",
            format: "input",
            operator: "BETWEEN",
            toValue: updatedBefore,
            value: [`${args.updatedAfter} 00:00:00`],
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
    if (args.assignedTo) {
        const assignedToValues = args.assignedTo.split(",");
        const values = assignedToValues.map(v => v.trim());
        filterConditions.push({
            className: "user",
            fieldIdentifier: "assignedTo",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.sprint) {
        const sprintValues = args.sprint.split(",");
        const values = sprintValues.map(v => v.trim());
        filterConditions.push({
            className: "sprint",
            fieldIdentifier: "sprint",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.workitemType) {
        const workitemTypeValues = args.workitemType.split(",");
        const values = workitemTypeValues.map(v => v.trim());
        filterConditions.push({
            className: "workitemType",
            fieldIdentifier: "workitemType",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.statusStage) {
        const statusStageValues = args.statusStage.split(",");
        const values = statusStageValues.map(v => v.trim());
        filterConditions.push({
            className: "statusStage",
            fieldIdentifier: "statusStage",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.tag) {
        const tagValues = args.tag.split(",");
        const values = tagValues.map(v => v.trim());
        filterConditions.push({
            className: "tag",
            fieldIdentifier: "tag",
            format: "multiList",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.priority) {
        const priorityValues = args.priority.split(",");
        const values = priorityValues.map(v => v.trim());
        filterConditions.push({
            className: "option",
            fieldIdentifier: "priority",
            format: "list",
            operator: "CONTAINS",
            toValue: null,
            value: values,
        });
    }
    if (args.subjectDescription) {
        filterConditions.push({
            className: "string",
            fieldIdentifier: "subject-description",
            format: "input",
            operator: "CONTAINS",
            toValue: null,
            value: [args.subjectDescription],
        });
    }
    if (args.finishTimeAfter) {
        const finishTimeBefore = args.finishTimeBefore ? `${args.finishTimeBefore} 23:59:59` : null;
        filterConditions.push({
            className: "date",
            fieldIdentifier: "finishTime",
            format: "input",
            operator: "BETWEEN",
            toValue: finishTimeBefore,
            value: [`${args.finishTimeAfter} 00:00:00`],
        });
    }
    if (args.updateStatusAtAfter) {
        const updateStatusAtBefore = args.updateStatusAtBefore ? `${args.updateStatusAtBefore} 23:59:59` : null;
        filterConditions.push({
            className: "date",
            fieldIdentifier: "updateStatusAt",
            format: "input",
            operator: "BETWEEN",
            toValue: updateStatusAtBefore,
            value: [`${args.updateStatusAtAfter} 00:00:00`],
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
export async function createWorkItemFunc(organizationId, assignedTo, spaceId, subject, workitemTypeId, customFieldValues, description, formatType, labels, parentId, participants, sprint, trackers, verifier, versions) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems`;
    const payload = {
        assignedTo,
        spaceId,
        subject,
        workitemTypeId
    };
    if (customFieldValues) {
        payload.customFieldValues = customFieldValues;
    }
    if (description !== undefined) {
        payload.description = description;
    }
    if (formatType !== undefined) {
        payload.formatType = formatType;
    }
    if (labels && labels.length > 0) {
        payload.labels = labels;
    }
    if (parentId !== undefined) {
        payload.parentId = parentId;
    }
    if (participants && participants.length > 0) {
        payload.participants = participants;
    }
    if (sprint !== undefined) {
        payload.sprint = sprint;
    }
    if (trackers && trackers.length > 0) {
        payload.trackers = trackers;
    }
    if (verifier !== undefined) {
        payload.verifier = verifier;
    }
    if (versions && versions.length > 0) {
        payload.versions = versions;
    }
    const response = await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
    return WorkItemSchema.parse(response);
}
export async function updateWorkItemFunc(organizationId, workItemId, updateWorkItemFields) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}`;
    // 构建请求体，将自定义字段合并到主对象中
    const requestBody = {};
    // 复制所有标准字段
    if (updateWorkItemFields.subject !== undefined) {
        requestBody.subject = updateWorkItemFields.subject;
    }
    if (updateWorkItemFields.description !== undefined) {
        requestBody.description = updateWorkItemFields.description;
    }
    if (updateWorkItemFields.formatType !== undefined) {
        requestBody.formatType = updateWorkItemFields.formatType;
    }
    if (updateWorkItemFields.status !== undefined) {
        requestBody.status = updateWorkItemFields.status;
    }
    if (updateWorkItemFields.assignedTo !== undefined) {
        requestBody.assignedTo = updateWorkItemFields.assignedTo;
    }
    if (updateWorkItemFields.priority !== undefined) {
        requestBody.priority = updateWorkItemFields.priority;
    }
    if (updateWorkItemFields.labels !== undefined) {
        requestBody.labels = updateWorkItemFields.labels;
    }
    if (updateWorkItemFields.sprint !== undefined) {
        requestBody.sprint = updateWorkItemFields.sprint;
    }
    if (updateWorkItemFields.trackers !== undefined) {
        requestBody.trackers = updateWorkItemFields.trackers;
    }
    if (updateWorkItemFields.verifier !== undefined) {
        requestBody.verifier = updateWorkItemFields.verifier;
    }
    if (updateWorkItemFields.participants !== undefined) {
        requestBody.participants = updateWorkItemFields.participants;
    }
    if (updateWorkItemFields.versions !== undefined) {
        requestBody.versions = updateWorkItemFields.versions;
    }
    // 处理自定义字段
    if (updateWorkItemFields.customFieldValues !== undefined) {
        // 将自定义字段合并到请求体中
        Object.entries(updateWorkItemFields.customFieldValues).forEach(([fieldId, value]) => {
            requestBody[fieldId] = value;
        });
    }
    const response = await yunxiaoRequest(url, {
        method: "PUT",
        body: requestBody,
    });
}
export async function getWorkItemTypesFunc(organizationId, id, // 项目唯一标识
category // 工作项类型，可选值为 Req，Bug，Task 等。
) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${id}/workitemTypes?category=${encodeURIComponent(category)}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${id}/workitemTypes?category=${encodeURIComponent(category)}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return response;
}
/**
 * 列出所有工作项类型
 * @param organizationId 企业ID
 * @returns 工作项类型列表
 */
export async function listAllWorkItemTypesFunc(organizationId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitemTypes`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitemTypes`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 确保返回的是数组格式
    if (Array.isArray(response)) {
        return response;
    }
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    // 其他情况返回空数组
    return [];
}
/**
 * 列出工作项类型
 * @param organizationId 企业ID
 * @param spaceIdentifier 项目唯一标识
 * @param category 工作项类型分类（可选）
 * @returns 工作项类型列表
 */
export async function listWorkItemTypesFunc(organizationId, spaceIdentifier, category) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    let url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${spaceIdentifier}/workitemTypes`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${spaceIdentifier}/workitemTypes`;
    // 如果提供了category参数，则添加到URL中
    if (category) {
        url += `?category=${encodeURIComponent(category)}`;
    }
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 确保返回的是数组格式
    if (Array.isArray(response)) {
        return response;
    }
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    // 其他情况返回空数组
    return [];
}
/**
 * 获取工作项类型详情
 * @param organizationId 企业ID
 * @param spaceIdentifier 项目唯一标识
 * @param id 工作项类型ID
 * @returns 工作项类型详情
 */
export async function getWorkItemTypeFunc(organizationId, id) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitemTypes/${id}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitemTypes/${id}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response) {
        return response.result;
    }
    // 否则直接返回响应
    return response;
}
/**
 * 列出工作项关联的工作项类型
 * @param organizationId 企业ID
 * @param spaceIdentifier 项目唯一标识
 * @param workItemTypeId 工作项ID
 * @param relationType 关联类型 (BLOCK, RELATE, DUPLICATE, CHILD)
 * @returns 关联的工作项类型列表
 */
export async function listWorkItemRelationWorkItemTypesFunc(organizationId, workItemTypeId, relationType) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitemTypes/${workItemTypeId}/relationWorkitemTypes`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitemTypes/${workItemTypeId}/relationWorkitemTypes`;
    const queryParams = {};
    if (relationType != null) {
        queryParams.relationType = relationType;
    }
    let finalUrl = buildUrl(url, queryParams);
    const response = await yunxiaoRequest(finalUrl, {
        method: "GET",
    });
    // 确保返回的是数组格式
    if (Array.isArray(response)) {
        return response;
    }
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    // 其他情况返回空数组
    return [];
}
/**
 * 列出工作项关联记录
 * @param organizationId 企业ID
 * @param workItemId 工作项ID
 * @param relationType 关联类型
 * @returns 关联记录列表
 */
export async function listWorkItemRelationRecordsFunc(organizationId, workItemId, relationType) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}/relationRecords`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}/relationRecords`;
    const response = await yunxiaoRequest(buildUrl(url, { relationType }), {
        method: "GET",
    });
    if (Array.isArray(response)) {
        return response;
    }
    if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    return [];
}
/**
 * 创建工作项关联记录
 * @param organizationId 企业ID
 * @param workItemId 当前工作项ID
 * @param relatedWorkItemId 要关联的工作项ID
 * @param relationType 关联类型
 * @param operatorId 操作者ID
 * @returns 创建结果
 */
export async function createWorkItemRelationRecordFunc(organizationId, workItemId, relatedWorkItemId, relationType, operatorId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}/relationRecords`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}/relationRecords`;
    const payload = {
        relationType,
        workitemId: relatedWorkItemId,
    };
    if (operatorId !== undefined) {
        payload.operatorId = operatorId;
    }
    return await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
}
/**
 * 删除工作项关联记录
 * @param organizationId 企业ID
 * @param workItemId 工作项ID
 * @param relatedWorkItemId 要解除关联的工作项ID
 * @param relationType 关联类型
 * @param operatorId 操作者ID
 * @returns 删除结果
 */
export async function deleteWorkItemRelationRecordFunc(organizationId, workItemId, relatedWorkItemId, relationType, operatorId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}/relationRecords`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}/relationRecords`;
    const payload = {
        relationType,
        workitemId: relatedWorkItemId,
    };
    if (operatorId !== undefined) {
        payload.operatorId = operatorId;
    }
    return await yunxiaoRequest(url, {
        method: "DELETE",
        body: payload,
    });
}
/**
 * 获取工作项类型字段配置
 * @param organizationId 企业ID
 * @param projectId 项目唯一标识
 * @param workItemTypeId 工作项类型ID
 * @returns 工作项类型字段配置
 */
export async function getWorkItemTypeFieldConfigFunc(organizationId, projectId, workItemTypeId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${projectId}/workitemTypes/${workItemTypeId}/fields`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${projectId}/workitemTypes/${workItemTypeId}/fields`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response) {
        return response.result;
    }
    // 否则直接返回响应
    return response;
}
/**
 * 获取工作项工作流
 * @param organizationId 企业ID
 * @param projectId 项目唯一标识
 * @param workItemTypeId 工作项类型ID
 * @returns 工作项工作流信息
 */
export async function getWorkItemWorkflowFunc(organizationId, projectId, workItemTypeId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${projectId}/workitemTypes/${workItemTypeId}/workflows`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${projectId}/workitemTypes/${workItemTypeId}/workflows`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response) {
        return response.result;
    }
    // 否则直接返回响应
    return response;
}
/**
 * 列出工作项评论
 * @param organizationId 企业ID
 * @param workItemId 工作项ID
 * @param page 页码
 * @param perPage 每页条数
 * @returns 工作项评论列表
 */
export async function listWorkItemCommentsFunc(organizationId, workItemId, page = 1, perPage = 20) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}/comments?page=${page}&perPage=${perPage}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}/comments?page=${page}&perPage=${perPage}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    // 确保返回的是数组格式
    if (Array.isArray(response)) {
        return response;
    }
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response && Array.isArray(response.result)) {
        return response.result;
    }
    // 其他情况返回空数组
    return [];
}
/**
 * 创建工作项评论
 * @param organizationId 企业ID
 * @param workItemId 工作项ID
 * @param content 评论内容
 * @returns 创建的评论信息
 */
export async function createWorkItemCommentFunc(organizationId, workItemId, content) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/workitems/${workItemId}/comments`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems/${workItemId}/comments`;
    const payload = {
        content: content
    };
    const response = await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
    // 如果响应中包含result字段，则返回result中的数据
    if (response && typeof response === 'object' && 'result' in response) {
        return response.result;
    }
    // 否则直接返回响应
    return response;
}
// 查询我的待处理工作项（跨类型汇总）
export async function listMyPendingItemsFunc(organizationId, spaceId, assignedTo = "self") {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const currentUser = await getCurrentUserFunc();
    const userId = currentUser.id;
    const token = getCurrentSessionToken();
    const requestHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": `modelcontextprotocol/servers/alibabacloud-devops-mcp-server/v${VERSION} ${getUserAgent()}`,
    };
    if (token) {
        requestHeaders["x-yunxiao-token"] = token;
    }
    // 确定要查询的 spaceId 列表
    let spaceIds = [];
    if (spaceId) {
        spaceIds = [spaceId];
    }
    else {
        // 未指定项目时，先获取所有项目
        try {
            const projects = await project.searchProjectsFunc(finalOrgId, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, "gmtCreate", 1, 20, "desc", undefined, undefined);
            spaceIds = (projects || []).map(p => p.id).slice(0, 20); // 最多20个项目
        }
        catch {
            spaceIds = [];
        }
    }
    const categories = ["Req", "Task", "Bug"];
    const results = {};
    const searchUrl = isRegionEdition()
        ? `/oapi/v1/projex/workitems:search`
        : `/oapi/v1/projex/organizations/${finalOrgId}/workitems:search`;
    const fullUrl = `${getYunxiaoApiBaseUrl()}${searchUrl.startsWith("/") ? searchUrl : `/${searchUrl}`}`;
    for (const cat of categories) {
        const categoryResults = [];
        for (const sid of spaceIds) {
            const payload = {
                category: cat,
                assignedTo: userId,
                spaceId: sid,
                orderBy: "gmtModified",
                sort: "desc",
                perPage: 20,
            };
            try {
                const response = await fetch(fullUrl, {
                    method: "POST",
                    headers: requestHeaders,
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    continue;
                }
                const data = await response.json();
                const items = Array.isArray(data) ? data : [];
                // 过滤掉已完成和已取消的
                // statusStageId: 4=已完成, 5=已取消
                // 同时按状态名过滤（更全面）
                const terminalStatuses = ["已完成", "已取消", "已修复", "暂不修复", "已关闭"];
                const pending = items.filter(item => {
                    const stage = String(item.statusStageId ?? "");
                    const statusName = item.status?.displayName || item.status?.name || "";
                    return stage !== "4" && stage !== "5" && !terminalStatuses.includes(statusName);
                });
                for (const item of pending) {
                    categoryResults.push({
                        id: item.id,
                        serialNumber: item.serialNumber || item.id,
                        subject: item.subject,
                        status: item.status?.displayName || item.status?.name || "",
                        priority: item.customFieldValues?.find(f => f.fieldId === "priority")?.values?.[0]?.displayValue || "",
                        space: item.space?.name || "",
                        gmtModified: item.gmtModified ? new Date(item.gmtModified).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "",
                    });
                }
            }
            catch {
                // continue to next space
            }
        }
        // 按更新时间排序，取前10条
        categoryResults.sort((a, b) => b.gmtModified.localeCompare(a.gmtModified));
        results[cat] = {
            items: categoryResults.slice(0, 10),
            total: categoryResults.length,
        };
    }
    return results;
}
