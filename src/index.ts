import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from "node:fs/promises";
import type { Server } from "node:http";
import type { RsbuildPlugin, RsbuildPluginAPI } from "@rsbuild/core";
import { WebSocketServer } from 'ws';
import type { PluginVueMcpOptions, RpcFunctions } from "./types.ts";
import { createVueMcpContext } from "./mcp/context.ts";
import { createRPCServer } from "./core/dev-rpc.ts";
import { createMcpServerDefault } from "./mcp/server.ts";
import { setupRoutes } from "./mcp/connect.ts";

function getVueMcpPath(): string {
  const pluginPath = path.dirname(fileURLToPath(import.meta.url));
  return pluginPath.replaceAll('\\', '/');
}

function getOverlayBootstrapPath(): string {
  const fileUrl = new URL('./overlay-bootstrap.js', import.meta.url);
  return fileURLToPath(fileUrl).replaceAll('\\', '/')
    .replace('/src/', '/dist/');
}

export const pluginVueMcp = (options: PluginVueMcpOptions<RsbuildPluginAPI> = {}): RsbuildPlugin => ({
  name: 'plugin-vue-mcp',
  enforce: 'pre',
  apply: 'serve',
  async setup(api: RsbuildPluginAPI) {
    const ctx = createVueMcpContext();
    const vueMcpPath = getVueMcpPath()
    const wsPath = '/__vue-devtools-mcp-ws';

    // overlay injection appendTo
    if (options.appendTo) {
      let firstInjected = false;
      const reg = new RegExp(options.appendTo);
      api.transform({
        test: {
          and: [
            /[\\/]src[\\/].+\.(js|jsx|mjs|ts|tsx|mts)$/,
            reg,
          ],
          not: /[\\/]node_modules[\\/]/,
        },
        targets: ['web'],
        order: 'pre',
      }, (context) => {
        if ((api.context.action && api.context.action !== 'dev') || firstInjected) return context;
        let code = context.code;
        if (typeof code !== 'string') return context;
        firstInjected = true;
        console.log('  ➜  VueDevtools MCP: injection `overlay.js` to:', context.resource)
        return `${code}\n import '${vueMcpPath}/overlay.js';\n`;
      });
    }

    // overlay injection html
    if (!options.appendTo) {
      api.modifyHTMLTags(async (tags) => {
        const overlayPath = getOverlayBootstrapPath();
        try {
          const js = await fs.readFile(overlayPath, { encoding: 'utf8' })
          tags.headTags.push({
            tag: 'script',
            attrs: { id: 'overlay-bootstrap.js' },
            children: js,
          })
          console.log('  ➜  VueDevtools MCP: injection html => overlay-bootstrap.js')
        } catch (e) {
          // ignore
        }
        return tags
      })
    }

    api.onBeforeStartDevServer(async ({ server }) => {
      if (!server) {
        console.error('❌ [vue-devtools-mcp] no rebuild devServer, requires Rsbuild >= 1.2.9')
        return;
      }
      const httpServer = server.httpServer as unknown as Server;
      if (!httpServer) {
        console.warn('❌ [vue-devtools-mcp] HTTP Server not found, cannot start WebSocket server.');
        return;
      }
      const wss = new WebSocketServer({ noServer: true, })
      wss.on('connection', () => {
        console.debug('✅ Client connected to vue-devtools-mcp WebSocket!');
      });

      // 绑定websocket
      httpServer.on('upgrade', (request, socket, head) => {
        const { pathname } = new URL(request.url || '', 'wss://base.url');
        if (pathname !== wsPath) {
          return;
        }
        wss.handleUpgrade(request, socket, head, (client) => {
          wss.emit('connection', client, request)
        })
      })

      ctx.rpcServer = createRPCServer<RpcFunctions, any>(wss, {}, { timeout: 3_000, })

      const { printUrl = true, mcpPath = '/__mcp' } = options;

      setupRoutes(mcpPath, async () => {
        let mcp = createMcpServerDefault(options, ctx);
        mcp = await options.mcpServerSetup?.(mcp, api) || mcp;
        return mcp;
      }, server)

      if (printUrl) {
        const mcpUrl = `http://localhost:${server.port}${mcpPath}/mcp`
        setTimeout(() => {
          if (api.logger?.info) {
            api.logger.info(`  ➜  MCP:     Server is running at ${mcpUrl}`);
          } else {
            console.log(`  ➜  MCP:     Server is running at ${mcpUrl}`);
          }
        }, 300)
      }
    })
  },
})
