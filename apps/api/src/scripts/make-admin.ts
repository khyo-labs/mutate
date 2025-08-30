import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '../db/connection.js';
import { platformAdmins, user } from '../db/schema.js';

async function makeUserAdmin(email: string) {
	try {
		// Find user by email
		const users = await db
			.select()
			.from(user)
			.where(eq(user.email, email))
			.limit(1);

		if (users.length === 0) {
			console.error(`❌ User with email ${email} not found`);
			return;
		}

		const targetUser = users[0];

		// Check if already admin
		const existingAdmin = await db
			.select()
			.from(platformAdmins)
			.where(eq(platformAdmins.userId, targetUser.id))
			.limit(1);

		if (existingAdmin.length > 0) {
			console.log(`ℹ️ User ${email} is already a platform admin`);
			return;
		}

		// Make user a platform admin
		await db.insert(platformAdmins).values({
			id: nanoid(),
			userId: targetUser.id,
			role: 'admin',
			permissions: { all: true }, // Full permissions
		});

		console.log(`✅ User ${email} is now a platform admin`);
		console.log('User details:', {
			id: targetUser.id,
			name: targetUser.name,
			email: targetUser.email,
			platformRole: 'admin',
		});
	} catch (error) {
		console.error('❌ Failed to make user admin:', error);
	}
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
	console.error('❌ Please provide an email address');
	console.log('Usage: pnpm tsx src/scripts/make-admin.ts <email>');
	process.exit(1);
}

makeUserAdmin(email)
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Script failed:', error);
		process.exit(1);
	});
