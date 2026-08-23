import type { BirpcGroupReturn, ChannelOptions, EventOptions } from "birpc";
import { createBirpcGroup } from "birpc";
import type { WebSocket as WebSocketClient, WebSocketServer } from "ws";

const channelCache = new WeakMap<WebSocketClient, ChannelOptions>()

export function createRPCServer<ClientFunction, ServerFunctions extends object>(
  ws: WebSocketServer,
  functions: ServerFunctions,
  options: EventOptions<ClientFunction, ServerFunctions> = {},
): BirpcGroupReturn<ClientFunction> {
  const group = createBirpcGroup<ClientFunction, ServerFunctions>(
    functions,
    () => Array.from(ws?.clients || [])
      .map((channel: WebSocketClient): ChannelOptions | undefined => {
        if (channel.readyState === channel.CLOSED) return void 0;
        const cached = channelCache.get(channel);
        if (cached) return cached;
        const options: ChannelOptions = {
          // these are required when using WebSocket
          on: fn => channel.on('message', fn),
          post: data => channel.send(data),
          serialize: v => JSON.stringify(v),
          deserialize: v => JSON.parse(v),
        }
        channelCache.set(channel, options)
        return options
      })
      .filter(c => !!c),
    options,
  )

  ws.on('connection', () => {
    group.updateChannels()
  })

  return group.broadcast
}
