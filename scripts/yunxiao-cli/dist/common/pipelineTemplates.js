/**
 * 流水线模板相关类型定义
 * 保留核心接口供模块化架构使用
 */
// 流水线模板类型枚举（保留用于类型兼容性）
export var PipelineTemplateType;
(function (PipelineTemplateType) {
    PipelineTemplateType["JAVA_MAVEN"] = "java_maven";
    PipelineTemplateType["NODEJS_NPM"] = "nodejs_npm";
    PipelineTemplateType["PYTHON"] = "python";
    PipelineTemplateType["GO"] = "go";
    PipelineTemplateType["KUBERNETES_DEPLOY"] = "kubernetes_deploy";
    PipelineTemplateType["VM_DEPLOY"] = "vm_deploy";
    // 新增更多类型
    PipelineTemplateType["JAVA_GRADLE"] = "java_gradle";
    PipelineTemplateType["NODEJS_YARN"] = "nodejs_yarn";
    PipelineTemplateType["PYTHON_POETRY"] = "python_poetry";
    PipelineTemplateType["DOTNET_CORE"] = "dotnet_core";
})(PipelineTemplateType || (PipelineTemplateType = {}));
