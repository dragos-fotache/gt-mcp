// Synthetic deny-control: forbidden node:dns/promises lookup during import.
//
// The probe patches the dns/promises export, so no resolution is attempted.
// Expected probe outcome: violations ["dns-promises:lookup"], import fails.

import { lookup } from "node:dns/promises";

lookup("synthetic.invalid");

export const CONTROL = "synthetic-qa-t03-deny-dns-unreached";
