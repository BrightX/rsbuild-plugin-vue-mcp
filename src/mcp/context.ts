import type { VueMcpContext } from "../types.ts";

export function createVueMcpContext(): VueMcpContext {
  return {
    rpcServer: null!,
  }
}
