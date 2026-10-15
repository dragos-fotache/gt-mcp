# T08-S1 isolated verification environment preflight

## Disposition and boundaries

Environment qualification PASS for an expressly isolated synthetic fixture only.
This is NOT production runtime behavior, QA suite, backend/host/browser or release
acceptance. Production source c0 repair remains open; no compiled target was
imported or executed and no runtime relay was issued. QA remains HOLD/CLOSED.

Retained approved GNOME Keyring51.1/gcr3.41.2 provisioning was reverified, not
silently assumed alive from T06. Initial archive-name selection failed because
retained filenames were renamed; that was not a provider/checksum pass. Correct
explicit archive selection matches approved repository SHA-256s:

- GNOME Keyring: 8e6dc27e40ebadae6569098dff9fffcad4ca9f67c211951f80a17c01485b4de4
- gcr: 790e5564c8560118f05452609ec1db90b928e25ca21a692ad23a954fd98eb37d

Extracted daemon and libgck/libgcr-base/libgcr-ui actual bytes match those archives.
Daemon version51.1; existing host libraries remain part of the qualified environment,
not a self-contained packaged provider claim. No new downloads/system packages/
global installs/settings or project dependency changes.

## Fresh isolated qualification (all exit0)

Coordinator authored private small launcher/inner control and built-in-only TLS
probe; bash -n launchers and pinned Node --check probe PASS. Launcher env-i uses
new restrictive ext4 HOME/run/profile/cache roots and separate owned tmpfs TEMP,
private dbus-run-session, portable secrets-only foreground daemon, synthetic stdin
unlock password (never printed/argv/env), explicit Node24.21.0/npm11.19.0 and
private library prefix. No ambient bus/keyring/home/proxy/Google/backend/Android.

Observed qualification:

1. Supported ext4 fixture roots and pinned toolchain confirmed.
2. New unlocked persistent login collection; libsecret synthetic store/read/equality/
   clear PASS, no payload printed.
3. New temporary fixture CA plus loopback server certificate; actual isolated
   loopback HTTPS via pinned Node's NODE_EXTRA_CA_CERTS/default verification PASS.
   No production diagnostic/insecure-origin/sender injection or target import.
4. Foreground daemon terminated/reaped normally, private bus exited, both owned
   ext4/tmpfs scopes removed. Independent file-existence checks confirm removal.

Failure policy retains scopes for named private cleanup when command/release is
uncertain. No force-termination of target persistence or failed-check hiding.
Locations/keys/bus/origin/password remain privately supplied placeholders, never
repository evidence. Next runtime relay must create NEW isolated provider/CA/data
scopes and freeze its final exact command/script/environment hashes; this successful
qualification does not leave a live provider or grant QA execution.

## Private control identity

- provider-launcher.sh: b5b925f88b4d2198f4f617f704b2015b086f9916217c7335822785c99abe6f6a
- provider-inner.sh: 823d58a80d25d9098f1f4b599f747e753dcae9df121055a9fcf707525f1c6698
- tls-qualify.mjs: 72f33829fce14095746ee6c930f72ba2d1df6d83bdba700ecd263c4b33cc7a9d

No exhaustive provider/OS sandbox/network campaign or real-backend certification
is inferred. Existing mandatory owning/relevant regression gates still require
accepted compiled artifact and actual independent observations.
