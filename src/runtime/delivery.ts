/** Private runtime/protocol handoff; no capability is added to public runtimes. */
import type { ToolName } from "../domain/index.js";

export interface RuntimeInvocation {
  readonly result: unknown;
  readonly signal?: AbortSignal;
  readonly cancelled?: () => boolean;
  readonly deliverable?: () => boolean;
  release(): Promise<void>;
}
export type RuntimeDelivery = (
  tool: ToolName,
  args: unknown,
  signal: AbortSignal,
) => Promise<RuntimeInvocation>;

const DELIVERIES = new WeakMap<object, RuntimeDelivery>();
export function registerRuntimeDelivery(runtime: object, delivery: RuntimeDelivery): void {
  DELIVERIES.set(runtime, delivery);
}
export function runtimeDelivery(runtime: object): RuntimeDelivery | undefined {
  return DELIVERIES.get(runtime);
}
