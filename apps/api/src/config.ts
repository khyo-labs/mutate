import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenvConfig();

const configSchema = z.object({
	// Server
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	PORT: z.coerce.number().default(3000),
	HOST: z.string().default('0.0.0.0'),

	// CORS
	CORS_ORIGINS: z
		.string()
		.transform((val) => val.split(',').map((s) => s.trim()))
		.default('http://localhost:5173'),

	// JWT
	JWT_SECRET: z.string().min(32),
	JWT_EXPIRES_IN: z.string().default('1h'),
	JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

	// Database
	DATABASE_URL: z.string().url(),
	DATABASE_MAX_CONNECTIONS: z.coerce.number().default(10),

	// Redis
	REDIS_URL: z.string().url().default('redis://localhost:6379'),

	// File Storage
	STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
	STORAGE_PATH: z.string().default('./uploads'),

	// AWS S3 (if using S3)
	AWS_ACCESS_KEY_ID: z.string().optional(),
	AWS_SECRET_ACCESS_KEY: z.string().optional(),
	AWS_REGION: z.string().optional(),
	AWS_S3_BUCKET: z.string().optional(),

	// File Processing
	MAX_FILE_SIZE: z.coerce.number().default(52428800), // 50MB
	FILE_TTL: z.coerce.number().default(86400), // 24 hours in seconds

	// Rate Limiting
	RATE_LIMIT_MAX: z.coerce.number().default(1000),
	RATE_LIMIT_WINDOW: z.string().default('1 minute'),

	// Logging
	LOG_LEVEL: z
		.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
		.default('info'),
});

const env = {
	NODE_ENV: process.env.NODE_ENV,
	PORT: process.env.PORT,
	HOST: process.env.HOST,
	CORS_ORIGINS: process.env.CORS_ORIGINS,
	JWT_SECRET: process.env.JWT_SECRET,
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
	JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
	DATABASE_URL: process.env.DATABASE_URL,
	DATABASE_MAX_CONNECTIONS: process.env.DATABASE_MAX_CONNECTIONS,
	REDIS_URL: process.env.REDIS_URL,
	STORAGE_TYPE: process.env.STORAGE_TYPE,
	STORAGE_PATH: process.env.STORAGE_PATH,
	AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	AWS_REGION: process.env.AWS_REGION,
	AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
	MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
	FILE_TTL: process.env.FILE_TTL,
	RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
	RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW,
	LOG_LEVEL: process.env.LOG_LEVEL,
};

export const config = configSchema.parse(env);
