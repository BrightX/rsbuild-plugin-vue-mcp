import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { Implementation as McpServerInfo } from '@modelcontextprotocol/sdk/types.js'
import type { BirpcGroupReturn } from "birpc";

export type Awaitable<T> = T | Promise<T>;

export interface RpcFunctions {
  // appRecord
  getAppRecordStatus: () => string
  toggleApp: (options: { id: string }) => void
  // components
  getInspectorTree: (options: { componentName?: string }) => string
  getInspectorState: (options: { componentName: string }) => string
  editComponentState: (options: { componentName: string, path: string[], value: string, valueType: string }) => void
  highlightComponent: (options: { componentName: string }) => void
  // router
  getRouterInfo: () => string
  // pinia
  getPiniaTree: () => string
  getPiniaState: (options: { storeName: string }) => string
}

export interface VueMcpContext {
  rpcServer: BirpcGroupReturn<RpcFunctions>
}

export interface PluginVueMcpOptions<DEV> {
  /**
   * The host to listen on, default is `localhost`
   */
  host?: string

  /**
   * Print the MCP server URL in the console
   *
   * @default true
   */
  printUrl?: boolean

  /**
   * The MCP server info. Ingored when `mcpServer` is provided
   */
  mcpServerInfo?: McpServerInfo

  /**
   * Setup the MCP server, this is called when the MCP server is created
   * You may also return a new MCP server to replace the default one
   */
  mcpServerSetup?: (server: McpServer, api: DEV) => Awaitable<void | McpServer>

  /**
   * The path to the MCP server, default is `/__mcp`
   */
  mcpPath?: string

  /**
   * append an import to the module id ending with `appendTo` instead of adding a script into body
   * useful for projects that do not use html file as an entry
   *
   * WARNING: only set this if you know exactly what it does.
   * @default ''
   */
  appendTo?: string | RegExp
}
