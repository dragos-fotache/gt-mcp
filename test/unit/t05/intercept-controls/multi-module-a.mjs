// Benign multi-module chain part one (must import cleanly: no IO performed).
import { syntheticQaLeaf } from "./multi-module-b.mjs";
export const syntheticQaChain = `a:${syntheticQaLeaf}`;
