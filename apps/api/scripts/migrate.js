import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
	const connectionString = process.env.DATABASE_URL;
	
	if (!connectionString) {
		console.error('DATABASE_URL environment variable is required');
		process.exit(1);
	}

	console.log('Connecting to database...');
	
	// Create postgres client
	const client = postgres(connectionString, { max: 1 });
	const db = drizzle(client);

	console.log('Running migrations...');

	try {
		await migrate(db, {
			migrationsFolder: join(__dirname, '../src/db/migrations'),
		});
		console.log('Migrations completed successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

main();