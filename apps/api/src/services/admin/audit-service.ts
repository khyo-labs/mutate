
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '../../db/connection.js';
import {
	platformAdmins,
	platformAuditLogs,
	twoFactor,
} from '../../db/schema.js';

export class AdminAuditService {
	async logAdminAction(
		adminUserId: string,
		action: string,
		details?: {
			resourceType?: string;
			resourceId?: string;
			changes?: Record<string, unknown>;
			ipAddress?: string;
			userAgent?: string;
		},
	) {
		try {
			// Get admin record
			const admin = await db
				.select({ id: platformAdmins.id })
				.from(platformAdmins)
				.where(eq(platformAdmins.userId, adminUserId))
				.limit(1);

			if (!admin[0]) {
				console.error('Admin not found for audit log:', adminUserId);
				return;
			}

			await db.insert(platformAuditLogs).values({
				id: randomUUID(),
				adminId: admin[0].id,
				action,
				resourceType: details?.resourceType || null,
				resourceId: details?.resourceId || null,
				changes: details?.changes || null,
				ipAddress: details?.ipAddress || null,
				userAgent: details?.userAgent || null,
			});
		} catch (error) {
			console.error('Failed to log admin action:', error);
			// Don't throw - audit logging should not break the main flow
		}
	}

	async getAuditLogs(filters?: {
		adminId?: string;
		action?: string;
		resourceType?: string;
		resourceId?: string;
		startDate?: Date;
		endDate?: Date;
		limit?: number;
		offset?: number;
	}) {
		let query = db
			.select({
				id: platformAuditLogs.id,
				adminId: platformAuditLogs.adminId,
				action: platformAuditLogs.action,
				resourceType: platformAuditLogs.resourceType,
				resourceId: platformAuditLogs.resourceId,
				changes: platformAuditLogs.changes,
				ipAddress: platformAuditLogs.ipAddress,
				userAgent: platformAuditLogs.userAgent,
				createdAt: platformAuditLogs.createdAt,
			})
			.from(platformAuditLogs)
			.$dynamic();

		// Apply filters
		if (filters?.adminId) {
			query = query.where(eq(platformAuditLogs.adminId, filters.adminId));
		}

		// Add more filter conditions as needed

		return query.limit(filters?.limit || 100).offset(filters?.offset || 0);
	}
}

export const adminAuditService = new AdminAuditService();
