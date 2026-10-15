// Synthetic deny-control: forbidden node:tls connect during import.
//
// The probe patches the tls export, so no handshake is attempted.
// Expected probe outcome: violations ["tls:connect"], import fails.

import { connect } from "node:tls";

connect(1, "127.0.0.1");

export const CONTROL = "synthetic-qa-t03-deny-tls-unreached";
