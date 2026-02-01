import { eq } from 'drizzle-orm';

import { db } from '@/db/connection.js';
import { platformAdmins, user } from '@/db/schema.js';

async function removeUserAdmin(email: string) {
	try {
		// Find user by email
		const users = await db.select().from(user).where(eq(user.email, email)).limit(1);

		if (users.length === 0) {
			console.error(`❌ User with email ${email} not found`);
			return;
		}

		const targetUser = users[0];

		// Check if user is admin
		const existingAdmin = await db
			.select()
			.from(platformAdmins)
			.where(eq(platformAdmins.userId, targetUser.id))
			.limit(1);

		if (existingAdmin.length === 0) {
			console.log(`ℹ️ User ${email} is not a platform admin`);
			return;
		}

		// Remove admin access
		await db.delete(platformAdmins).where(eq(platformAdmins.userId, targetUser.id));

		console.log(`✅ Removed platform admin access for ${email}`);
	} catch (error) {
		console.error('❌ Failed to remove admin access:', error);
	}
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
	console.error('❌ Please provide an email address');
	console.log('Usage: pnpm tsx src/scripts/remove-admin.ts <email>');
	process.exit(1);
}

removeUserAdmin(email)
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Script failed:', error);
		process.exit(1);
	});
