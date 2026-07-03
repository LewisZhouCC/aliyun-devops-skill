import { zodToJsonSchema } from 'zod-to-json-schema';
import * as types from '../common/types.js';
export const getVMDeployOrderTools = () => [
    {
        name: "stop_vm_deploy_order",
        description: "[VM Deploy Order Management] Stop VM deploy order",
        inputSchema: zodToJsonSchema(types.StopVMDeployOrderSchema),
    },
    {
        name: "skip_vm_deploy_machine",
        description: "[VM Deploy Order Management] Skip VM deploy machine",
        inputSchema: zodToJsonSchema(types.SkipVMDeployMachineSchema),
    },
    {
        name: "retry_vm_deploy_machine",
        description: "[VM Deploy Order Management] Retry VM deploy machine",
        inputSchema: zodToJsonSchema(types.RetryVMDeployMachineSchema),
    },
    {
        name: "resume_vm_deploy_order",
        description: "[VM Deploy Order Management] Resume VM deploy order",
        inputSchema: zodToJsonSchema(types.ResumeVMDeployOrderSchema),
    },
    {
        name: "get_vm_deploy_order",
        description: "[VM Deploy Order Management] Get VM deploy order details",
        inputSchema: zodToJsonSchema(types.GetVMDeployOrderSchema),
    },
    {
        name: "get_vm_deploy_machine_log",
        description: "[VM Deploy Order Management] Get VM deploy machine log",
        inputSchema: zodToJsonSchema(types.GetVMDeployMachineLogSchema),
    },
];
