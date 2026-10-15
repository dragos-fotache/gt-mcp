// Small child import observation, not an OS sandbox or general API interceptor.
// Executed only by the expressly frozen config-import suite relay.
const beforeEvents = new Map(
  process.eventNames().map((name) => [name, process.listenerCount(name)]),
);
// Observe persistent timers/network/child handles only; loader filesystem
// requests are not a reliable quiescence oracle for dynamic module loading.
const watchedResources = new Set([
  "Timeout",
  "TCPSocketWrap",
  "TCPServerWrap",
  "UDPWrap",
  "ProcessWrap",
]);
const resources = () =>
  process
    .getActiveResourcesInfo()
    .filter((name) => watchedResources.has(name))
    .sort();
const beforeResources = resources();
const entry = await import("../../dist/protocol/index.js");
const afterResources = resources();
const changedEvents = process
  .eventNames()
  .filter((name) => process.listenerCount(name) !== (beforeEvents.get(name) ?? 0));
for (const [name, count] of beforeEvents) {
  if (process.listenerCount(name) !== count && !changedEvents.includes(name))
    changedEvents.push(name);
}
process.stdout.write(
  JSON.stringify({
    exports: Object.keys(entry).sort(),
    defaultBudget: entry.DEFAULT_MAX_TOOL_RESULT_BYTES,
    changedEvents: changedEvents.map(String),
    beforeResources,
    afterResources,
  }),
);
