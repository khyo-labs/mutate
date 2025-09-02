import { createFileRoute } from '@tanstack/react-router';

import { CreateWorkspace } from '@/components/workspace/create-workspace';

export const Route = createFileRoute('/join')({
	component: CreateWorkspace,
});
