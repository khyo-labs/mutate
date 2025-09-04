import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import { db } from '../db/connection.js';
import {
	activeConversions,
	apiKeys,
	auditLogs,
	billingEvents,
	configurationVersions,
	configurations,
	invitation,
	member,
	organization,
	organizationSubscriptions,
	organizationWebhooks,
	transformationJobs,
	usageRecords,
} from '../db/schema';
import { AppError } from '../utils/error.js';

export async function deleteWorkspace(workspaceId: string, userId: string) {
	return await db.transaction(async (tx) => {
		// 1. Verify user is the owner of the workspace
		const [membership] = await tx
			.select()
			.from(member)
			.where(
				and(eq(member.organizationId, workspaceId), eq(member.userId, userId)),
			);

		if (!membership || membership.role !== 'owner') {
			throw new AppError(
				'FORBIDDEN',
				'You do not have permission to delete this workspace.',
			);
		}

		// 2. Check if this is the user's last workspace
		const userWorkspaces = await tx
			.select()
			.from(member)
			.where(eq(member.userId, userId));

		if (userWorkspaces.length === 1) {
			throw new AppError(
				'LAST_WORKSPACE',
				'You cannot delete your last workspace. Please create a new workspace first.',
			);
		}

		// 3. Check if there are other members in the workspace
		const allMembers = await tx
			.select()
			.from(member)
			.where(eq(member.organizationId, workspaceId));

		if (allMembers.length > 1) {
			throw new AppError(
				'PRECONDITION_FAILED',
				'Please remove all other members before deleting the workspace.',
			);
		}

		// 4. Check for active subscriptions
		const [activeSubscription] = await tx
			.select()
			.from(organizationSubscriptions)
			.where(
				and(
					eq(organizationSubscriptions.organizationId, workspaceId),
					eq(organizationSubscriptions.status, 'active'),
					isNotNull(organizationSubscriptions.stripeSubscriptionId),
				),
			);

		if (activeSubscription) {
			throw new AppError(
				'PRECONDITION_FAILED',
				'Please cancel your active subscription before deleting the workspace.',
			);
		}

		// 5. Delete all related data in the correct order
		// Note: Some of these could be handled by CASCADE deletes in the DB,
		// but explicit deletion is safer and clearer.

		await tx
			.delete(activeConversions)
			.where(eq(activeConversions.organizationId, workspaceId));
		await tx
			.delete(transformationJobs)
			.where(eq(transformationJobs.organizationId, workspaceId));
		const configurationsToDelete = await tx
			.select()
			.from(configurations)
			.where(eq(configurations.organizationId, workspaceId));
		await tx.delete(configurationVersions).where(
			inArray(
				configurationVersions.configurationId,
				configurationsToDelete.map((c) => c.id),
			),
		);
		await tx
			.delete(configurations)
			.where(eq(configurations.organizationId, workspaceId));
		await tx.delete(apiKeys).where(eq(apiKeys.organizationId, workspaceId));
		await tx
			.delete(organizationWebhooks)
			.where(eq(organizationWebhooks.organizationId, workspaceId));

		// Deleting audit logs is a destructive action. For compliance,
		// it might be better to soft-delete or archive them.
		// For this implementation, we will hard delete as per requirements.
		await tx.delete(auditLogs).where(eq(auditLogs.organizationId, workspaceId));
		await tx
			.delete(usageRecords)
			.where(eq(usageRecords.organizationId, workspaceId));
		await tx
			.delete(billingEvents)
			.where(eq(billingEvents.organizationId, workspaceId));
		await tx
			.delete(organizationSubscriptions)
			.where(eq(organizationSubscriptions.organizationId, workspaceId));
		await tx
			.delete(invitation)
			.where(eq(invitation.organizationId, workspaceId));
		await tx.delete(member).where(eq(member.organizationId, workspaceId));

		// 6. Finally, delete the workspace itself
		await tx.delete(organization).where(eq(organization.id, workspaceId));

		return {
			success: true,
			message: 'Workspace deleted successfully.',
		};
	});
}
