# Monitoring & Observability Integration Plan

## Overview

This plan outlines the integration of Grafana with the Mutate platform, including persistent storage for metrics/traces, metric aggregation, dynamic configuration, and operational dashboards.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│   Mutate API    │────▶│  Prometheus  │────▶│   Grafana   │
│   (Metrics)     │     │   (Storage)  │     │ (Dashboards)│
└─────────────────┘     └──────────────┘     └─────────────┘
         │                      │                     │
         │              ┌──────────────┐             │
         └─────────────▶│    Tempo     │◀────────────┘
                        │   (Traces)   │
                        └──────────────┘
```

## Phase 1: Grafana Stack Setup (Week 1)

### 1.1 Infrastructure Setup

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--storage.tsdb.retention.size=10GB'

  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_FEATURE_TOGGLES_ENABLE=traceToMetrics
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning

  tempo:
    image: grafana/tempo:latest
    command: ['-config.file=/etc/tempo.yml']
    ports:
      - '3200:3200' # Tempo
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
    volumes:
      - ./tempo.yml:/etc/tempo.yml
      - tempo-data:/tmp/tempo

  loki:
    image: grafana/loki:latest
    ports:
      - '3100:3100'
    volumes:
      - ./loki.yml:/etc/loki/local-config.yaml
      - loki-data:/loki

volumes:
  prometheus-data:
  grafana-data:
  tempo-data:
  loki-data:
```

### 1.2 Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mutate-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

# Remote write for long-term storage (optional)
remote_write:
  - url: 'http://mimir:9009/api/v1/push'
    queue_config:
      capacity: 10000
      max_shards: 10
```

### 1.3 Tempo Configuration

```yaml
# tempo.yml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /tmp/tempo/blocks
    wal:
      path: /tmp/tempo/wal
    pool:
      max_workers: 100
      queue_depth: 10000

querier:
  frontend_worker:
    frontend_address: 127.0.0.1:9095
```

## Phase 2: Persistent Storage Implementation (Week 2)

### 2.1 TimescaleDB for Metrics

```typescript
// packages/core/src/telemetry/storage/timescale.ts
import { Context, Effect, Layer } from 'effect';
import { Client } from 'pg';

interface MetricStorageService {
	writeMetric: (metric: MetricData) => Effect.Effect<void, StorageError>;
	queryMetrics: (
		query: MetricQuery,
	) => Effect.Effect<MetricResult[], StorageError>;
	aggregateMetrics: (
		params: AggregationParams,
	) => Effect.Effect<AggregatedMetric[], StorageError>;
}

export const MetricStorageService = Context.GenericTag<MetricStorageService>(
	'@mutate/core/MetricStorageService',
);

// Database schema
const createSchema = `
  CREATE TABLE IF NOT EXISTS metrics (
    time TIMESTAMPTZ NOT NULL,
    name TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    labels JSONB,
    type TEXT NOT NULL
  );

  SELECT create_hypertable('metrics', 'time', if_not_exists => TRUE);

  CREATE INDEX IF NOT EXISTS idx_metrics_name_time
    ON metrics (name, time DESC);

  CREATE INDEX IF NOT EXISTS idx_metrics_labels
    ON metrics USING gin (labels);

  -- Continuous aggregates for common queries
  CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1min
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('1 minute', time) AS bucket,
    name,
    labels,
    avg(value) as avg_value,
    max(value) as max_value,
    min(value) as min_value,
    count(*) as count
  FROM metrics
  GROUP BY bucket, name, labels;

  CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1hour
  WITH (timescaledb.continuous) AS
  SELECT
    time_bucket('1 hour', time) AS bucket,
    name,
    labels,
    avg(value) as avg_value,
    max(value) as max_value,
    min(value) as min_value,
    count(*) as count
  FROM metrics
  GROUP BY bucket, name, labels;
`;

export class TimescaleMetricStorage implements MetricStorageService {
	constructor(private client: Client) {}

	writeMetric(metric: MetricData) {
		return Effect.tryPromise({
			try: async () => {
				await this.client.query(
					`INSERT INTO metrics (time, name, value, labels, type)
           VALUES ($1, $2, $3, $4, $5)`,
					[
						metric.timestamp,
						metric.name,
						metric.value,
						metric.labels,
						metric.type,
					],
				);
			},
			catch: (error) => new StorageError({ cause: error }),
		});
	}

