// Violation control: direct Socket construction.
import net from "node:net";
new net.Socket();
export const syntheticQaControl = "net-socket";
