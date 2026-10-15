// Violation control: http2 session creation.
import { connect } from "node:http2";
connect("http://127.0.0.1:1");
export const syntheticQaControl = "http2-control";
