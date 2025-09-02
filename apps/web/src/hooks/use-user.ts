import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { useSession } from '@/stores/auth-store';
import type { SuccessResponse, User } from '@/types';

type UpdateUserPayload = {
	name: string;
	image?: string | null;
};

export function useUpdateUser() {
	const session = useSession();

	return useMutation({
		mutationFn: async (payload: UpdateUserPayload) =>
			await api.put<SuccessResponse<User>>('/v1/user/me', payload),
		onSuccess: () => {
			session.refetch();
			toast.success('Profile updated successfully');
		},
		onError: (error) => {
			console.error('Failed to update user:', error);
			toast.error('Failed to update profile');
		},
	});
}
