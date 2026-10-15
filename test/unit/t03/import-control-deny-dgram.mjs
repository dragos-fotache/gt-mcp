// Synthetic deny-control: forbidden node:dgram socket during import.
//
// The probe patches the dgram export, so no socket is created.
// Expected probe outcome: violations ["dgram:createSocket"], import fails.

import { createSocket } from "node:dgram";

createSocket("udp4");

export const CONTROL = "synthetic-qa-t03-deny-dgram-unreached";
