import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import {
	ChevronLeft,
	ChevronRight,
	Copy,
	Mail,
	MoreHorizontal,
	Search,
	Shield,
	User,
	UserMinus,
	UserPlus,
	Users,
	X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
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
import { SettingsHeader } from '@/components/settings/header';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from '@/stores/auth-store';
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

function getRoleIcon(role: string) {
	switch (role) {
		case 'owner':
			return <Shield className="h-4 w-4" />;
		case 'admin':
			return <Users className="h-4 w-4" />;
		default:
			return <User className="h-4 w-4" />;
	}
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' | 'destructive' {
	switch (role) {
		case 'owner':
			return 'default';
		case 'admin':
			return 'secondary';
		default:
			return 'outline';
	}
}

const inviteSchema = z.object({
	email: z.string().email({ message: 'Please enter a valid email address.' }),
	role: z.enum(['admin', 'member']),
	sendEmail: z.boolean(),
});

const updateRoleSchema = z.object({
	role: z.enum(['admin', 'member']),
});

function InviteDialog({ workspaceId }: { workspaceId: string }) {
	const queryClient = useQueryClient();
	const form = useForm<z.infer<typeof inviteSchema>>({
		resolver: zodResolver(inviteSchema),
		defaultValues: {
			email: '',
			role: 'member',
			sendEmail: true,
		},
	});

	const mutation = useMutation({
		mutationFn: (data: InviteMemberRequest) => membersApi.invite(workspaceId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			form.reset();
			toast.success('Invitation sent successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to send invitation');
		},
	});

	function onSubmit(values: z.infer<typeof inviteSchema>) {
		mutation.mutate({
			email: values.email,
			role: values.role,
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email Address</FormLabel>
							<FormControl>
								<Input placeholder="colleague@company.com" type="email" {...field} />
							</FormControl>
							<FormDescription>We'll send an invitation to this email address.</FormDescription>
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
							<Select onValueChange={field.onChange} defaultValue={field.value}>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select a role" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="member">
										<div className="flex items-center gap-2">
											<User className="h-4 w-4" />
											<div>
												<div className="font-medium">Member</div>
												<div className="text-muted-foreground text-xs">
													Can view and use workspace resources
												</div>
											</div>
										</div>
									</SelectItem>
									<SelectItem value="admin">
										<div className="flex items-center gap-2">
											<Users className="h-4 w-4" />
											<div>
												<div className="font-medium">Admin</div>
												<div className="text-muted-foreground text-xs">
													Can manage workspace and members
												</div>
											</div>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="sendEmail"
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-y-0 space-x-3">
							<FormControl>
								<input
									type="checkbox"
									checked={field.value}
									onChange={field.onChange}
									className="mt-1"
								/>
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel>Send invitation email</FormLabel>
								<FormDescription>
									Send an email notification with the invitation link
								</FormDescription>
							</div>
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
			role: member.role === 'owner' ? 'admin' : member.role,
		},
	});

	const mutation = useMutation({
		mutationFn: (data: UpdateMemberRoleRequest) =>
			membersApi.updateRole(workspaceId, member.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			setIsOpen(false);
			toast.success('Role updated successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update role');
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
						Update the role for {member.user.name || member.user.email}. This will change their
						permissions immediately.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Role</FormLabel>
									<Select onValueChange={field.onChange} defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="member">
												<div className="flex items-center gap-2">
													<User className="h-4 w-4" />
													<div>
														<div className="font-medium">Member</div>
														<div className="text-muted-foreground text-xs">
															Can view and use workspace resources
														</div>
													</div>
												</div>
											</SelectItem>
											<SelectItem value="admin">
												<div className="flex items-center gap-2">
													<Users className="h-4 w-4" />
													<div>
														<div className="font-medium">Admin</div>
														<div className="text-muted-foreground text-xs">
															Can manage workspace and members
														</div>
													</div>
												</div>
											</SelectItem>
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
								{mutation.isPending ? 'Updating...' : 'Update Role'}
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
	currentUserRole,
}: {
	data: MemberOrInvitation[];
	workspaceId: string;
	currentUserRole?: string;
}) {
	const queryClient = useQueryClient();
	const { data: session } = useSession();
	const [globalFilter, setGlobalFilter] = useState('');
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

	const cancelMutation = useMutation({
		mutationFn: (invitationId: string) => membersApi.cancelInvitation(workspaceId, invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			toast.success('Invitation cancelled');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to cancel invitation');
		},
	});

	const resendMutation = useMutation({
		mutationFn: (invitationId: string) => membersApi.resendInvitation(workspaceId, invitationId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			toast.success('Invitation resent');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to resend invitation');
		},
	});

	const removeMutation = useMutation({
		mutationFn: (memberId: string) => membersApi.remove(workspaceId, memberId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
			toast.success('Member removed');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to remove member');
		},
	});

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		toast.success('Invitation link copied to clipboard');
	}

	const canManageUser = useCallback(
		function (targetRole: 'admin' | 'member' | 'owner'): boolean {
			if (!currentUserRole) return false;
			if (currentUserRole === 'owner') return true;
			if (currentUserRole === 'admin' && targetRole === 'member') return true;
			return false;
		},
		[currentUserRole],
	);

	const columns: ColumnDef<MemberOrInvitation>[] = useMemo(
		() => [
			{
				accessorFn: (row) => (row.type === 'member' ? row.user.name || row.user.email : row.email),
				id: 'memberName',
				header: 'Member',
				cell: ({ row }) => {
					const item = row.original;
					const name = item.type === 'member' ? item.user.name || item.user.email : item.email;
					const email = item.type === 'member' ? item.user.email : item.email;
					const avatar = item.type === 'member' ? item.user.avatar : undefined;

					return (
						<div className="flex items-center gap-3">
							<Avatar className="h-8 w-8">
								<AvatarImage src={avatar} />
								<AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<div className="text-sm font-medium">{item.type === 'member' ? name : '—'}</div>
								<div className="text-muted-foreground text-xs">{email}</div>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'role',
				header: 'Role',
				cell: ({ row }) => {
					const role = row.original.role;
					return (
						<div className="flex items-center gap-2">
							{getRoleIcon(role)}
							<Badge variant={getRoleBadgeVariant(role)}>
								{role.charAt(0).toUpperCase() + role.slice(1)}
							</Badge>
						</div>
					);
				},
				filterFn: (row, id, value) => {
					return value.includes(row.getValue(id));
				},
			},
			{
				accessorKey: 'status',
				header: 'Status',
				cell: ({ row }) => {
					const item = row.original;
					if (item.type === 'member') {
						return (
							<Badge variant="default" className="bg-green-500/10 text-green-600">
								Active
							</Badge>
						);
					}

					// Check if invitation is expired
					if (item.type === 'invitation' && item.expiresAt) {
						const isExpired = new Date(item.expiresAt) < new Date();
						if (isExpired) {
							return (
								<Badge variant="destructive" className="bg-red-500/10 text-red-600">
									Expired
								</Badge>
							);
						}
					}

					return (
						<Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
							Pending
						</Badge>
					);
				},
			},
			{
				accessorKey: 'createdAt',
				header: 'Joined / Invited',
				cell: ({ row }) => {
					const item = row.original;
					const date = new Date(item.createdAt);
					const formattedDate = date.toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric',
					});

					if (item.type === 'invitation' && item.expiresAt) {
						const expiryDate = new Date(item.expiresAt);
						const daysLeft = Math.ceil(
							(expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
						);
						const isExpired = daysLeft < 0;

						return (
							<div className="flex flex-col">
								<div className="text-sm">{formattedDate}</div>
								<div className={`text-xs ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
									{isExpired ? 'Expired' : `${daysLeft} days left`}
								</div>
							</div>
						);
					}

					return <div className="text-sm">{formattedDate}</div>;
				},
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({ row }) => {
					const item = row.original;

					if (!currentUserRole || !canManageUser(item.role)) {
						return null;
					}

					if (item.type === 'invitation') {
						const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();

						return (
							<div className="flex items-center gap-2">
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => resendMutation.mutate(item.id)}
												disabled={resendMutation.isPending}
											>
												<Mail className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>{isExpired ? 'Resend expired invitation' : 'Resend invitation'}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>

								{item.invitationLink && (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => copyToClipboard(item.invitationLink!)}
												>
													<Copy className="h-4 w-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>Copy invitation link</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}

								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => cancelMutation.mutate(item.id)}
												disabled={cancelMutation.isPending}
											>
												<X className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>
											<p>Cancel invitation</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						);
					}

					if (
						item.type === 'member' &&
						item.userId !== session?.user?.id &&
						item.role !== 'owner'
					) {
						return (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<UpdateRoleDialog workspaceId={workspaceId} member={item}>
										<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
											<Shield className="mr-2 h-4 w-4" />
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
												<UserMinus className="mr-2 h-4 w-4" />
												Remove Member
											</DropdownMenuItem>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Remove member?</AlertDialogTitle>
												<AlertDialogDescription>
													This will permanently remove {item.user.name || item.user.email} from the
													workspace. They will lose access to all workspace resources.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => removeMutation.mutate(item.id)}
													className="bg-destructive text-destructive-foreground"
												>
													Remove Member
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
		[
			currentUserRole,
			session?.user?.id,
			workspaceId,
			cancelMutation,
			resendMutation,
			removeMutation,
			canManageUser,
		],
	);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			globalFilter,
			columnFilters,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize: 10,
			},
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<div className="relative max-w-sm flex-1">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						placeholder="Search by name or email..."
						value={globalFilter ?? ''}
						onChange={(event) => setGlobalFilter(event.target.value)}
						className="pl-9"
					/>
				</div>
				<Select
					value={(columnFilters.find((filter) => filter.id === 'role')?.value as string) || 'all'}
					onValueChange={(value) => {
						if (value === 'all') {
							setColumnFilters(columnFilters.filter((filter) => filter.id !== 'role'));
						} else {
							setColumnFilters([
								...columnFilters.filter((filter) => filter.id !== 'role'),
								{ id: 'role', value: [value] },
							]);
						}
					}}
				>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="Filter by role" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All roles</SelectItem>
						<SelectItem value="owner">Owner</SelectItem>
						<SelectItem value="admin">Admin</SelectItem>
						<SelectItem value="member">Member</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									No members found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-between">
				<div className="text-muted-foreground text-sm">
					Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{' '}
					to{' '}
					{Math.min(
						(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
						data.length,
					)}{' '}
					of {data.length} members
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeft className="h-4 w-4" />
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}

function MembersStats({ data }: { data: MemberOrInvitation[] }) {
	const stats = useMemo(() => {
		const members = data.filter((item) => item.type === 'member');
		const invitations = data.filter((item) => item.type === 'invitation');
		const activeInvitations = invitations.filter(
			(inv) => !inv.expiresAt || new Date(inv.expiresAt) > new Date(),
		);
		const expiredInvitations = invitations.filter(
			(inv) => inv.expiresAt && new Date(inv.expiresAt) < new Date(),
		);

		return {
			totalMembers: members.length,
			owners: members.filter((m) => m.role === 'owner').length,
			admins: members.filter((m) => m.role === 'admin').length,
			regularMembers: members.filter((m) => m.role === 'member').length,
			pendingInvitations: activeInvitations.length,
			expiredInvitations: expiredInvitations.length,
		};
	}, [data]);

	return (
		<div className="grid gap-4 md:grid-cols-4">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Total Members</CardTitle>
					<Users className="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.totalMembers}</div>
					<p className="text-muted-foreground text-xs">Active workspace members</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Admins</CardTitle>
					<Shield className="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.owners + stats.admins}</div>
					<p className="text-muted-foreground text-xs">
						{stats.owners} owner{stats.owners !== 1 ? 's' : ''}, {stats.admins} admin
						{stats.admins !== 1 ? 's' : ''}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Regular Members</CardTitle>
					<User className="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.regularMembers}</div>
					<p className="text-muted-foreground text-xs">Standard access members</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
					<Mail className="text-muted-foreground h-4 w-4" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{stats.pendingInvitations}</div>
					<p className="text-muted-foreground text-xs">
						{stats.expiredInvitations > 0 && `${stats.expiredInvitations} expired`}
						{stats.expiredInvitations === 0 && 'Awaiting acceptance'}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function MembersComponent() {
	const { activeWorkspace } = useWorkspaceStore();
	const workspaceId = activeWorkspace?.id || '';
	const { data: session } = useSession();
	const [activeTab, setActiveTab] = useState<'all' | 'members' | 'invitations'>('all');

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['members', workspaceId],
		queryFn: () => membersApi.list(workspaceId),
		enabled: !!workspaceId,
		refetchInterval: 30000, // Refresh every 30 seconds
	});

	// Find current user's role from the members list
	const currentUserRole = useMemo(() => {
		if (!session?.user || !data) return undefined;
		const currentMember = data.find(
			(item) => item.type === 'member' && item.userId === session.user.id,
		) as Member | undefined;
		return currentMember?.role;
	}, [data, session]);

	// Filter data based on active tab
	const filteredData = useMemo(() => {
		if (!data) return [];

		switch (activeTab) {
			case 'members':
				return data.filter((item) => item.type === 'member');
			case 'invitations':
				return data.filter((item) => item.type === 'invitation');
			default:
				return data;
		}
	}, [data, activeTab]);

	if (isLoading || !activeWorkspace) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">Members</h2>
						<p className="text-muted-foreground">Manage who has access to this workspace</p>
					</div>
					<Skeleton className="h-10 w-32" />
				</div>

				<div className="grid gap-4 md:grid-cols-4">
					{[...Array(4)].map((_, i) => (
						<Card key={i}>
							<CardHeader className="space-y-0 pb-2">
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
								<Skeleton className="mt-1 h-3 w-32" />
							</CardContent>
						</Card>
					))}
				</div>

				<Card>
					<CardHeader>
						<Skeleton className="h-10 w-64" />
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{[...Array(5)].map((_, i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 py-8">
				<div className="text-destructive">Failed to load members. Please try again.</div>
				<Button onClick={() => refetch()}>Retry</Button>
			</div>
		);
	}

	const canInvite = currentUserRole === 'admin' || currentUserRole === 'owner';

	return (
		<div className="space-y-6">
			<SettingsHeader
				title="Members"
				description={`Manage who has access to ${activeWorkspace.name}`}
				button={
					canInvite
						? {
								label: 'Invite Member',
								icon: UserPlus,
								title: 'Invite a new member',
								description:
									"Send an invitation to join your workspace. They'll receive an email with instructions.",
								dialog: () => <InviteDialog workspaceId={workspaceId} />,
							}
						: undefined
				}
			/>

			<MembersStats data={data || []} />

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Workspace Members</CardTitle>
						<Tabs
							value={activeTab}
							onValueChange={(v) => setActiveTab(v as 'all' | 'members' | 'invitations')}
						>
							<TabsList>
								<TabsTrigger value="all">All ({data?.length || 0})</TabsTrigger>
								<TabsTrigger value="members">
									Members ({data?.filter((d) => d.type === 'member').length || 0})
								</TabsTrigger>
								<TabsTrigger value="invitations">
									Invitations ({data?.filter((d) => d.type === 'invitation').length || 0})
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				</CardHeader>
				<CardContent>
					<MembersTable
						data={filteredData}
						workspaceId={workspaceId}
						currentUserRole={currentUserRole}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
