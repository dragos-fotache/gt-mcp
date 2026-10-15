// Violation control: register-then-remove handlers must not evade.
const handler = () => {};
process.on("exit", handler);
process.removeListener("exit", handler);
export const syntheticQaControl = "listener";
