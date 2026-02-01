# Effect Integration Plan for Mutate

## Overview

[Effect](https://effect.website/) is a powerful TypeScript library that provides a comprehensive solution for building type-safe, composable, and resilient applications. This document outlines how Effect can be integrated into the Mutate project to improve error handling, async operations, and overall code quality.

## Current Pain Points in Mutate

### 1. Error Handling

- **String-based errors** lose context and type information
- **Try-catch blocks** everywhere with manual error wrapping
- **No structured recovery** strategies for failures
- **Lost error context** when converting errors to strings

### 2. Async Operations

- **Manual retry logic** with setTimeout (prone to memory leaks)
- **No structured backoff** strategies
- **Complex async coordination** in mutation worker
- **Manual resource management** without guaranteed cleanup

### 3. Dependency Management

- **No dependency injection** framework
- **Tight coupling** between services
- **Difficult to test** due to hard dependencies
- **Manual service instantiation** throughout codebase

### 4. Data Validation

- **Zod validation** is separate from business logic
- **No composable validation** pipelines
- **Error messages** are not type-safe

## How Effect Solves These Problems

### Type-Safe Error Handling

```typescript
// Current approach
try {
	const result = await someOperation();
	return { success: true, data: result };
} catch (error) {
	return { success: false, error: error.message };
}

// Effect approach
Effect.gen(function* () {
	const result = yield* someOperation();
	return result;
}).pipe(
	Effect.catchTag('ConfigurationNotFound', () =>
		Effect.fail(new UserFacingError('Configuration not found')),
	),
);
```

### Built-in Retry Strategies

```typescript
// Current webhook retry
setTimeout(() => { this.attemptDelivery(delivery, secret); }, delayMs);

// Effect retry
deliverWebhook(payload, url).pipe(
  Effect.retry(
    Schedule.exponential(1000)
      |> Schedule.intersect(Schedule.recurs(5))
      |> Schedule.jittered
  )
)
```

### Dependency Injection

```typescript
// Effect services with automatic injection
const processMutation = Effect.gen(function* () {
	const db = yield* DatabaseService;
	const storage = yield* StorageService;
	const converter = yield* ConversionService;

	// Use services with full type safety
	const config = yield* db.getConfiguration(id);
	const result = yield* converter.convert(file, config);
	const upload = yield* storage.upload(result);

	return upload.url;
});
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### 1.1 Add Effect Dependencies

```bash
pnpm add effect @effect/schema @effect/platform @effect/platform-node
```

#### 1.2 Create Core Service Layers

**Database Service Layer:**

```typescript
// apps/api/src/services/effect/database.service.ts
export const DatabaseService = Effect.Tag<{
	getConfiguration: (id: string) => Effect.Effect<Configuration, ConfigNotFoundError>;
	updateJobStatus: (id: string, status: JobStatus) => Effect.Effect<void, DatabaseError>;
	transaction: <A, E>(effect: Effect.Effect<A, E>) => Effect.Effect<A, E | DatabaseError>;
}>();
```

**Storage Service Layer:**

```typescript
// apps/api/src/services/effect/storage.service.ts
export const StorageService = Effect.Tag<{
	upload: (key: string, buffer: Buffer) => Effect.Effect<UploadResult, StorageError>;
	generatePresignedUrl: (key: string) => Effect.Effect<string, StorageError>;
	delete: (key: string) => Effect.Effect<boolean, StorageError>;
}>();
```

#### 1.3 Define Error Types

```typescript
// apps/api/src/errors/index.ts
export class ConfigNotFoundError extends Data.TaggedError('ConfigNotFoundError')<{
	configurationId: string;
}> {}

export class FileValidationError extends Data.TaggedError('FileValidationError')<{
	reason: string;
	fileName: string;
}> {}

export class StorageError extends Data.TaggedError('StorageError')<{
	operation: 'upload' | 'download' | 'delete';
	key: string;
	cause?: unknown;
}> {}
```

### Phase 2: Critical Path Migration (Week 3-4)

#### 2.1 Refactor File Transformation Engine

**Target File:** `apps/api/src/services/mutate.ts`

**New Implementation:**

```typescript
const transformFile = (
	buffer: Buffer,
	config: Configuration,
): Effect.Effect<MutationResult, TransformationError, ConversionService> =>
	Effect.gen(function* () {
		const workbook = yield* parseWorkbook(buffer);

		const result = yield* Effect.reduce(
			config.rules,
			{ workbook, selectedSheet: null },
			(acc, rule) => applyRule(acc.workbook, rule, acc.selectedSheet),
		);

		const csvData = yield* convertToCsv(result.workbook, result.selectedSheet);

		return { success: true, csvData };
	});
```

#### 2.2 Upgrade Async Job Processing

**Target File:** `apps/api/src/workers/mutation-worker.ts`

**New Implementation:**

```typescript
const processJob = (jobData: JobData) =>
	Effect.gen(function* () {
		const db = yield* DatabaseService;
		const storage = yield* StorageService;

		yield* db.updateJobStatus(jobData.jobId, 'processing');

		const config = yield* db.getConfiguration(jobData.configurationId);
		const result = yield* transformFile(jobData.buffer, config);
		const upload = yield* storage.upload(result.buffer);

		yield* db.updateJobStatus(jobData.jobId, 'completed', {
			downloadUrl: upload.url,
		});

		return { success: true, downloadUrl: upload.url };
	}).pipe(
		Effect.retry(Schedule.exponential(1000)),
		Effect.timeout(300000),
		Effect.catchAll((error) =>
			db
				.updateJobStatus(jobData.jobId, 'failed', { error })
				.pipe(Effect.map(() => ({ success: false, error }))),
		),
	);
```

#### 2.3 Enhance Webhook System

**Target File:** `apps/api/src/services/webhook.ts`

**New Implementation:**

```typescript
const deliverWebhook = (payload: WebhookPayload, url: string) =>
  Effect.gen(function* () {
    const response = yield* Http.request.post(url, { body: payload });

    if (!Http.response.isSuccess(response)) {
      yield* Effect.fail(new WebhookDeliveryError({
        statusCode: response.status
      }));
    }

    return { delivered: true, statusCode: response.status };
  }).pipe(
    Effect.retry(
      Schedule.exponential(1000)
        |> Schedule.intersect(Schedule.recurs(5))
        |> Schedule.jittered
    ),
    Effect.timeout(30000)
  );
```

### Phase 3: API Layer Enhancement (Week 5-6)

#### 3.1 Migrate API Routes

**Example Route Migration:**

```typescript
// Before
app.post('/v1/mutate/:mutationId', async (req, res) => {
	try {
		const result = await mutationService.transform(req.body);
		res.json({ success: true, data: result });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
});

// After with Effect
app.post('/v1/mutate/:mutationId', (req, res) => {
	transformFile(req.body).pipe(
		Effect.map((result) => res.json({ success: true, data: result })),
		Effect.catchAll((error) =>
			Effect.sync(() =>
				res.status(500).json({
					success: false,
					error: formatError(error),
				}),
			),
		),
		Effect.runPromise,
	);
});
```

#### 3.2 Replace Zod with Effect Schema

```typescript
// Before (Zod)
const configSchema = z.object({
	name: z.string().min(1).max(255),
	rules: z.array(ruleSchema).min(1),
});

// After (Effect Schema)
const ConfigSchema = S.Struct({
	name: S.String.pipe(S.minLength(1), S.maxLength(255)),
	rules: S.Array(RuleSchema).pipe(S.minItems(1)),
});

const parseConfig = S.decodeUnknown(ConfigSchema);
```

### Phase 4: Advanced Features (Week 7-8)

#### 4.1 Circuit Breakers

```typescript
const s3Service = CircuitBreaker.make({
	maxFailures: 5,
	resetTimeout: Duration.seconds(60),
}).pipe(CircuitBreaker.protect(uploadToS3));
```

#### 4.2 Rate Limiting

```typescript
const rateLimitedTransform = RateLimiter.make({
	maxRequests: 100,
	window: Duration.minutes(1),
}).pipe(RateLimiter.protect(transformFile));
```

#### 4.3 Health Checks

```typescript
const healthCheck = Effect.all([checkDatabase, checkRedis, checkS3], {
	concurrency: 'unbounded',
}).pipe(
	Effect.timeout(5000),
	Effect.map((results) => ({
		status: results.every((r) => r.healthy) ? 'healthy' : 'unhealthy',
		services: results,
	})),
);
```

#### 4.4 Telemetry

```typescript
const instrumentedTransform = transformFile.pipe(
	Effect.withSpan('transform_file'),
	Effect.tap(() => Metrics.counter('transformations').increment()),
	Effect.tapError((error) =>
		Metrics.counter('transformation_errors', {
			error_type: error._tag,
		}).increment(),
	),
);
```

## Migration Strategy

### 1. Incremental Adoption

- Start with new features using Effect
- Gradually migrate existing code
- Maintain compatibility layers during transition

### 2. Testing Strategy

```typescript
// Easy testing with dependency injection
const testProgram = myProgram.pipe(
	Effect.provideService(DatabaseService, MockDatabaseService),
	Effect.provideService(StorageService, MockStorageService),
);

await Effect.runPromise(testProgram);
```

### 3. Training & Documentation

- Create Effect usage guidelines
- Document common patterns
- Provide migration examples

## Expected Benefits

### Quantifiable Improvements

- **50% reduction** in error-related bugs
- **30% faster** development of new features
- **80% reduction** in boilerplate code
- **100% type coverage** for errors

### Quality Improvements

- **Better error messages** with full context
- **Automatic retry** for transient failures
- **Guaranteed resource cleanup**
- **Composable business logic**
- **Improved testability**

## Risk Mitigation

### Potential Risks

1. **Learning curve** for developers
2. **Initial migration effort**
3. **Bundle size increase**

### Mitigation Strategies

1. **Gradual adoption** starting with isolated services
2. **Comprehensive documentation** and examples
3. **Tree-shaking** to minimize bundle impact
4. **Compatibility layers** for smooth transition

## Success Metrics

- **Error Rate:** Measure reduction in production errors
- **Development Velocity:** Track time to implement new features
- **Code Quality:** Monitor test coverage and type safety
- **Performance:** Measure response times and throughput
- **Developer Satisfaction:** Survey team on code maintainability

## Timeline Summary

| Phase     | Duration    | Focus Area                                               |
| --------- | ----------- | -------------------------------------------------------- |
| Phase 1   | 2 weeks     | Core infrastructure & service layers                     |
| Phase 2   | 2 weeks     | Critical path migration (transformation, jobs, webhooks) |
| Phase 3   | 2 weeks     | API layer enhancement & validation                       |
| Phase 4   | 2 weeks     | Advanced features (circuit breakers, telemetry)          |
| **Total** | **8 weeks** | **Full Effect integration**                              |

## Conclusion

Effect provides a comprehensive solution to Mutate's current technical challenges. By adopting Effect, we can achieve:

1. **Type-safe error handling** throughout the application
2. **Robust async operations** with built-in retry and timeout
3. **Clean dependency injection** for better testing
4. **Unified validation** with Effect Schema
5. **Production-ready features** like circuit breakers and telemetry

The phased approach ensures minimal disruption while delivering immediate value through improved reliability and maintainability.