	queryMetrics(query: MetricQuery) {
		return Effect.tryPromise({
			try: async () => {
				const { name, labels, startTime, endTime, aggregation } = query;

				let sql = `
          SELECT time, name, value, labels
          FROM metrics
          WHERE name = $1
            AND time >= $2
            AND time <= $3
        `;

				const params = [name, startTime, endTime];

				if (labels) {
					sql += ` AND labels @> $4`;
					params.push(labels);
				}

				sql += ` ORDER BY time DESC`;

				const result = await this.client.query(sql, params);
				return result.rows;
			},
			catch: (error) => new StorageError({ cause: error }),
		});
	}

	aggregateMetrics(params: AggregationParams) {
		return Effect.tryPromise({
			try: async () => {
				const {
					name,
					interval,
					startTime,
					endTime,
					aggregation = 'avg',
				} = params;

				const sql = `
          SELECT
            time_bucket($1, time) AS bucket,
            ${aggregation}(value) as value,
            count(*) as count
          FROM metrics
          WHERE name = $2
            AND time >= $3
            AND time <= $4
          GROUP BY bucket
          ORDER BY bucket DESC
        `;

				const result = await this.client.query(sql, [
					interval,
					name,
					startTime,
					endTime,
				]);

				return result.rows;
			},
			catch: (error) => new StorageError({ cause: error }),
		});
	}
}
```

### 2.2 S3/MinIO for Trace Storage

```typescript
// packages/core/src/telemetry/storage/trace-storage.ts
import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { Effect } from 'effect';

export class S3TraceStorage {
	constructor(
		private s3: S3Client,
		private bucket: string,
	) {}

	saveTrace(traceId: string, spans: SpanData[]) {
		return Effect.tryPromise({
			try: async () => {
				const key = `traces/${traceId.substring(0, 2)}/${traceId}.json`;

				await this.s3.send(
					new PutObjectCommand({
						Bucket: this.bucket,
						Key: key,
						Body: JSON.stringify({
							traceId,
							spans,
							timestamp: new Date().toISOString(),
						}),
						ContentType: 'application/json',
						Metadata: {
							'trace-id': traceId,
							'span-count': String(spans.length),
						},
					}),
				);
			},
			catch: (error) => new StorageError({ cause: error }),
		});
	}

	getTrace(traceId: string) {
		return Effect.tryPromise({
			try: async () => {
				const key = `traces/${traceId.substring(0, 2)}/${traceId}.json`;

				const response = await this.s3.send(
					new GetObjectCommand({
						Bucket: this.bucket,
						Key: key,
					}),
				);

				const body = await response.Body?.transformToString();
				return JSON.parse(body || '{}');
			},
			catch: (error) => new StorageError({ cause: error }),
		});
	}
}
```

## Phase 3: Metric Aggregation System (Week 3)

### 3.1 Stream Processing with Effect

```typescript
// packages/core/src/telemetry/aggregation/stream-processor.ts
import { Effect, HashMap, Ref, Schedule, Stream } from 'effect';

interface AggregationWindow {
	startTime: number;
	endTime: number;
	metrics: Map<string, AggregatedValue>;
}

export class MetricAggregator {
	private windows: Ref.Ref<HashMap.HashMap<string, AggregationWindow>>;

	constructor(
		private windowSize: Duration.Duration,
		private flushInterval: Duration.Duration,
	) {
		this.windows = Ref.unsafeMake(HashMap.empty());
		this.startFlushTimer();
	}

	aggregate(metric: MetricData) {
		return Effect.gen(
			function* () {
				const windowKey = this.getWindowKey(metric.timestamp);

				yield* Ref.update(this.windows, (map) => {
					const window = HashMap.get(map, windowKey);

					if (Option.isNone(window)) {
						// Create new window
						const newWindow: AggregationWindow = {
							startTime: this.getWindowStart(metric.timestamp),
							endTime: this.getWindowEnd(metric.timestamp),
							metrics: new Map([
								[
									metric.name,
									{
										count: 1,
										sum: metric.value,
										min: metric.value,
										max: metric.value,
										values: [metric.value],
									},
								],
							]),
						};
						return HashMap.set(map, windowKey, newWindow);
					}

					// Update existing window
					const existingWindow = window.value;
					const existing = existingWindow.metrics.get(metric.name);

					if (existing) {
						existing.count++;
						existing.sum += metric.value;
						existing.min = Math.min(existing.min, metric.value);
						existing.max = Math.max(existing.max, metric.value);
						existing.values.push(metric.value);
					} else {
						existingWindow.metrics.set(metric.name, {
							count: 1,
							sum: metric.value,
							min: metric.value,
							max: metric.value,
							values: [metric.value],
						});
					}

					return HashMap.set(map, windowKey, existingWindow);
				});
			}.bind(this),
		);
	}

