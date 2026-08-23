import {
  devtools,
  devtoolsRouterInfo,
  devtoolsState,
  getInspector,
  stringify,
  toggleHighPerfMode
} from '@vue/devtools-kit'

import { createBirpc } from "birpc";

/**
 * @param ws {WebSocket}
 * @param functions {RpcFunctions | Object}
 * @param options {import('birpc').EventOptions}
 */
function createRPCClient(
  ws,
  functions,
  options = {},
) {
  return createBirpc(
    functions,
    {
      ...options,
      on: fn => ws.onmessage = (event) => fn(event.data),
      post: data => ws.send(data),
      // these are required when using WebSocket
      serialize: v => JSON.stringify(v),
      deserialize: v => JSON.parse(v),
    },
  )
}

const proto = location.protocol === 'https:' ? 'wss' : 'ws';
const host = location.host;
const base = '/__vue-devtools-mcp-ws'
const PINIA_INSPECTOR_ID = 'pinia'
const COMPONENTS_INSPECTOR_ID = 'components'

function flattenChildren(node) {
  const result = []

  function traverse(node) {
    if (!node)
      return
    result.push(node)

    if (Array.isArray(node.children)) {
      node.children.forEach(child => traverse(child))
    }
  }

  traverse(node)
  return result
}

devtools.init()

setTimeout(() => {
  const ws = new WebSocket(`${proto}://${host}${base}`);

  let highlightComponentTimeout = null
  const rpc = createRPCClient(
    ws,
    {
      // get component tree
      async getInspectorTree(query) {
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        rpc.onInspectorTreeUpdated(query.event, stringify(inspectorTree[0]))
      },
      // get component state
      async getInspectorState(query) {
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const flattenedChildren = flattenChildren(inspectorTree[0])
        const targetNode = flattenedChildren.find(child => child.name === query.componentName)
        const inspectorState = await devtools.api.getInspectorState({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          nodeId: targetNode.id,
        })
        rpc.onInspectorStateUpdated(query.event, stringify(inspectorState))
      },

      // edit component state
      async editComponentState(query) {
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const flattenedChildren = flattenChildren(inspectorTree[0])
        const targetNode = flattenedChildren.find(child => child.name === query.componentName)
        const payload = {
          app: '',
          inspectorId: COMPONENTS_INSPECTOR_ID,
          nodeId: targetNode.id,
          path: query.path,
          type: query.valueType,
          state: {
            newKey: null,
            remove: false,
            value: query.value,
          },
          // set(object, path, value, cb) {},
        }
        // await devtools.ctx.api.editInspectorState(payload)
        await devtools.ctx.api.editComponentState(payload)
      },

      // highlight component
      async highlightComponent(query) {
        clearTimeout(highlightComponentTimeout)
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: COMPONENTS_INSPECTOR_ID,
          filter: '',
        })
        const flattenedChildren = flattenChildren(inspectorTree[0])
        const targetNode = flattenedChildren.find(child => child.name === query.componentName)
        await devtools.ctx.hooks.callHook('componentHighlight', { uid: targetNode.id })
        highlightComponentTimeout = setTimeout(() => {
          devtools.ctx.hooks.callHook('componentUnhighlight')
        }, 5000)
      },
      // get router info
      async getRouterInfo(query) {
        rpc.onRouterInfoUpdated(query.event, JSON.stringify(devtoolsRouterInfo, null, 2))
      },
      // get pinia tree
      async getPiniaTree(query) {
        const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
        if (highPerfModeEnabled) {
          toggleHighPerfMode(false)
        }
        const inspectorTree = await devtools.api.getInspectorTree({
          inspectorId: PINIA_INSPECTOR_ID,
          filter: '',
        })
        if (highPerfModeEnabled) {
          toggleHighPerfMode(true)
        }
        rpc.onPiniaTreeUpdated(query.event, stringify(inspectorTree))
      },
      // get pinia state
      async getPiniaState(query) {
        const highPerfModeEnabled = devtoolsState.highPerfModeEnabled
        if (highPerfModeEnabled) {
          toggleHighPerfMode(false)
        }
        const payload = {
          inspectorId: PINIA_INSPECTOR_ID,
          nodeId: query.storeName,
        }
        const inspector = getInspector(payload.inspectorId)

        if (inspector)
          inspector.selectedNodeId = payload.nodeId

        const res = await devtools.ctx.api.getInspectorState(payload)
        if (highPerfModeEnabled) {
          toggleHighPerfMode(true)
        }
        rpc.onPiniaInfoUpdated(query.event, stringify(res))
      },
    },
    {
      timeout: 30_000,
    },
  )
}, 50)
