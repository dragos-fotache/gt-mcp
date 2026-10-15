// Synthetic deny-control: forbidden node:http2 connect during import.
//
// The probe patches the http2 export, so no connection is attempted.
// Expected probe outcome: violations ["http2:connect"], import fails.

import { connect } from "node:http2";

connect("http://127.0.0.1:1");

export const CONTROL = "synthetic-qa-t03-deny-http2-unreached";
