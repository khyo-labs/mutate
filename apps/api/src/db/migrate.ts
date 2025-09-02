import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { closeConnection, db } from './connection.js';
// At the end of migrate.js, before client.end()
// Import and run the seed function
import { seedPlans } from './seed.js';

async function main() {
	console.log('Running migrations...');

	try {
		await migrate(db, {
			migrationsFolder: './src/db/migrations',
		});
		console.log('Migrations completed successfully');
		await seedPlans();
		console.log('Plans seeded successfully');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await closeConnection();
	}
}

main();