	private startFlushTimer() {
		Effect.gen(
			function* () {
				yield* this.flush().pipe(
					Effect.repeat(Schedule.fixed(this.flushInterval)),
				);
			}.bind(this),
		).pipe(Effect.forkDaemon, Effect.runSync);
	}

	private flush() {
		return Effect.gen(
			function* () {
				const storage = yield* MetricStorageService;
				const now = Date.now();
				const windows = yield* Ref.get(this.windows);

				// Find windows ready to flush
				const toFlush = Array.from(HashMap.entries(windows)).filter(
					([_, window]) => window.endTime < now,
				);

				// Write aggregated metrics
				for (const [key, window] of toFlush) {
					for (const [name, aggregated] of window.metrics) {
						yield* storage.writeMetric({
							timestamp: new Date(window.startTime),
							name: `${name}_aggregated`,
							value: aggregated.sum / aggregated.count,
							labels: {
								min: aggregated.min,
								max: aggregated.max,
								count: aggregated.count,
								p50: this.percentile(aggregated.values, 0.5),
								p95: this.percentile(aggregated.values, 0.95),
								p99: this.percentile(aggregated.values, 0.99),
							},
							type: 'histogram',
						});
					}

					// Remove flushed window
					yield* Ref.update(this.windows, (map) => HashMap.remove(map, key));
				}
			}.bind(this),
		);
	}

	private percentile(values: number[], p: number): number {
		const sorted = [...values].sort((a, b) => a - b);
		const index = Math.ceil(sorted.length * p) - 1;
		return sorted[index] || 0;
	}
}
```

### 3.2 High-Volume Optimizations

```typescript
// packages/core/src/telemetry/aggregation/batch-processor.ts
export class BatchMetricProcessor {
	private buffer: MetricData[] = [];
	private bufferSize = 1000;
	private flushInterval = Duration.seconds(10);

	process(metric: MetricData) {
		return Effect.gen(
			function* () {
				this.buffer.push(metric);

				if (this.buffer.length >= this.bufferSize) {
					yield* this.flush();
				}
			}.bind(this),
		);
	}

	private flush() {
		return Effect.gen(
			function* () {
				if (this.buffer.length === 0) return;

				const batch = [...this.buffer];
				this.buffer = [];

				// Use bulk insert for efficiency
				const storage = yield* MetricStorageService;
				yield* storage.bulkWrite(batch);

				console.log(`Flushed ${batch.length} metrics to storage`);
			}.bind(this),
		);
	}
}
```

## Phase 4: Dynamic Configuration Management (Week 4)

### 4.1 Configuration Service

```typescript
// packages/core/src/config/dynamic-config.ts
import { Effect, Ref, Schedule } from 'effect';

interface ConfigSource {
	get: (key: string) => Effect.Effect<ConfigValue, ConfigError>;
	watch: (
		key: string,
		callback: (value: ConfigValue) => void,
	) => Effect.Effect<void, ConfigError>;
}

export class DynamicConfigService {
	private cache: Ref.Ref<Map<string, ConfigValue>>;
	private watchers: Map<string, Set<(value: ConfigValue) => void>> = new Map();

	constructor(private source: ConfigSource) {
		this.cache = Ref.unsafeMake(new Map());
		this.startRefresh();
	}

	get<T>(key: string, defaultValue: T): Effect.Effect<T, never, never> {
		return Effect.gen(
			function* () {
				const cached = yield* Ref.get(this.cache);
				const value = cached.get(key);

				if (value !== undefined) {
					return value as T;
				}

				// Fetch from source
				const fetched = yield* this.source
					.get(key)
					.pipe(Effect.orElse(() => Effect.succeed(defaultValue)));

				// Update cache
				yield* Ref.update(this.cache, (map) => {
					const newMap = new Map(map);
					newMap.set(key, fetched);
					return newMap;
				});

				return fetched as T;
			}.bind(this),
		);
	}

