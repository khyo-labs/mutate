import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/create-mutation')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/create-mutation"!</div>;
}
