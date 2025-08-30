import { db } from '../db/connection.js';
import { platformAdmins, user } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function listPlatformAdmins() {
	try {
		const admins = await db
			.select({
				id: platformAdmins.id,
				userId: platformAdmins.userId,
				role: platformAdmins.role,
				permissions: platformAdmins.permissions,
				createdAt: platformAdmins.createdAt,
				userName: user.name,
				userEmail: user.email,
			})
			.from(platformAdmins)
			.innerJoin(user, eq(platformAdmins.userId, user.id))
			.orderBy(platformAdmins.createdAt);

		if (admins.length === 0) {
			console.log('ℹ️ No platform admins found');
			console.log('Run "pnpm tsx src/scripts/make-admin.ts <email>" to add an admin');
			return;
		}

		console.log(`📋 Platform Admins (${admins.length} total):\n`);
		admins.forEach((admin, index) => {
			console.log(`${index + 1}. ${admin.userName} (${admin.userEmail})`);
			console.log(`   Role: ${admin.role}`);
			console.log(`   User ID: ${admin.userId}`);
			console.log(`   Created: ${admin.createdAt.toLocaleDateString()}`);
			if (admin.permissions) {
				console.log(`   Permissions: ${JSON.stringify(admin.permissions)}`);
			}
			console.log('');
		});
	} catch (error) {
		console.error('❌ Failed to list platform admins:', error);
	}
}

listPlatformAdmins()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('Script failed:', error);
		process.exit(1);
	});