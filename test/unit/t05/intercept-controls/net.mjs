// Violation control: socket connect (guarded before connecting).
import net from "node:net";
net.connect(1, "127.0.0.1");
export const syntheticQaControl = "net";
