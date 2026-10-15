// Timeout-path control: blocks the thread synchronously with no guarded API
// and no event-loop handle, so only the runner's kill budget can end it.
// The runner must kill and reap it within budget.
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000);
export const syntheticQaControl = "hang";
