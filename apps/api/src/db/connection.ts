import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { config } from '../config.js';
import * as schema from './schema.js';

const connectionString = config.DATABASE_URL;

const client = postgres(connectionString, {
	max: config.DATABASE_MAX_CONNECTIONS,
	idle_timeout: 20,
	connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export const closeConnection = async () => {
	await client.end();
};
