# SYNTHETIC QA TEST-ONLY TLS MATERIAL

These intentionally public/disposable RSA keys and certificates exist ONLY for
isolated T05 loopback transport acceptance. NEVER install them in any trust store,
use them outside fixtures, or treat them as production credentials.

Generated locally with OpenSSL3.6.5, no network/personal files or trust changes.
Three independent self-signed pairs: valid IP127.0.0.1/::1 (2026–2036), expired
IP127.0.0.1/::1 (2024–2025), valid wrong-host DNS example.invalid (2026–2036).
Each pair's public keys match; openssl verify sslserver/IP127.0.0.1 passes for
valid and fails specifically for expiry/IP mismatch respectively for negatives.
Dates are fixed fixture limitations, not a fake service clock.

Secrets scanners should classify only these specifically labelled fixture keys
as synthetic public test material; this is NOT a blanket key/PEM exemption.
