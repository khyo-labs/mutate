import { desc, eq, and, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db } from '@/db/connection.js';
import { notifications, user } from '@/db/schema.js';
import { sendEmail } from '@/services/email/index.js';
import { logger } from '@/utils/logger.js';

interface CreateNotificationParams {
	organizationId: string;
	userId?: string;
	type: string;
	title: string;
	message: string;
	metadata?: Record<string, unknown>;
}

interface OutputValidationNotificationParams {
	organizationId: string;
	configurationId: string;
	configurationName: string;
	jobId: string;
	expectedColumnCount: number;
	actualColumnCount: number;
	notificationEmails?: string[];
	createdByUserId: string;
}

export class NotificationService {
	static async create(params: CreateNotificationParams): Promise<string> {
		const id = ulid();
		await db.insert(notifications).values({
			id,
			organizationId: params.organizationId,
			userId: params.userId,
			type: params.type,
			title: params.title,
			message: params.message,
			metadata: params.metadata,
		});
		return id;
	}

	static async createOutputValidationNotification(
		params: OutputValidationNotificationParams,
	): Promise<void> {
		const message = `Output validation failed for "${params.configurationName}". Expected ${params.expectedColumnCount} columns but got ${params.actualColumnCount}.`;

		await NotificationService.create({
			organizationId: params.organizationId,
			type: 'output_validation_failed',
			title: 'Output Validation Failed',
			message,
			metadata: {
				jobId: params.jobId,
				configurationId: params.configurationId,
				configurationName: params.configurationName,
				expectedColumnCount: params.expectedColumnCount,
				actualColumnCount: params.actualColumnCount,
			},
		});

		let emailRecipients = params.notificationEmails || [];

		if (emailRecipients.length === 0) {
			const [creator] = await db
				.select({ email: user.email })
				.from(user)
				.where(eq(user.id, params.createdByUserId))
				.limit(1);

			if (creator) {
				emailRecipients = [creator.email];
			}
		}

		if (emailRecipients.length > 0) {
			const html = `
				<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #dc2626;">Output Validation Failed</h2>
					<p>A transformation job for configuration <strong>${params.configurationName}</strong> produced an unexpected number of output columns.</p>
					<table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
						<tr>
							<td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Configuration</td>
							<td style="padding: 8px; border: 1px solid #e5e7eb;">${params.configurationName}</td>
						</tr>
						<tr>
							<td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Job ID</td>
							<td style="padding: 8px; border: 1px solid #e5e7eb;">${params.jobId}</td>
						</tr>
						<tr>
							<td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Expected Columns</td>
							<td style="padding: 8px; border: 1px solid #e5e7eb;">${params.expectedColumnCount}</td>
						</tr>
						<tr>
							<td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Actual Columns</td>
							<td style="padding: 8px; border: 1px solid #e5e7eb;">${params.actualColumnCount}</td>
						</tr>
					</table>
					<p style="color: #6b7280; font-size: 14px;">This email was sent because output validation is enabled for this configuration.</p>
				</div>
			`;

			for (const email of emailRecipients) {
				try {
					await sendEmail({
						to: email,
						subject: `[Mutate] Output Validation Failed — ${params.configurationName}`,
						html,
					});
				} catch (error) {
					logger.error(`Failed to send validation notification email to ${email}: ${error}`);
				}
			}
		}
	}

	static async getNotifications(
		organizationId: string,
		options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
	) {
		const { limit = 20, offset = 0, unreadOnly = false } = options;

		const conditions = [eq(notifications.organizationId, organizationId)];
		if (unreadOnly) {
			conditions.push(eq(notifications.read, false));
		}

		const results = await db
			.select()
			.from(notifications)
			.where(and(...conditions))
			.orderBy(desc(notifications.createdAt))
			.limit(limit)
			.offset(offset);

		const [countResult] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(notifications)
			.where(and(...conditions));

		return {
			data: results,
			total: countResult?.count || 0,
		};
	}

	static async markAsRead(id: string, organizationId: string): Promise<boolean> {
		const result = await db
			.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId)))
			.returning({ id: notifications.id });

		return result.length > 0;
	}

	static async markAllAsRead(organizationId: string): Promise<void> {
		await db
			.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.organizationId, organizationId), eq(notifications.read, false)));
	}

	static async getUnreadCount(organizationId: string): Promise<number> {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(notifications)
			.where(and(eq(notifications.organizationId, organizationId), eq(notifications.read, false)));

		return result?.count || 0;
	}
}
