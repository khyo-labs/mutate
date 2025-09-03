import { createFileRoute } from '@tanstack/react-router';

import { CreateMutation } from '@/components/mutations/create-mutation';

export const Route = createFileRoute('/create-mutation')({
	component: CreateMutation,
});
