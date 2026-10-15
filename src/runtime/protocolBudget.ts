/** Shared private config/factory budget policy; no IO. */
export const DEFAULT_MAX_TOOL_RESULT_BYTES = 4194304;

export function isToolResultBudget(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= 4096 && value <= 67108864
  );
}
