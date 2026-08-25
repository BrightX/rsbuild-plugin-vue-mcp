import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from "node:fs";
import type { Server } from "node:http";
import type { Compiler, DevServerMiddleware, RspackPluginInstance } from "@rspack/core";
import { WebSocketServer } from "ws";
import type { PluginVueMcpOptions, RpcFunctions } from "./types.ts";
import { createVueMcpContext } from "./mcp/context.ts";
import { createRPCServer } from "./core/dev-rpc.ts";
import { createMcpServerDefault } from "./mcp/server.ts";
import { setupRspackRoutes } from "./mcp/connect.ts";

function getVueMcpPath(): string {
  const pluginPath = path.dirname(fileURLToPath(import.meta.url));
  return pluginPath.replaceAll('\\', '/');
}

function getOverlayBootstrapPath(): string {
  const fileUrl = new URL('./overlay-bootstrap.js', import.meta.url);
  return fileURLToPath(fileUrl).replaceAll('\\', '/')
    .replace('/src/', '/dist/');
}

const PLUGIN_NAME = "VueMcpPlugin";

export class VueMcpPlugin implements RspackPluginInstance {
  public readonly name = PLUGIN_NAME;
  private readonly options: PluginVueMcpOptions<Compiler>

  constructor(options: PluginVueMcpOptions<Compiler> = {}) {
    this.options = options;
  }

  private applyInspector(compiler: Compiler): void {
  }

  private applyHtmlInjection(compiler: Compiler): void {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const hooks = compiler.rspack.HtmlRspackPlugin.getCompilationHooks(compilation);
      if (!hooks.alterAssetTags) {
        return;
      }
      hooks.alterAssetTags.tap(PLUGIN_NAME, (data) => {
        const overlayPath = getOverlayBootstrapPath();
        try {
          const js = fs.readFileSync(overlayPath, { encoding: 'utf8' });
          data.assetTags.scripts.push({
            tagName: 'script',
            voidTag: false,
            attributes: { id: 'overlay-bootstrap.js' },
            innerHTML: js,
          });
          console.log('  ➜  VueDevtools MCP: injection html => overlay-bootstrap.js')
        } catch (e) {
          // ignore
        }
        return data
      })
    })
  }

  apply(compiler: Compiler): void {
    if (compiler.options.mode === 'production') return;
    const ctx = createVueMcpContext();
    const vueMcpPath = getVueMcpPath()
    const wsPath = '/__vue-devtools-mcp-ws';

    this.applyInspector(compiler);
    this.applyHtmlInjection(compiler);

    compiler.hooks.environment.tap(PLUGIN_NAME, () => {
      if (compiler.options.devServer === false) {
        return;
      }
      compiler.options.devServer ??= {};
      const rawSetupMiddlewares = compiler.options.devServer.setupMiddlewares;
      compiler.options.devServer.setupMiddlewares = (middlewares: DevServerMiddleware[], devServer) => {
        if (typeof rawSetupMiddlewares === 'function') {
          middlewares = rawSetupMiddlewares.call(compiler.options.devServer, middlewares, devServer);
        }
        if (!devServer) {
          console.warn('❌ rspack-dev-server is not defined here.');
          return middlewares;
        }
        const httpServer = devServer.server as Server;
        if (!httpServer) {
          console.error('❌ [vue-devtools-mcp] no rspack devServer.server, require @rspack/core >= 1.3')
          return middlewares;
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

        const { printUrl = true, mcpPath = '/__mcp' } = this.options;

        setupRspackRoutes(mcpPath, async () => {
          let mcp = createMcpServerDefault(this.options, ctx);
          mcp = await this.options.mcpServerSetup?.(mcp, compiler) || mcp;
          return mcp;
        }, middlewares)

        if (printUrl) {
          const port = (compiler.options.devServer || {}).port || 8080;
          const mcpUrl = `http://localhost:${port}${mcpPath}/mcp`
          setTimeout(() => {
            if (devServer.logger?.info) {
              devServer.logger.info(`  ➜  MCP:     Server is running at ${mcpUrl}`);
            } else {
              console.log(`  ➜  MCP:     Server is running at ${mcpUrl}`);
            }
          }, 300)
        }

        return middlewares;
      };
    })
  }
}
