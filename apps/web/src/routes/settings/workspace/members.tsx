import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings/workspace/members')({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/settings/workspace/members"!</div>;
}
