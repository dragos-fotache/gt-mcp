# T05-f1 verification adjudication — no production change

**Disposition:** initial owning run remains FAILED220/226,6cases,0skips. Focused
unchanged-target production-limits observation remains FAILED17/20,3cases,0skips.
All191frozen hashes unchanged before/after both runs. The observation gap is now
closed; initial evidence is preserved, not overwritten or counted passed.

Coordinator reviewed required behavior and performed small native/owned-loopback
comparisons. The six observed failures require verification fixture/oracle repair,
not a production API/behavior/shared-contract change. c3 stays held. This document
is a COMMON public specification/evidence decision, not implementation/test-source
relay between roles. QA-specific edit instructions are separately owned/private.

## 1. Synchronous fence checks: required ordering, not an arbitrary maximum

The public interface requires captured-binding checks before each handoff and
before delivering a received outcome, with abort/deadline rechecks. It does NOT
prohibit an additional synchronous isCurrent check that enforces the same captured
binding. Preserve required order and actual attempt/handoff counts; do not impose
an exact number of incidental synchronous guard calls beyond the specified minimum
boundaries. A guard failure must still suppress send/delivery with correct
uncertainty. This does not authorize extra HTTP calls or workflow steps.

## 2. Strict arguments versus additive backend response data

Unknown own query fields, including an own member named __proto__, MUST reject
invalid_arguments before dispatch. The permitted additive-name preservation rule
applies to backend resource/convenience JSON, not unknown strict tool/query input
fields. Verify both: strict rejection without prototype mutation, and positive
own-data preservation/no pollution on an otherwise-valid backend response. No
relaxation of additionalProperties or T03 validation is permitted.

## 3. Import smoke baseline: initialize harness-owned stdio first

Pinned Node24.21.0 native comparisons, clean child env and bounded execution:
- empty import baseline: no resource delta;
- import node:http ALONE: PipeWrap+1, no stdout/stderr output;
- import existing public domain entry: no delta;
- import transport public entry: the SAME PipeWrap+1, no unexpected output;
- materialize process.stderr BEFORE the baseline snapshot: both node:http and
  transport imports have ZERO delta; materializing all harness-owned stdio also
  yields zero delta. Other sampled core modules did not cause that cold delta.

This identifies lazy wrapping of the ALREADY-OPEN stderr descriptor in the native
HTTP module path, not an application socket/file/process leak. Coordinator source
audit confirms T05 has no top-level IO/output/timer/network/process/handler action.
Initialize normal harness-owned stdio before measuring resource/listener deltas;
retain exact zero NEW delta, prompt child exit, empty unexpected output, and the
source audit. Do NOT whitelist arbitrary PipeWrap growth, ignore whole resource
classes or build another interceptor. No weakening of actual import IO prohibition.

## 4. Truncation requires an actual valid stimulus

A fixture must construct actual bytes from its string data before selecting a
partial body. A local fixture TypeError is not evidence about transport. Establish
that the fixture supplied a declared body length and a shorter transmitted payload,
then retain malformed/internal_error, no success/partial data and no automatic
retry assertions. A write callback proves local handoff, not remote application
receipt; evidence must not overclaim that distinction.

## 5. Malformed framing is not guaranteed to be accepted and ignored

Native Node24.21.0 HTTP client against an owned raw chunked fixture rejects a
Content-Length trailer with HPE_INVALID_CONTENT_LENGTH. No production code is
needed to reproduce this framing rejection. Mapping that malformed response to
internal_error is correct; "trailers never supply/override classification" does
not require successful acceptance of forbidden HTTP framing.

Retain this hostile case as a fail-closed/no-retry assertion. A separate normal
trailer case already demonstrates valid chunked success. For direct metadata-
nonoverride evidence, use a native-accepted trailer (the small native comparison
accepted Retry-After in trailers) and assert it cannot set/replace header-derived
classification/retry metadata. No parser/TLS/safety relaxation to force success.

## 6. Peer closure must be observed on a draining fixture

Small owned-loopback comparison on the same Node pin:
- native HTTP client explicitly destroys an upgraded socket, but a server fixture
  that never consumes request bytes does not report its local close within100ms;
- drain those incoming bytes: the same native destroy produces observed peer close;
- production transport against the draining fixture returns internal_error and
  peer close is observed BEFORE fixture teardown.

An unread paused server stream can withhold end/close notification; it is not
proof the client leaked an upgraded socket. Make the raw fixture consume request
bytes (or equivalent small request barrier), then retain bounded observed peer
closure BEFORE cleanup. Do not extend waits until they happen to pass, weaken
closure assertions or force-close the server before measuring the client effect.

## Window and evidence

The f1execution/observation windows are now CLOSED. QA may repair only the affected
core test assertions/fixtures and smoke child under its separate edit grant, with
focused source checks. No general-harness work. c3 production/build/install remains
HELD, no Developer fix assigned. A new named active inventory precedes focused
execution of the four affected suites; then the final full bounded owning suite,
relevant regressions and clean locked reproduction remain mandatory. No acceptance,
real writes/live services/.pi/staging/commits or successor authorization.
