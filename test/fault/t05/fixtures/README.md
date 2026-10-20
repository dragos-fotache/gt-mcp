# Synthetic TLS fixtures

These intentionally public, disposable RSA keys and certificates are only for isolated loopback
transport tests. Never install them in a trust store or use them as production credentials.

The three independent self-signed pairs represent:

- Valid IP addresses 127.0.0.1 and ::1, dated 2026–2036.
- Expired IP addresses 127.0.0.1 and ::1, dated 2024–2025.
- A valid certificate for the wrong host, example.invalid, dated 2026–2036.

Dates are fixed fixture limitations. Secret scanners may classify only these specifically labelled
keys as synthetic public material; this is not a blanket key/PEM exemption.
