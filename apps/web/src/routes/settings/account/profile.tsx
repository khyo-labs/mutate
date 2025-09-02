import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUpdateUser } from '@/hooks/use-user';
import { useSession } from '@/stores/auth-store';

export const Route = createFileRoute('/settings/account/profile')({
	component: ProfileComponent,
});

const formSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	image: z.string().url('Invalid image URL').nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

function ProfileComponent() {
	const { data: session } = useSession();
	const updateUser = useUpdateUser();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: session?.user.name || '',
			image: session?.user.image || '',
		},
	});

	async function onSubmit(data: FormData) {
		await updateUser.mutateAsync(data);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<h1 className="text-2xl font-bold dark:text-white">Profile</h1>
			</div>

			<div className="max-w-4xl space-y-6">
				<div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input placeholder="Your name" {...field} />
										</FormControl>
										<FormDescription>
											This is your public display name.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="image"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Profile Picture URL</FormLabel>
										<FormControl>
											<Input
												placeholder="https://example.com/your-image.png"
												{...field}
												value={field.value ?? ''}
											/>
										</FormControl>
										<FormDescription>
											Enter the URL of your profile picture.
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={updateUser.isPending}>
								{updateUser.isPending ? 'Saving...' : 'Save changes'}
							</Button>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}
