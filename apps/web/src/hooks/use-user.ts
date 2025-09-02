import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { useSession } from '@/stores/auth-store';

type UpdateUserPayload = {
	name: string;
	image?: string | null;
};

export function useUpdateUser() {
	const { setSession, data: sessionData } = useSession();

	return useMutation({
		mutationFn: async (payload: UpdateUserPayload) => {
			const { data } = await api.put('/user/me', payload);
			return data;
		},
		onSuccess: (data) => {
			if (sessionData) {
				setSession({
					...sessionData,
					user: {
						...sessionData.user,
						...data.data,
					},
				});
			}
			toast.success('Profile updated successfully');
		},
		onError: (error) => {
			console.error('Failed to update user:', error);
			toast.error('Failed to update profile');
		},
	});
}
