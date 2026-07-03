import { buildUrl, yunxiaoRequest, isRegionEdition, getRegionDefaultOrganizationId } from "../../common/utils.js";
import { CurrentOrganizationInfoSchema, UserOrganizationsInfoSchema, CurrentUserSchema, OrganizationDepartmentsSchema, DepartmentInfoSchema, OrganizationRoleSchema, OrganizationRole, } from "./types.js";
export async function getCurrentOrganizationInfoFunc() {
    const url = "/oapi/v1/platform/user";
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    const responseData = response;
    const mappedResponse = {
        lastOrganization: responseData.lastOrganization, // Organization ID
        userId: responseData.id, // Map API's "id" to userId
        userName: responseData.name // Map API's "name" to userName
    };
    return CurrentOrganizationInfoSchema.parse(mappedResponse);
}
export async function getUserOrganizationsFunc() {
    const url = "/oapi/v1/platform/organizations";
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    if (!Array.isArray(response)) {
        return [];
    }
    return UserOrganizationsInfoSchema.parse(response);
}
export async function getOrganizationDepartmentsFunc(organizationId, parentId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const baseUrl = isRegionEdition()
        ? `/oapi/v1/platform/departments`
        : `/oapi/v1/platform/organizations/${finalOrgId}/departments`;
    const params = {};
    if (parentId) {
        params.parentId = parentId;
    }
    const url = buildUrl(baseUrl, params);
    const response = await yunxiaoRequest(url, {
        method: "GET"
    });
    return OrganizationDepartmentsSchema.parse(response);
}
export async function getOrganizationDepartmentInfoFunc(organizationId, id) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/platform/departments/${id}`
        : `/oapi/v1/platform/organizations/${finalOrgId}/departments/${id}`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return DepartmentInfoSchema.parse(response);
}
export async function getOrganizationDepartmentAncestorsFunc(organizationId, id) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/platform/departments/${id}/ancestors`
        : `/oapi/v1/platform/organizations/${finalOrgId}/departments/${id}/ancestors`;
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return OrganizationDepartmentsSchema.parse(response);
}
;
export async function listOrganizationRolesFunc(organizationId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/platform/roles`
        : `/oapi/v1/platform/organizations/${finalOrgId}/roles`;
    const response = await yunxiaoRequest(url, {
        method: "GET"
    });
    return OrganizationRole.parse(response);
}
export async function getOrganizationRoleFunc(organizationId, roleId) {
    const finalOrgId = await resolveOrganizationId(organizationId);
    const url = isRegionEdition()
        ? `/oapi/v1/platform/roles/${roleId}`
        : `/oapi/v1/platform/organizations/${finalOrgId}/roles/${roleId}`;
    const response = await yunxiaoRequest(url, {
        method: "GET"
    });
    return OrganizationRoleSchema.parse(response);
}
export async function getCurrentUserFunc() {
    const url = "/oapi/v1/platform/user";
    const response = await yunxiaoRequest(url, {
        method: "GET",
    });
    return CurrentUserSchema.parse(response);
}
/**
 * 统一解析 organizationId：
 * - region 站：无论传什么 / 不传，最终统一用 getRegionDefaultOrganizationId()
 * - 中心站：
 *   - 传入 explicitOrgId 则使用
 *   - 未传则从 /platform/user 的 lastOrganization 补充
 */
export async function resolveOrganizationId(explicitOrgId) {
    if (isRegionEdition()) {
        // region 模式：统一使用默认占位 orgId
        return getRegionDefaultOrganizationId();
    }
    // 中心站模式
    if (explicitOrgId && explicitOrgId !== "default") {
        return explicitOrgId;
    }
    const info = await getCurrentOrganizationInfoFunc();
    if (!info.lastOrganization) {
        throw new Error("organizationId is required when using Yunxiao central edition");
    }
    return info.lastOrganization;
}
