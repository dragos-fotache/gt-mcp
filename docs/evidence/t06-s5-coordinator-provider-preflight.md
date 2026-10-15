# T06-S5 parent-regression provider reprovisioning

**Scope:** isolated fixture provisioning only, NOT S5 production acceptance or a
QA suite run. Existing T04 provider regression remains mandatory at parent gate.
No personal bus/keyring or system package install/daemon/configuration changes.

Initial metadata preflight found gnome-keyring-daemon missing from PATH and
inspected executable locations; secret-tool/busctl/dbus-daemon/dbus-run-session/
flock are present. /tmp is tmpfs; /var/tmp is ext4. No missing-provider skip or
parent pass claimed. Qualified private-provider inputs are now reprovisioned.

Read-only pacman -Si gnome-keyring gcr reports the SAME approved pinned versions:
GNOME Keyring1:51.1-1 x86_64 and gcr3.41.2-2. Downloaded exact archives from
fastly.mirror.pkgbuild.com HTTPS and verified the previously approved repository
SHA256s in T04 preflight before extracting usr/ into a NEW disposable prefix:

- GNOME Keyring archive:
  8e6dc27e40ebadae6569098dff9fffcad4ca9f67c211951f80a17c01485b4de4
- gcr archive:
  790e5564c8560118f05452609ec1db90b928e25ca21a692ad23a954fd98eb37d

sha256sum --check --strict both OK; isolated daemon --version reports51.1.
No pacman installation/hooks, global libraries or new project dependencies.
As in accepted T04, portable gcr plus existing host libraries are required;
this is not a self-contained packaged-provider or OS compatibility claim.

Prepared small coordinator-owned PRIVATE fixture launcher/inner control using
fresh ext4 sibling HOME/temp/run/profile/cache roots, env-i trusted pinned PATH,
portable library prefix and dbus-run-session. Only secrets component foreground
under that private bus; fresh synthetic stdin password never argv/env/log/evidence.
No inherited personal bus/control directory or GUI Unlock/Prompt. Bounded readiness
checks are owned fixture checks, not agent status polling. T04_PROVIDER_BUS/PARENT
relayed privately; locked negative remains terminal/no unqualified reset command.

bash -n launchers: PASS. Fresh isolated qualification: unlocked persistent login
collection, synthetic libsecret store/read/equality assertion/clear: PASS exit0.
No payload printed. Owned foreground daemon terminated/reaped on exit, private
bus exited, fresh disposable fixture roots removed. No production entry executed
and no QA suite ran; this qualifies fixture availability, not the production
adapter/encrypted transfer/persistence/race assertions of the mandatory QA suite.

Private launcher SHA256:
b635af1b5d38abc11122ce222d57ac08f3870693fd131eec906998f6720c621e
Private inner control SHA256:
8abed7b7149dda24a30ae12830d2780bde6292239a0585062e5e04016c151b54

Locations privately supplied at frozen relay, placeholders only in repository.
Next: AFTER exact source gates/inventory, parent selection can run under a NEW
owned private provider instance with full safe output/exit/hash/cleanup capture.
No actual writes/private/live backend/browser/Android, .pi/settings/trust edits,
staging/commits/release or successor granted by this preflight.
