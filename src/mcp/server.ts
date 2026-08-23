import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { version } from '../../package.json'
import type { PluginVueMcpOptions, VueMcpContext } from "../types.ts";
import type { RsbuildPluginAPI } from "@rsbuild/core";
import type { Compiler as RspackCompiler } from "@rspack/core";
import { nanoid } from "nanoid";
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
    'get-component-tree',
    {
      description: 'Get the Vue component tree in markdown tree syntax format.',
    },
    async () => {
      return new Promise((resolve, reject) => {
        const eventName = nanoid()
        ctx.hooks.hookOnce(eventName, (res) => {
          resolve({
            content: [{
              type: 'text',
              text: stringify(res),
            }],
          })
        })
        ctx.rpcServer.getInspectorTree({ event: eventName })
          .catch(e => {
            console.error(e);
            reject(e)
          })
      })
    },
  );

  server.registerTool(
    'get-component-state',
    {
      description: 'Get the Vue component state in JSON structure format.',
      inputSchema: { componentName: z.string(), }
    },
    async ({ componentName }) => {
      return new Promise((resolve, reject) => {
        const eventName = nanoid()
        ctx.hooks.hookOnce(eventName, (res) => {
          resolve({
            content: [{
              type: 'text',
              text: stringify(res),
            }],
          })
        })
        ctx.rpcServer.getInspectorState({ event: eventName, componentName })
          .catch(e => {
            console.error(e);
            reject(e)
          })
      })
    },
  )

  server.registerTool(
    'edit-component-state',
    {
      description: 'Edit the Vue component state.',
      inputSchema: {
        componentName: z.string(),
        path: z.array(z.string()),
        value: z.string(),
        valueType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
      }
    },
    async ({ componentName, path, value, valueType }) => {
      return new Promise((resolve, reject) => {
        ctx.rpcServer.editComponentState({ componentName, path, value, valueType }).then(() => {
          resolve({
            content: [{
              type: 'text',
              text: 'ok',
            }],
          })
        }).catch(e => {
          console.error(e);
          reject(e)
        })
      })
    },
  )

  server.registerTool(
    'highlight-component',
    {
      description: 'Highlight the Vue component.',
      inputSchema:
        {
          componentName: z.string(),
        },
    },
    async ({ componentName }) => {
      return new Promise((resolve, reject) => {
        ctx.rpcServer.highlightComponent({ componentName }).then(() => {
          resolve({
            content: [{
              type: 'text',
              text: 'ok',
            }],
          })
        }).catch(e => {
          console.error(e);
          reject(e)
        })
      })
    },
  )

  server.registerTool(
    'get-router-info',
    {
      description: 'Get the Vue router info in JSON structure format.',
    },
    async () => {
      return new Promise((resolve, reject) => {
        const eventName = nanoid()
        ctx.hooks.hookOnce(eventName, (res) => {
          resolve({
            content: [{
              type: 'text',
              text: stringify(res),
            }],
          })
        })
        ctx.rpcServer.getRouterInfo({ event: eventName })
          .catch(e => {
            console.error(e);
            reject(e)
          })
      })
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
      return new Promise((resolve, reject) => {
        const eventName = nanoid()
        ctx.hooks.hookOnce(eventName, (res) => {
          resolve({
            content: [{
              type: 'text',
              text: stringify(res),
            }],
          })
        })
        ctx.rpcServer.getPiniaState({ event: eventName, storeName })
          .catch(e => {
            console.error(e);
            reject(e)
          })
      })
    },
  )

  server.registerTool(
    'get-pinia-tree',
    {
      description: 'Get the Pinia tree in JSON structure format.',
    },
    async () => {
      return new Promise((resolve, reject) => {
        const eventName = nanoid()
        ctx.hooks.hookOnce(eventName, (res) => {
          resolve({
            content: [{
              type: 'text',
              text: stringify(res),
            }],
          })
        })
        ctx.rpcServer.getPiniaTree({ event: eventName })
          .catch(e => {
            console.error(e);
            reject(e)
          })
      })
    },
  )

  return server;
}