	watch(key: string, callback: (value: any) => void) {
		if (!this.watchers.has(key)) {
			this.watchers.set(key, new Set());
		}
		this.watchers.get(key)!.add(callback);

		// Start watching in source
		return this.source.watch(key, (value) => {
			// Update cache
			Ref.update(this.cache, (map) => {
				const newMap = new Map(map);
				newMap.set(key, value);
				return newMap;
			}).pipe(Effect.runSync);

			// Notify watchers
			const callbacks = this.watchers.get(key);
			if (callbacks) {
				callbacks.forEach((cb) => cb(value));
			}
		});
	}

	private startRefresh() {
		Effect.gen(
			function* () {
				// Refresh all cached configs periodically
				const keys = yield* Ref.get(this.cache).pipe(
					Effect.map((map) => Array.from(map.keys())),
				);

				for (const key of keys) {
					yield* this.get(key, null);
				}
			}.bind(this),
		).pipe(
			Effect.repeat(Schedule.fixed(Duration.minutes(1))),
			Effect.forkDaemon,
			Effect.runSync,
		);
	}
}

// Rate limiter with dynamic config
export class DynamicRateLimiter {
	constructor(
		private config: DynamicConfigService,
		private keyPrefix: string,
	) {}

	allow(key: string) {
		return Effect.gen(
			function* () {
				const maxRequests = yield* this.config.get(
					`rate_limit.${this.keyPrefix}.max_requests`,
					100,
				);

				const windowSize = yield* this.config.get(
					`rate_limit.${this.keyPrefix}.window_seconds`,
					60,
				);

				// Use configured values for rate limiting
				const limiter = new TokenBucketRateLimiter({
					maxRequests,
					windowDuration: Duration.seconds(windowSize),
					keyPrefix: this.keyPrefix,
				});

				return yield* limiter.allow(key);
			}.bind(this),
		);
	}
}
```

### 4.2 Configuration Sources

```typescript
// packages/core/src/config/sources.ts

// PostgreSQL configuration source
export class PostgresConfigSource implements ConfigSource {
	get(key: string) {
		return Effect.tryPromise({
			try: async () => {
				const result = await db
					.select()
					.from(configurations)
					.where(eq(configurations.key, key))
					.limit(1);

				return result[0]?.value || null;
			},
			catch: (error) => new ConfigError({ key, cause: error }),
		});
	}

	watch(key: string, callback: (value: any) => void) {
		// Use PostgreSQL LISTEN/NOTIFY
		return Effect.tryPromise({
			try: async () => {
				await db.raw(`LISTEN config_change_${key}`);
				// Set up listener...
			},
			catch: (error) => new ConfigError({ key, cause: error }),
		});
	}
}

// Redis configuration source
export class RedisConfigSource implements ConfigSource {
	constructor(private redis: Redis) {}

	get(key: string) {
		return Effect.tryPromise({
			try: async () => {
				const value = await this.redis.get(`config:${key}`);
				return value ? JSON.parse(value) : null;
			},
			catch: (error) => new ConfigError({ key, cause: error }),
		});
	}

