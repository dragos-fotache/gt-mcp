/**
 * GymTracka MCP foundation barrel. Pure type re-exports only; this module has
 * no runtime exports. Importing it starts no processes, listeners, watchers, or
 * timers, and performs no network, private-state, stdout, or exit-code effects.
 */
export type {
  BackendClient,
  BindingCheckPoint,
  Clock,
  CompanionBinding,
  CreationMutationMethod,
  DraftMutationIdentity,
  FaultInjector,
  IntentStore,
  MutationIdentity,
  MutationIdentityBase,
  OperationRepository,
  PopulateMutationIdentity,
  ProfileBinding,
  ProfileStore,
  RoutineCreationService,
  SaveMutationIdentity,
  SchemaCodec,
  SessionProvider,
  Sleeper,
  Transport,
  TrustedConfiguration,
  UuidGenerator,
} from "./contracts/index.js";
