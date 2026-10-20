# Local stdio MCP server

The server uses version-2 configuration and one encrypted credential record.

Run the absolute installed server with Node.js 24 or later and an absolute normalized config
selection, with the intended Node selected on PATH. Missing selection/config provides an unavailable
seven-tool catalogue; invalid selected config fails configuration_required. A selected
credential/key/ ownership failure is recovery_unavailable. A null-account or signed-out profile
requires trusted local login. Logs/errors never print the config path or credentials.

```sh
node "<absolute application directory>/dist/protocol/server.js" --config "<CONFIG>"
```

See [setup/login](login.md) for the strict version-2 config and separate version-1 login settings.
No anchorRoot, binding descriptor, operation journal, migration, provider override, per-routine
permission prompt or CLI write-enable flag exists. The trusted startup snapshot is fixed; editing
config does not enable writes in a running process. Restart deliberately after an operator
configuration change.

Six read tools expose canonical domain results: search_exercises, get_exercise, list_workouts,
get_workout, list_routines and get_routine. create_routine accepts name/exercises, rejects obsolete
operationId, and returns routineId/status:saved only after validated backend confirmation. Only
strict operator writesEnabled:true permits creation; omitted/false defaults to disabled before
mutations. Any connected local client shares that operator trust. Authentication, complete
validation, visibility, origin and current account/session fences still apply.

Each creation is independent and non-idempotent. Repeating identical content can create another
routine. Eligible bounded transport/auth retry within a call retains exact resource
method/route/bytes/key, but tool-level creation failures are retryable:false. After interruption,
unsent steps stop; available authorized context reports routineId, lastConfirmedStep and
outcomeUnknown. A canceled/disconnected host may receive no reply. No routine bodies, identities or
final receipts are persisted for replay. Hosts must not automatically repeat creation after a lost
reply or reconnect. Startup performs no autonomous creation. Use
[manual recovery guidance](recovery.md) before deliberately trying again.

The restricted profile holds credentials.enc and owner.lock, plus possible private replacement
temporary files. No temporary file is promoted on startup. Pending refresh token/body/key remain
encrypted and retain their exact auth recovery identity; they are independent of creation.

Active calls hold exclusive profile ownership. Trusted CLI lifecycle/login/removal requires no
active owner. Signal/EOF cancellation fences results and settles begun auth persistence. Never send
login/logout through model tools. Only MCP frames go to stdout; trusted CLI diagnostics use fixed
safe stderr text. Fitness data may remain in host/model transcripts; local removal cannot erase
them. The credential store does not gate on filesystem type; required permissions, safe paths,
atomic replacement/fsync and actual IO must work. No independent snapshot rollback detection or
power-loss certification is claimed.

## Multiple clients sharing one profile

The server validates credentials at startup and releases the owner; connected idle servers hold no
lock. Calls sharing one profile wait cancellably and serialize under exclusive ownership through
result delivery. Each call reloads credentials and captures its current session generation. Idle
servers permit trusted local sign-out/login; active calls still exclude those actions. Same-account
session changes are observed by later calls; profile/account replacement requires restart. Operator
config and writesEnabled remain a fixed startup snapshot. The acquisition limit is 60 seconds,
separate from per-worker storage.timeoutMs. Cancellation of a pending result write closes the
connection before releasing ownership. Use the
[compatible update procedure](installation.md#updating-a-compatible-installation) to replace an
older lifetime-owner server. A surviving old process can still hold the lock; changing files alone
does not replace running processes.

## Operator budgets

Optional transportBudgets fields are safe integers with these defaults and inclusive ranges. Byte
budgets apply to serialized request/response/metadata/result bytes; maxHeaderCount and maxAttempts
are counts, and names ending in Ms are milliseconds. Omitted fields retain their defaults. Invalid
or unknown configuration fields fail closed; baseRetryDelayMs must not exceed maxRetryDelayMs.

| Field                       | Default | Inclusive range |
| --------------------------- | ------- | --------------- |
| maxRequestBytes             | 262144  | 64..16777216    |
| maxRequestTargetBytes       | 4096    | 64..65536       |
| maxResponseBytes            | 1048576 | 64..16777216    |
| maxProjectedResultBytes     | 1048576 | 64..16777216    |
| maxHeadBytes                | 32768   | 4096..131072    |
| maxHeaderCount              | 100     | 10..1000        |
| perAttemptTimeoutMs         | 10000   | 50..120000      |
| totalDeadlineMs             | 60000   | 100..600000     |
| maxAttempts                 | 3       | 1..5            |
| baseRetryDelayMs            | 500     | 0..10000        |
| maxRetryDelayMs             | 5000    | 0..60000        |
| storage.timeoutMs           | 5000    | 1..15000        |
| protocol.maxToolResultBytes | 4194304 | 4096..67108864  |

storage.timeoutMs bounds the local worker request; protocol.maxToolResultBytes bounds the complete
canonical MCP tool result, including serialized text and structured content. A result exceeding its
allowance returns result_too_large, never truncated successful data. Transport
per-attempt/deadline/attempt budgets bound eligible within-call HTTP retry; they do not authorize
host/tool repetition.
