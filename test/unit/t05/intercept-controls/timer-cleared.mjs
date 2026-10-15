/* global clearTimeout, setTimeout */

// Violation control: cleared timers must not evade (creation still recorded).
const handle = setTimeout(() => {}, 10000);
clearTimeout(handle);
export const syntheticQaControl = "timer-cleared";
