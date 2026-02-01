import { Link } from '@tanstack/react-router';
import { FileText, Plus } from 'lucide-react';

import { Button } from '../ui/button';

export function NoMutations() {
	return (
		<div className="py-8 text-center">
			<div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-md">
				<FileText className="text-muted-foreground h-6 w-6" />
			</div>
			<h3 className="text-foreground mt-4 text-sm font-medium">No mutations</h3>
			<p className="text-muted-foreground mt-2 text-sm">
				Get started by creating your first mutation.
			</p>
			<div className="mt-4">
				<Link to="/mutations/create">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Create Mutation
					</Button>
				</Link>
			</div>
		</div>
	);
}