	watch(key: string, callback: (value: any) => void) {
		return Effect.tryPromise({
			try: async () => {
				// Use Redis pub/sub
				const subscriber = this.redis.duplicate();
				await subscriber.subscribe(`config:${key}:change`);
				subscriber.on('message', (channel, message) => {
					callback(JSON.parse(message));
				});
			},
			catch: (error) => new ConfigError({ key, cause: error }),
		});
	}
}
```

## Phase 5: Grafana Dashboards (Week 5)

### 5.1 Main Operations Dashboard

```json
{
	"dashboard": {
		"title": "Mutate Platform Operations",
		"panels": [
			{
				"title": "Request Rate",
				"type": "graph",
				"targets": [
					{
						"expr": "rate(api_requests_total[5m])",
						"legendFormat": "{{method}} {{endpoint}}"
					}
				]
			},
			{
				"title": "Error Rate",
				"type": "graph",
				"targets": [
					{
						"expr": "rate(api_requests_total{status=\"failed\"}[5m]) / rate(api_requests_total[5m])",
						"legendFormat": "Error Rate %"
					}
				]
			},
			{
				"title": "Response Time P95",
				"type": "graph",
				"targets": [
					{
						"expr": "histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m]))",
						"legendFormat": "P95 Response Time"
					}
				]
			},
			{
				"title": "Active Transformations",
				"type": "stat",
				"targets": [
					{
						"expr": "sum(active_transformations)"
					}
				]
			},
			{
				"title": "Circuit Breaker Status",
				"type": "table",
				"targets": [
					{
						"expr": "circuit_breaker_state",
						"format": "table"
					}
				]
			}
		]
	}
}
```

### 5.2 Transformation Dashboard

```json
{
	"dashboard": {
		"title": "Transformation Monitoring",
		"panels": [
			{
				"title": "Transformation Rate by Type",
				"type": "graph",
				"targets": [
					{
						"expr": "rate(transformations_total[5m])",
						"legendFormat": "{{conversion_type}}"
					}
				]
			},
			{
				"title": "Transformation Duration Distribution",
				"type": "heatmap",
				"targets": [
					{
						"expr": "transformation_duration_seconds",
						"format": "heatmap"
					}
				]
			},
			{
				"title": "Transformation Success Rate",
				"type": "gauge",
				"targets": [
					{
						"expr": "rate(transformations_total{status=\"success\"}[5m]) / rate(transformations_total[5m]) * 100"
					}
				]
			},
			{
				"title": "Queue Size",
				"type": "graph",
				"targets": [
					{
						"expr": "queue_size"
					}
				]
			}
		]
	}
}
```

### 5.3 Health & SLA Dashboard

```json
{
	"dashboard": {
		"title": "Health & SLA Monitoring",
		"panels": [
			{
				"title": "System Health",
				"type": "stat",
				"targets": [
					{
						"expr": "up",
						"legendFormat": "{{job}}"
					}
				]
			},
			{
				"title": "Database Response Time",
				"type": "graph",
				"targets": [
					{
						"expr": "database_query_duration_seconds",
						"legendFormat": "{{operation}}"
					}
				]
			},
			{
				"title": "Memory Usage",
				"type": "graph",
				"targets": [
					{
						"expr": "process_resident_memory_bytes / 1024 / 1024",
						"legendFormat": "RSS MB"
					}
				]
			},
			{
				"title": "SLA Compliance",
				"type": "stat",
				"targets": [
					{
						"expr": "(1 - rate(api_requests_total{status=\"failed\"}[24h]) / rate(api_requests_total[24h])) * 100",
						"legendFormat": "24h Availability %"
					}
				]
			}
		]
	}
}
```

## Implementation Timeline

| Week | Phase                 | Deliverables                                                                            |
| ---- | --------------------- | --------------------------------------------------------------------------------------- |
| 1    | Grafana Stack Setup   | - Docker compose configuration<br>- Basic Prometheus scraping<br>- Grafana provisioning |
| 2    | Persistent Storage    | - TimescaleDB integration<br>- S3 trace storage<br>- Data retention policies            |
| 3    | Metric Aggregation    | - Stream processing<br>- Batch optimization<br>- Continuous aggregates                  |
| 4    | Dynamic Configuration | - Config service<br>- Database/Redis sources<br>- Dynamic rate limiting                 |
| 5    | Dashboards            | - Operations dashboard<br>- Transformation monitoring<br>- Health & SLA tracking        |

## Success Metrics

1. **Performance Goals**
   - Metric ingestion: >10,000 metrics/second
   - Query response time: <100ms for 1-hour window
   - Dashboard load time: <2 seconds

2. **Storage Goals**
   - 30-day metric retention
   - 7-day trace retention
   - <$100/month storage cost

3. **Operational Goals**
   - 99.9% monitoring uptime
   - <5 minute alert latency
   - Zero data loss for critical metrics

## Next Steps

1. **Immediate Actions**
   - Set up development Grafana stack
   - Create TimescaleDB schema
   - Implement metric export endpoint

2. **Short-term (1 month)**
   - Complete all 5 phases
   - Deploy to staging environment
   - Load test with production-like data

3. **Long-term (3 months)**
   - Production deployment
   - Alert rule configuration
   - Custom Grafana plugins for Mutate-specific visualizations
   - Integration with PagerDuty/Slack for alerting
