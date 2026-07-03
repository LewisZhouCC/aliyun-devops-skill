// 定义工具集枚举
export var Toolset;
(function (Toolset) {
    Toolset["BASE"] = "base";
    Toolset["CODE_MANAGEMENT"] = "code-management";
    Toolset["ORGANIZATION_MANAGEMENT"] = "organization-management";
    Toolset["PROJECT_MANAGEMENT"] = "project-management";
    Toolset["PIPELINE_MANAGEMENT"] = "pipeline-management";
    Toolset["PACKAGES_MANAGEMENT"] = "packages-management";
    Toolset["APPLICATION_DELIVERY"] = "application-delivery";
    Toolset["TEST_MANAGEMENT"] = "test-management";
})(Toolset || (Toolset = {}));
// 默认启用的工具集
export const DEFAULT_ENABLED_TOOLSETS = [
    Toolset.BASE,
    Toolset.CODE_MANAGEMENT,
    Toolset.ORGANIZATION_MANAGEMENT,
    Toolset.PROJECT_MANAGEMENT,
    Toolset.PIPELINE_MANAGEMENT,
    Toolset.PACKAGES_MANAGEMENT,
    Toolset.APPLICATION_DELIVERY,
    Toolset.TEST_MANAGEMENT
];
