import type { RpcFunctions, VueMcpContext } from "../types.ts";

export function createServerRpcFunc(ctx: VueMcpContext): RpcFunctions {
  return {
    // component tree
    getInspectorTree: (_: { event: string, componentName?: string }) => ({}),
    onInspectorTreeUpdated: (event: string, data: string) => {
      ctx.hooks.callHook(event, data).finally()
    },
    // component state
    getInspectorState: (_: { event: string, componentName: string }) => ({}),
    onInspectorStateUpdated: (event: string, data: string) => {
      ctx.hooks.callHook(event, data).finally()
    },
    editComponentState(_: { componentName: string; path: string[]; value: string; valueType: string }): void {},
    highlightComponent(_: { componentName: string }): void {},
    // router info
    getRouterInfo: (_: { event: string }) => ({}),
    onRouterInfoUpdated: (event: string, data: string) => {
      ctx.hooks.callHook(event, data).finally()
    },
    // pinia tree
    getPiniaTree: (_: { event: string }) => ({}),
    onPiniaTreeUpdated: (event: string, data: string) => {
      ctx.hooks.callHook(event, data).finally()
    },
    // pinia state
    getPiniaState: (_: { event: string, storeName: string }) => ({}),
    onPiniaInfoUpdated: (event: string, data: string) => {
      ctx.hooks.callHook(event, data).finally()
    }
  }
}
