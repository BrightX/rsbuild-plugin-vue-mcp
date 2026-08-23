import type { VueMcpContext } from "../types.ts";
import { createHooks } from "hookable";

export function createVueMcpContext(): VueMcpContext {
  return {
    hooks: createHooks(),
    rpc: null!,
    rpcServer: null!,
  }
}
