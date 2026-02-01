import { toast } from 'sonner';

import type { SuccessResponse } from '@/types';

import { api } from './client';

export type Member = {
	id: string;
	userId: string;
	role: 'admin' | 'member' | 'owner';
	createdAt: string;
	user: {
		id: string;
		name: string;
		email: string;
		avatar?: string;
	};
	type: 'member';
};

export type Invitation = {
	id: string;
	email: string;
	role: 'admin' | 'member';
	inviterId: string;
	organizationId: string;
	status: 'pending' | 'accepted' | 'expired';
	expiresAt: string;
	createdAt: string;
	inviter: {
		user: {
			name: string;
			email: string;
		};
	};
	type: 'invitation';
	invitationLink?: string;
};

export type MemberOrInvitation = Member | Invitation;

export type InviteMemberRequest = {
	email: string;
	role: 'admin' | 'member';
};

export type UpdateMemberRoleRequest = {
	role: 'admin' | 'member';
};

export const membersApi = {
	list: async function (workspaceId: string): Promise<MemberOrInvitation[]> {
		const response = await api.get<SuccessResponse<MemberOrInvitation[]>>(
			`/v1/workspace/${workspaceId}/members`,
		);
		return response.data;
	},

	invite: async function (workspaceId: string, data: InviteMemberRequest): Promise<Invitation> {
		const response = await api.post<SuccessResponse<Invitation>>(
			`/v1/workspace/${workspaceId}/members`,
			data,
		);
		toast.success('Invitation sent successfully');
		return response.data;
	},

	remove: async function (workspaceId: string, memberId: string): Promise<void> {
		await api.delete(`/v1/workspace/${workspaceId}/members/${memberId}`);
		toast.success('Member removed successfully');
	},

	updateRole: async function (
		workspaceId: string,
		memberId: string,
		data: UpdateMemberRoleRequest,
	): Promise<void> {
		await api.put(`/v1/workspace/${workspaceId}/members/${memberId}/role`, data);
		toast.success('Member role updated successfully');
	},

	cancelInvitation: async function (workspaceId: string, invitationId: string): Promise<void> {
		await api.delete(`/v1/workspace/${workspaceId}/members/invitations/${invitationId}`);
		toast.success('Invitation canceled successfully');
	},

	resendInvitation: async function (workspaceId: string, invitationId: string): Promise<void> {
		await api.post(`/v1/workspace/${workspaceId}/members/invitations/${invitationId}/resend`);
		toast.success('Invitation resent successfully');
	},
};
