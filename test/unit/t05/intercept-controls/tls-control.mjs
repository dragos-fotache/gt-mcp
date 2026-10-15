// Violation control: tls connection creation.
import { connect } from "node:tls";
connect(1, "127.0.0.1");
export const syntheticQaControl = "tls-control";
