// Violation control: node:timers named creation plus clear (no evasion).
/* global clearTimeout */

import { setTimeout } from "node:timers";
const handle = setTimeout(() => {}, 10000);
clearTimeout(handle);
export const syntheticQaControl = "timers-node";
