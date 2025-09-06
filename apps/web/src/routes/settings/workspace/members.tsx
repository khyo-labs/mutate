import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useParams } from '@tanstack/react-router';
import {
	ColumnDef,
	SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
	type InviteMemberRequest,
	type Member,
	type MemberOrInvitation,
	type UpdateMemberRoleRequest,
	membersApi,
} from '@/api/members';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useCurrentUser } from '@/hooks/use-auth';
import { useWorkspaceStore } from '@/stores/workspace-store';

export const Route = createFileRoute('/settings/workspace/members')({
	component: MembersComponent,
});

function getInitials(name: string) {
	const names = name.split(' ');
	if (names.length > 1) {
		return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
	}
	return names[0].substring(0, 2).toUpperCase();
}

const inviteSchema = z.object({
	email: z.string().email({ message: 'Please enter a valid email address.' }),
	role: z.enum(['admin', 'member'], {
		required_error: 'Please select a role.',
	}),
});

const updateRoleSchema = z.object({
	role: z.enum(['admin', 'member'], {
		required_error: 'Please select a role.',
	}),
});

function InviteDialog({ workspaceId }: { workspaceId: string }) {
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof inviteSchema>>({
		resolver: zodResolver(inviteSchema),
		defaultValues: {
			email: '',
			role: 'member',
		},
	});

	const mutation = useMutation({
		mutationFn: (data: InviteMemberRequest) =>
			membersApi.invite(workspaceId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			setIsOpen(false);
			form.reset();
		},
	});

	function onSubmit(values: z.infer<typeof inviteSchema>) {
		mutation.mutate(values);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>Invite Member</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite a new member</DialogTitle>
					<DialogDescription>
						Enter the email address and role of the person you want to invite.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input placeholder="name@example.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={mutation.isPending}>
								{mutation.isPending ? 'Sending...' : 'Send Invitation'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function UpdateRoleDialog({
	workspaceId,
	member,
	children,
}: {
	workspaceId: string;
	member: Member;
	children: React.ReactNode;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof updateRoleSchema>>({
		resolver: zodResolver(updateRoleSchema),
		defaultValues: {
			role: member.role,
		},
	});

	const mutation = useMutation({
		mutationFn: (data: UpdateMemberRoleRequest) =>
			membersApi.updateRole(workspaceId, member.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			setIsOpen(false);
		},
	});

	function onSubmit(values: z.infer<typeof updateRoleSchema>) {
		mutation.mutate(values);
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change member role</DialogTitle>
					<DialogDescription>
						Select a new role for {member.user.email}.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={mutation.isPending}>
								{mutation.isPending ? 'Saving...' : 'Save Changes'}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function MembersTable({
	data,
	workspaceId,
}: {
	data: MemberOrInvitation[];
	workspaceId: string;
}) {
	const queryClient = useQueryClient();
	const { data: user } = useCurrentUser();
	const { activeWorkspace } = useWorkspaceStore();
	const currentUserRole = activeWorkspace?.role;
	const [globalFilter, setGlobalFilter] = useState('');
	const [sorting, setSorting] = useState<SortingState>([]);

	const cancelMutation = useMutation({
		mutationFn: (invitationId: string) =>
			membersApi.cancelInvitation(workspaceId, invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
		},
	});

	const resendMutation = useMutation({
		mutationFn: (invitationId: string) =>
			membersApi.resendInvitation(workspaceId, invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
		},
	});

	const removeMutation = useMutation({
		mutationFn: (memberId: string) => membersApi.remove(workspaceId, memberId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
		},
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Invitation link copied to clipboard!');
	}

	function canManage(targetRole: 'admin' | 'member' | 'owner'): boolean {
		if (currentUserRole === 'owner') return true;
		if (currentUserRole === 'admin' && targetRole === 'member') return true;
		return false;
	}

	const columns: ColumnDef<MemberOrInvitation>[] = useMemo(
		() => [
			{
				accessorFn: (row) =>
					row.type === 'member' ? row.user.name : row.email,
				id: 'memberName',
				header: 'Member',
				cell: ({ row }) => {
					const item = row.original;
					const name = item.type === 'member' ? item.user.name : item.email;
					const avatar = item.type === 'member' ? item.user.avatar : undefined;
					return (
						<div className="flex items-center gap-4">
							<Avatar>
								<AvatarImage src={avatar} />
								<AvatarFallback>{getInitials(name)}</AvatarFallback>
							</Avatar>
							<div>
								<div className="font-medium">
									{item.type === 'member' ? name : ''}
								</div>
								<div className="text-muted-foreground">{item.email}</div>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'role',
				header: 'Role',
				cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) => {
					const item = row.original;
					return (
						<Badge variant={item.type === 'member' ? 'default' : 'secondary'}>
							{item.type === 'member' ? 'Active' : 'Invited'}
						</Badge>
					);
				},
			},
			{
				accessorKey: 'createdAt',
				header: 'Joined',
				cell: ({ row }) =>
					new Date(row.original.createdAt).toLocaleDateString(),
			},
			{
				id: 'actions',
				cell: ({ row }) => {
					const item = row.original;
					if (!currentUserRole) return null;

					if (item.type === 'invitation') {
						return (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" className="h-8 w-8 p-0">
										<span className="sr-only">Open menu</span>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => resendMutation.mutate(item.id)}
									>
										Resend Invitation
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											item.invitationLink &&
											copyToClipboard(item.invitationLink)
										}
									>
										Copy Link
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => cancelMutation.mutate(item.id)}
									>
										Cancel Invitation
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						);
					}

					if (
						item.type === 'member' &&
						item.userId !== user?.id &&
						canManage(item.role)
					) {
						return (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" className="h-8 w-8 p-0">
										<span className="sr-only">Open menu</span>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<UpdateRoleDialog workspaceId={workspaceId} member={item}>
										<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
											Change Role
										</DropdownMenuItem>
									</UpdateRoleDialog>
									<DropdownMenuSeparator />
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<DropdownMenuItem
												className="text-destructive"
												onSelect={(e) => e.preventDefault()}
											>
												Remove
											</DropdownMenuItem>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Are you sure?</AlertDialogTitle>
												<AlertDialogDescription>
													This will permanently remove {item.user.email} from
													the workspace.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => removeMutation.mutate(item.id)}
												>
													Yes, remove member
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</DropdownMenuContent>
							</DropdownMenu>
						);
					}

					return null;
				},
			},
		],
		[currentUserRole, user, workspaceId],
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div className="space-y-4">
			<Input
				placeholder="Filter by name or email..."
				value={globalFilter ?? ''}
				onChange={(event) => setGlobalFilter(event.target.value)}
				className="max-w-sm"
			/>
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronLeft className="mr-2 h-4 w-4" />
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
					<ChevronRight className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}

function MembersComponent() {
	const { workspaceId } = useParams({ from: '/settings/workspace/members' });
	const { activeWorkspace } = useWorkspaceStore();

	const { data, isLoading, isError } = useQuery({
		queryKey: ['members', workspaceId],
		queryFn: () => membersApi.list(workspaceId),
	});

	if (isLoading || !activeWorkspace) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold">Members</h2>
						<p className="text-muted-foreground">
							Manage who has access to this workspace.
						</p>
					</div>
					<Skeleton className="h-10 w-32" />
				</div>
				<Skeleton className="h-10 w-64" />
				<div className="space-y-2">
					{[...Array(3)].map((_, i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</div>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="text-destructive">
				Failed to load members. Please try again.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Members</h2>
					<p className="text-muted-foreground">
						Manage who has access to this workspace.
					</p>
				</div>
				{(activeWorkspace.role === 'admin' ||
					activeWorkspace.role === 'owner') && (
					<InviteDialog workspaceId={workspaceId} />
				)}
			</div>
			<MembersTable data={data || []} workspaceId={workspaceId} />
		</div>
	);
}
