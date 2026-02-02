import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/db/connection.js';
import { featureFlags } from '@/db/schema.js';

type FeatureFlag = typeof featureFlags.$inferSelect;

type CreateFlagInput = {
	name: string;
	description?: string;
	enabled?: boolean;
	rolloutPercentage?: number;
};

type UpdateFlagInput = {
	name?: string;
	description?: string;
	enabled?: boolean;
	rolloutPercentage?: number;
};

export async function getAllFlags(): Promise<FeatureFlag[]> {
	return db.select().from(featureFlags);
}

export async function createFlag(data: CreateFlagInput): Promise<FeatureFlag> {
	const now = new Date();
	const [flag] = await db
		.insert(featureFlags)
		.values({
			id: nanoid(),
			name: data.name,
			description: data.description ?? null,
			enabled: data.enabled ?? false,
			rolloutPercentage: data.rolloutPercentage ?? 0,
			workspaceOverrides: {},
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	return flag;
}

export async function updateFlag(id: string, data: UpdateFlagInput): Promise<FeatureFlag> {
	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (data.name !== undefined) updates.name = data.name;
	if (data.description !== undefined) updates.description = data.description;
	if (data.enabled !== undefined) updates.enabled = data.enabled;
	if (data.rolloutPercentage !== undefined) updates.rolloutPercentage = data.rolloutPercentage;

	const [flag] = await db
		.update(featureFlags)
		.set(updates)
		.where(eq(featureFlags.id, id))
		.returning();

	return flag;
}

export async function toggleFlag(id: string, enabled: boolean): Promise<void> {
	await db
		.update(featureFlags)
		.set({ enabled, updatedAt: new Date() })
		.where(eq(featureFlags.id, id));
}

export async function deleteFlag(id: string): Promise<void> {
	await db.delete(featureFlags).where(eq(featureFlags.id, id));
}

export async function addWorkspaceOverride(
	flagId: string,
	workspaceId: string,
	enabled: boolean,
): Promise<void> {
	const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId));
	if (!flag) return;

	const overrides = (flag.workspaceOverrides as Record<string, boolean>) ?? {};
	overrides[workspaceId] = enabled;

	await db
		.update(featureFlags)
		.set({ workspaceOverrides: overrides, updatedAt: new Date() })
		.where(eq(featureFlags.id, flagId));
}

export async function removeWorkspaceOverride(flagId: string, workspaceId: string): Promise<void> {
	const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.id, flagId));
	if (!flag) return;

	const overrides = (flag.workspaceOverrides as Record<string, boolean>) ?? {};
	delete overrides[workspaceId];

	await db
		.update(featureFlags)
		.set({ workspaceOverrides: overrides, updatedAt: new Date() })
		.where(eq(featureFlags.id, flagId));
}

export async function isFlagEnabled(flagName: string, workspaceId: string): Promise<boolean> {
	const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.name, flagName));
	if (!flag) return false;

	const overrides = (flag.workspaceOverrides as Record<string, boolean>) ?? {};
	if (workspaceId in overrides) return overrides[workspaceId];

	return flag.enabled;
}

export async function getEnabledFlagsForWorkspace(workspaceId: string): Promise<string[]> {
	const flags = await db.select().from(featureFlags);

	return flags
		.filter((flag) => {
			const overrides = (flag.workspaceOverrides as Record<string, boolean>) ?? {};
			if (workspaceId in overrides) return overrides[workspaceId];
			return flag.enabled;
		})
		.map((flag) => flag.name);
}
