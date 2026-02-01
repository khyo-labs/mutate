import { eq } from 'drizzle-orm';

import { db } from '@/db/connection.js';
import { user } from '@/db/schema.js';

export class UserService {
	static async updateUser(userId: string, data: { name: string; image?: string | null }) {
		const [updatedUser] = await db
			.update(user)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(user.id, userId))
			.returning();

		return updatedUser;
	}
}
