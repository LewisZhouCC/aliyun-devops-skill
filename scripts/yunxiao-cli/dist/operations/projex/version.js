/**
 * 版本（Version）相关操作
 *
 * 概念说明：
 * - 版本是云效项目管理中的版本管理单元，用于管理项目的发布计划
 * - 版本可以属于项目或项目集
 */
import { yunxiaoRequest, isRegionEdition } from "../../common/utils.js";
import { resolveOrganizationId } from "../organization/organization.js";
import { VersionDTOSchema } from "./types.js";
/**
 * 获取项目集版本列表
 * @param organizationId 组织ID
 * @param id 项目集唯一标识
 * @param status 过滤的状态
 * @param name 过滤名称
 * @param page 页码
 * @param perPage 每页大小
 */
export async function listProgramVersionsFunc(organizationId, id, status, name, page, perPage) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/programs/${id}/versions`
        : `/oapi/v1/projex/organizations/${finalOrgId}/programs/${id}/versions`;
    // 构建查询参数
    const queryParams = {};
    if (status && status.length > 0) {
        queryParams.status = status;
    }
    if (name) {
        queryParams.name = name;
    }
    if (page !== undefined) {
        queryParams.page = page;
    }
    if (perPage !== undefined) {
        queryParams.perPage = perPage;
    }
    // 构建完整的URL
    const queryString = Object.entries(queryParams)
        .map(([key, value]) => {
        if (Array.isArray(value)) {
            return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
        }
        return `${key}=${encodeURIComponent(value)}`;
    })
        .join('&');
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const response = await yunxiaoRequest(fullUrl, {
        method: "GET",
    });
    if (!Array.isArray(response)) {
        return [];
    }
    return response.map(version => VersionDTOSchema.parse(version));
}
/**
 * 获取项目版本列表
 * @param organizationId 组织ID
 * @param id 项目唯一标识
 * @param status 过滤的状态
 * @param name 过滤名称
 * @param page 页码
 * @param perPage 每页大小
 */
export async function listVersionsFunc(organizationId, id, status, name, page, perPage) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${id}/versions`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${id}/versions`;
    // 构建查询参数
    const queryParams = {};
    if (status && status.length > 0) {
        queryParams.status = status;
    }
    if (name) {
        queryParams.name = name;
    }
    if (page !== undefined) {
        queryParams.page = page;
    }
    if (perPage !== undefined) {
        queryParams.perPage = perPage;
    }
    // 构建完整的URL
    const queryString = Object.entries(queryParams)
        .map(([key, value]) => {
        if (Array.isArray(value)) {
            return value.map(v => `${key}=${encodeURIComponent(v)}`).join('&');
        }
        return `${key}=${encodeURIComponent(value)}`;
    })
        .join('&');
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    const response = await yunxiaoRequest(fullUrl, {
        method: "GET",
    });
    if (!Array.isArray(response)) {
        return [];
    }
    return response.map(version => VersionDTOSchema.parse(version));
}
/**
 * 创建版本
 * @param organizationId 组织ID
 * @param id 项目唯一标识
 * @param name 版本名称
 * @param owners 负责人用户ID列表
 * @param startDate 开始日期
 * @param publishDate 发布日期
 */
export async function createVersionFunc(organizationId, id, name, owners, startDate, publishDate) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${id}/versions`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${id}/versions`;
    const payload = {
        name,
        owners,
    };
    if (startDate !== undefined) {
        payload.startDate = startDate;
    }
    if (publishDate !== undefined) {
        payload.publishDate = publishDate;
    }
    const response = await yunxiaoRequest(url, {
        method: "POST",
        body: payload,
    });
    return { id: response.id };
}
/**
 * 更新版本
 * @param organizationId 组织ID
 * @param projectId 项目唯一标识
 * @param id 版本唯一标识
 * @param name 版本名称
 * @param owners 负责人用户ID列表
 * @param startDate 开始日期
 * @param publishDate 发布日期
 */
export async function updateVersionFunc(organizationId, projectId, id, name, owners, startDate, publishDate) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${projectId}/versions/${id}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${projectId}/versions/${id}`;
    const payload = {
        name,
    };
    if (owners !== undefined) {
        payload.owners = owners;
    }
    if (startDate !== undefined) {
        payload.startDate = startDate;
    }
    if (publishDate !== undefined) {
        payload.publishDate = publishDate;
    }
    await yunxiaoRequest(url, {
        method: "PUT",
        body: payload,
    });
}
/**
 * 删除版本
 * @param organizationId 组织ID
 * @param projectId 项目唯一标识
 * @param id 版本唯一标识
 */
export async function deleteVersionFunc(organizationId, projectId, id) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/projex/projects/${projectId}/versions/${id}`
        : `/oapi/v1/projex/organizations/${finalOrgId}/projects/${projectId}/versions/${id}`;
    await yunxiaoRequest(url, {
        method: "DELETE",
    });
}
// Re-export schema for use in handlers
export { VersionDTOSchema, ListProgramVersionsSchema, ListVersionsSchema, CreateVersionSchema, UpdateVersionSchema, DeleteVersionSchema } from "./types.js";
