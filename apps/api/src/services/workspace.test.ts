import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../db/connection';
import { AppError } from '../utils/error';
import { deleteWorkspace } from './workspace';

// Mock the database connection
vi.mock('../db/connection', () => {
	const mockDbInstance = {
		transaction: vi.fn(),
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn(),
		delete: vi.fn().mockReturnThis(),
	};
	mockDbInstance.transaction.mockImplementation(async (cb) =>
		cb(mockDbInstance),
	);
	return { db: mockDbInstance };
});

// Mock the AppError class
vi.mock('../utils/error', () => ({
	AppError: class AppError extends Error {
		constructor(
			public code: string,
			message: string,
		) {
			super(message);
			this.name = 'AppError';
		}
	},
}));

const mockDb = db as unknown as {
	transaction: vi.Mock;
	select: vi.Mock;
	from: vi.Mock;
	where: vi.Mock;
	delete: vi.Mock;
};

describe('deleteWorkspace', () => {
	const workspaceId = 'ws_123';
	const userId = 'user_123';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw an error if the user is not an owner', async () => {
		mockDb.where.mockResolvedValueOnce([
			{ userId, organizationId: workspaceId, role: 'member' },
		]);

		await expect(deleteWorkspace(workspaceId, userId)).rejects.toThrow(
			'You do not have permission to delete this workspace.',
		);
	});

	it('should throw an error if the user is not a member', async () => {
		mockDb.where.mockResolvedValueOnce([]);

		await expect(deleteWorkspace(workspaceId, userId)).rejects.toThrow(
			'You do not have permission to delete this workspace.',
		);
	});

	it('should throw an error if there are other members in the workspace', async () => {
		mockDb.where
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
			])
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
				{ userId: 'user_456', organizationId: workspaceId, role: 'member' },
			]);

		await expect(deleteWorkspace(workspaceId, userId)).rejects.toThrow(
			'Please remove all other members before deleting the workspace.',
		);
	});

	it('should throw an error if there is an active subscription', async () => {
		mockDb.where
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
			])
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
			])
			.mockResolvedValueOnce([
				{
					organizationId: workspaceId,
					status: 'active',
				},
			]);

		await expect(deleteWorkspace(workspaceId, userId)).rejects.toThrow(
			'Please cancel your active subscription before deleting the workspace.',
		);
	});

	it('should delete the workspace and all related data successfully', async () => {
		// Mock the select calls
		mockDb.where
			// 1. Get membership (owner)
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
			])
			// 2. Get all members (only one)
			.mockResolvedValueOnce([
				{ userId, organizationId: workspaceId, role: 'owner' },
			])
			// 3. Get active subscriptions (none)
			.mockResolvedValueOnce([]);

		// Mock the delete chain
		const deleteWhereMock = vi.fn().mockResolvedValue({ success: true });
		mockDb.delete.mockReturnValue({ where: deleteWhereMock });

		const result = await deleteWorkspace(workspaceId, userId);

		expect(result).toEqual({
			success: true,
			message: 'Workspace deleted successfully.',
		});

		// Verify that all delete functions were called for the correct tables
		expect(mockDb.delete).toHaveBeenCalledTimes(12);
		expect(deleteWhereMock).toHaveBeenCalledTimes(12);
	});
});
