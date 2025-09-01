import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const configSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	PORT: z.coerce.number().default(3000),
	HOST: z.string().default('0.0.0.0'),

	CORS_ORIGINS: z
		.string()
		.transform((val) => val.split(',').map((s) => s.trim()))
		.default(['http://localhost:5173']),

	DATABASE_URL: z.string().url(),
	DATABASE_MAX_CONNECTIONS: z.coerce.number().default(10),

	REDIS_URL: z.string().url().default('redis://localhost:6379'),

	STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
	STORAGE_PATH: z.string().default('./uploads'),

	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
	AWS_REGION: z.string().optional(),
	AWS_S3_BUCKET: z.string().optional(),

	CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
	CLOUDFLARE_R2_BUCKET: z.string().optional(),
	CLOUDFLARE_R2_REGION: z.string().default('auto'),
	CLOUDFLARE_R2_ENDPOINT: z.string().optional(),

	MAX_FILE_SIZE: z.coerce.number().default(52_428_800), // 50MB
	FILE_TTL: z.coerce.number().default(86_400), // 24 hours in seconds
	ASYNC_THRESHOLD: z.coerce.number().default(10_485_760), // 10MB - files larger than this go to queue

	API_BASE_URL: z.string().optional(),

	WEBHOOK_SECRET: z.string().optional(),
	WEBHOOK_TIMEOUT: z.coerce.number().default(30_000), // 30 seconds
	WEBHOOK_MAX_RETRIES: z.coerce.number().default(5),

	RATE_LIMIT_MAX: z.coerce.number().default(1_000),
	RATE_LIMIT_WINDOW: z.string().default('1 minute'),

	LOG_LEVEL: z
		.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
		.default('info'),

	SENDGRID_API_KEY: z.string(),
	SENDGRID_FROM_EMAIL: z.string().email(),
});

const env = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
	HOST: process.env.HOST,
	CORS_ORIGINS: process.env.CORS_ORIGINS,
	DATABASE_URL: process.env.DATABASE_URL,
	DATABASE_MAX_CONNECTIONS: process.env.DATABASE_MAX_CONNECTIONS,
	REDIS_URL: process.env.REDIS_URL,
	STORAGE_TYPE: process.env.STORAGE_TYPE,
	STORAGE_PATH: process.env.STORAGE_PATH,
	AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	AWS_REGION: process.env.AWS_REGION,
	AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
	CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
	CLOUDFLARE_R2_BUCKET: process.env.CLOUDFLARE_R2_BUCKET,
	CLOUDFLARE_R2_REGION: process.env.CLOUDFLARE_R2_REGION,
	CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
	MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
	FILE_TTL: process.env.FILE_TTL,
	ASYNC_THRESHOLD: process.env.ASYNC_THRESHOLD,
	API_BASE_URL: process.env.API_BASE_URL,
	WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
	WEBHOOK_TIMEOUT: process.env.WEBHOOK_TIMEOUT,
	WEBHOOK_MAX_RETRIES: process.env.WEBHOOK_MAX_RETRIES,
	RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
	RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
	LOG_LEVEL: process.env.LOG_LEVEL,
	SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
	SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
};

export const config = configSchema.parse(env);
