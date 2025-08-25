import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { closeConnection, db } from './connection.js';

async function main() {
	console.log('Running migrations...');

	try {
		await migrate(db, {
			migrationsFolder: './src/db/migrations',
		});
		console.log('Migrations completed successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await closeConnection();
	}
}

main();
