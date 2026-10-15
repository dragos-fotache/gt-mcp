// Violation control: prototype-level listener registration without going
// through construction.
import { EventEmitter } from "node:events";
const bare = Object.create(EventEmitter.prototype);
bare.on("synthetic-qa", () => {});
export const syntheticQaControl = "events-prototype";
