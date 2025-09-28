import { Effect, Layer, ManagedRuntime } from 'effect';

import { DrizzleDatabaseLayer } from './layers/drizzle.layer.js';
import { LoggerServiceLayer } from './layers/logger.layer.js';
import { StorageServiceLayer } from './layers/storage.layer.js';

// Combine all service layers
const AppLive = Layer.mergeAll(
	DrizzleDatabaseLayer,
	StorageServiceLayer,
	LoggerServiceLayer,
);

// Create a managed runtime with all services
export const runtime = ManagedRuntime.make(AppLive);

// Helper function to run Effects with the runtime
export const runWithRuntime = <A, E>(effect: Effect.Effect<A, E>) =>
	runtime.runPromise(effect);
