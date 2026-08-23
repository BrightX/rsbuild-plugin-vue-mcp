import type { IncomingMessage, ServerResponse } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { RsbuildDevServer } from "@rsbuild/core";
import type { DevServerMiddleware } from "@rspack/core";

async function mcpHandlerStateless(server: McpServer, req: IncomingMessage, res: ServerResponse) {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: void 0
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
    res.on('close', () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        }
      ));
    }
  }
}

export function setupRoutes<DEV extends RsbuildDevServer>(base: string, getServer: () => Promise<McpServer>, dev: DEV) {

  dev.middlewares.use(`${base}/mcp`, async (req, res) => {
    // Create a new server per session and connect it to the transport
    const server = await getServer();
    await mcpHandlerStateless(server, req, res)
  })
}

export function setupRspackRoutes(base: string, getServer: () => Promise<McpServer>, middlewares: DevServerMiddleware[]) {
  middlewares.push({
    name: 'vue-devtools-mcp',
    path: `${base}/mcp`,
    async middleware(req: IncomingMessage, res: ServerResponse) {
      // Create a new server per session and connect it to the transport
      const server = await getServer();
      await mcpHandlerStateless(server, req, res)
    }
  })
}
