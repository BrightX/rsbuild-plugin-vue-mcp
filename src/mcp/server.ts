import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { version } from '../../package.json'
import type { PluginVueMcpOptions, VueMcpContext } from "../types.ts";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { Compiler as RspackCompiler } from "@rspack/core";
import { z } from "zod";

function stringify(value: any) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function createMcpServerDefault<DEV extends RsbuildPluginAPI | RspackCompiler>(options: PluginVueMcpOptions<DEV>, ctx: VueMcpContext): McpServer {
  const server = new McpServer({
    name: "rsbuild-vue-mcp",
    description: 'Rsbuild/Rspack MCP plugin based on Vue DevTools',
    version,
    ...options.mcpServerInfo,
  })

  server.registerTool(
    'get-app-record-status',
    {
      title: 'App Record Status',
      description: 'Get the current Devtools App status (appRecords and activeAppRecord). Must be called first before any other MCP tools. ' +
        'An empty content response usually means the user needs to open a web page with an app to debug. ' +
        'If multiple content items are returned, the user has multiple app pages open and should close all but one to avoid interference. ' +
        'If a content contains multiple appRecords, it means multiple Vue App instances exist on the page. `toggle-app` to switch activeAppRecord. ',
    },
    async () => {
      const res = await ctx.rpcServer.getAppRecordStatus();
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    }
  );

  server.registerTool(
    'toggle-app',
    {
      title: 'Toggle App',
      description: 'Toggle the activeAppRecord by the id of the appRecord. All MCP tool operations on Components, Router, Pinia, etc. are performed based on the activeAppRecord.',
      inputSchema: { id: z.string() },
    },
    async ({ id }) => {
      await ctx.rpcServer.toggleApp({ id });
      return {
        content: [{
          type: 'text',
          text: 'ok',
        }],
      }
    }
  )

  server.registerTool(
    'get-component-tree',
    {
      description: 'Get the Vue component tree in JSON tree syntax format (by Vue DevTools stringify, a two-dimensional serialization format that separates structure from values, replacing nested object references with IDs.).',
      inputSchema: { componentName: z.string().optional().describe('query by componentName (the component\'s name, not uid), default query all components') },
    },
    async ({ componentName }) => {
      const res = await ctx.rpcServer.getInspectorTree({ componentName });
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    },
  );

  server.registerTool(
    'get-component-state',
    {
      description: 'Get the Vue component state in JSON structure format.',
      inputSchema: { componentName: z.string().describe('query by componentName (the component\'s name, not uid)'), }
    },
    async ({ componentName }) => {
      const res = await ctx.rpcServer.getInspectorState({ componentName });
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    },
  )

  server.registerTool(
    'edit-component-state',
    {
      description: 'Edit the Vue component state.',
      inputSchema: {
        componentName: z.string().describe('by componentName (the component\'s name, not uid)'),
        path: z.array(z.string()),
        value: z.string(),
        valueType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
      }
    },
    async ({ componentName, path, value, valueType }) => {
      await ctx.rpcServer.editComponentState({ componentName, path, value, valueType });
      return {
        content: [{
          type: 'text',
          text: 'ok',
        }],
      }
    },
  )

  server.registerTool(
    'highlight-component',
    {
      description: 'Highlight the Vue component.',
      inputSchema:
        {
          componentName: z.string().describe('by componentName (the component\'s name, not uid)'),
        },
    },
    async ({ componentName }) => {
      await ctx.rpcServer.highlightComponent({ componentName });
      return {
        content: [{
          type: 'text',
          text: 'ok',
        }],
      }
    },
  )

  server.registerTool(
    'get-router-info',
    {
      description: 'Get the Vue router info in JSON structure format.',
    },
    async () => {
      const res = await ctx.rpcServer.getRouterInfo();
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    },
  )

  server.registerTool(
    'get-pinia-state',
    {
      description: 'Get the Pinia state in JSON structure format.',
      inputSchema: {
        storeName: z.string(),
      }
    },
    async ({ storeName }) => {
      const res = await ctx.rpcServer.getPiniaState({ storeName });
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    },
  )

  server.registerTool(
    'get-pinia-tree',
    {
      description: 'Get the Pinia tree in JSON structure format.',
    },
    async () => {
      const res = await ctx.rpcServer.getPiniaTree();
      return {
        content: res.map(r => ({
          type: 'text',
          text: stringify(r),
        }))
      }
    },
  )

  return server;
}
