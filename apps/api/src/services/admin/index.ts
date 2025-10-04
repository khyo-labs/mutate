import { eq } from 'drizzle-orm';

import { db } from '@/db/connection.js';
import { platformAdmins, twoFactor } from '@/db/schema.js';

export class AdminService {
	async checkTwoFactorEnabled(adminUserId: string): Promise<boolean> {
		const twoFactorRecord = await db
			.select({ id: twoFactor.id })
			.from(twoFactor)
			.where(eq(twoFactor.userId, adminUserId))
			.limit(1);

		return twoFactorRecord.length > 0;
	}

	async checkTwoFactorRequired(adminUserId: string): Promise<boolean> {
		const admin = await db
			.select({
				require2fa: platformAdmins.require2fa,
				last2faVerifiedAt: platformAdmins.last2faVerifiedAt,
			})
			.from(platformAdmins)
			.where(eq(platformAdmins.userId, adminUserId))
			.limit(1);

		if (!admin[0]) {
			return false;
		}

		return admin[0].require2fa;
	}

	async checkTrustedIP(
		adminUserId: string,
		ipAddress: string,
	): Promise<boolean> {
		const admin = await db
			.select({ trustedIps: platformAdmins.trustedIps })
			.from(platformAdmins)
			.where(eq(platformAdmins.userId, adminUserId))
			.limit(1);

		if (!admin[0] || !admin[0].trustedIps) {
			return false;
		}

		return admin[0].trustedIps.includes(ipAddress);
	}
}

export const adminService = new AdminService();
