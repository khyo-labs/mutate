import { createFileRoute } from '@tanstack/react-router';
import {
	CheckCircle,
	Key,
	Loader2,
	Mail,
	MoreVertical,
	RefreshCw,
	Search,
	Shield,
	User,
	UserCheck,
	Users,
	XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export const Route = createFileRoute('/admin/users/')({
	component: UserManagement,
});

interface UserDetails {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	createdAt: string;
	image?: string;
	workspaces: {
		id: string;
		name: string;
		role: string;
		joinedAt: string;
	}[];
	isAdmin: boolean;
	lastLoginAt?: string;
	totalTransformations?: number;
}

function UserManagement() {
	const [users, setUsers] = useState<UserDetails[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterVerified, setFilterVerified] = useState('all');
	const [filterRole, setFilterRole] = useState('all');
	const [sortBy, setSortBy] = useState('created');
	const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
	const [showUserModal, setShowUserModal] = useState(false);
	const [showBulkAction, setShowBulkAction] = useState(false);
	const [bulkMessage, setBulkMessage] = useState('');
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

	useEffect(() => {
		fetchUsers();
	}, []);

	async function fetchUsers() {
		try {
			setLoading(true);
			const users = await api.get<UserDetails[]>('/v1/admin/users');
			setUsers(users);
		} catch (error) {
			console.error('Failed to fetch users:', error);
			toast.error('Failed to load users');
		} finally {
			setLoading(false);
		}
	}

	async function impersonateUser(userId: string) {
		try {
			const data = await api.post<{ sessionToken?: string }>(
				`/v1/admin/users/${userId}/impersonate`,
			);
			if (data.sessionToken) {
				// Store the impersonation token and redirect
				sessionStorage.setItem('impersonation_token', data.sessionToken);
				toast.success('Impersonation started');
				window.location.href = '/';
			}
		} catch (error) {
			toast.error('Failed to impersonate user');
		}
	}

	async function resetPassword(userId: string) {
		try {
			await api.post(`/v1/admin/users/${userId}/reset-password`);
			toast.success('Password reset email sent');
		} catch (error) {
			toast.error('Failed to send password reset');
		}
	}

	async function verifyEmail(userId: string) {
		try {
			await api.post(`/v1/admin/users/${userId}/verify-email`);
			toast.success('Email verified successfully');
			fetchUsers();
		} catch (error) {
			toast.error('Failed to verify email');
		}
	}

	async function makeAdmin(userId: string) {
		try {
			await api.post(`/v1/admin/users/${userId}/make-admin`);
			toast.success('User promoted to platform admin');
			fetchUsers();
		} catch (error) {
			toast.error('Failed to make user admin');
		}
	}

	async function removeAdmin(userId: string) {
		try {
			await api.post(`/v1/admin/users/${userId}/remove-admin`);
			toast.success('Admin privileges removed');
			fetchUsers();
		} catch (error) {
			toast.error('Failed to remove admin privileges');
		}
	}

	async function sendBulkMessage() {
		try {
			await api.post('/v1/admin/users/bulk-message', {
				userIds: selectedUsers,
				message: bulkMessage,
			});
			toast.success('Message sent to selected users');
			setShowBulkAction(false);
			setBulkMessage('');
			setSelectedUsers([]);
		} catch (error) {
			toast.error('Failed to send bulk message');
		}
	}

	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.id.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesVerified =
			filterVerified === 'all' ||
			(filterVerified === 'verified' && user.emailVerified) ||
			(filterVerified === 'unverified' && !user.emailVerified);

		const matchesRole =
			filterRole === 'all' ||
			(filterRole === 'admin' && user.isAdmin) ||
			(filterRole === 'user' && !user.isAdmin);

		return matchesSearch && matchesVerified && matchesRole;
	});

	const sortedUsers = [...filteredUsers].sort((a, b) => {
		switch (sortBy) {
			case 'name':
				return a.name.localeCompare(b.name);
			case 'email':
				return a.email.localeCompare(b.email);
			case 'created':
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
			case 'activity':
				return (
					new Date(b.lastLoginAt || b.createdAt).getTime() -
					new Date(a.lastLoginAt || a.createdAt).getTime()
				);
			default:
				return 0;
		}
	});

	// Calculate statistics
	const stats = {
		total: users.length,
		verified: users.filter((u) => u.emailVerified).length,
		admins: users.filter((u) => u.isAdmin).length,
		activeToday: users.filter((u) => {
			if (!u.lastLoginAt) return false;
			const lastLogin = new Date(u.lastLoginAt);
			const today = new Date();
			return lastLogin.toDateString() === today.toDateString();
		}).length,
	};

	if (loading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">User Management</h2>
				<p className="text-muted-foreground">Manage all users across the platform</p>
			</div>

			{/* Statistics Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<Users className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
						<p className="text-muted-foreground text-xs">All registered users</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Verified</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.verified}</div>
						<p className="text-muted-foreground text-xs">Email verified</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Admins</CardTitle>
						<Shield className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.admins}</div>
						<p className="text-muted-foreground text-xs">Platform admins</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Active Today</CardTitle>
						<UserCheck className="h-4 w-4 text-purple-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.activeToday}</div>
						<p className="text-muted-foreground text-xs">Logged in today</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters and Search */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>All Users</CardTitle>
						<div className="flex gap-2">
							{selectedUsers.length > 0 && (
								<Button variant="outline" size="sm" onClick={() => setShowBulkAction(true)}>
									<Mail className="mr-2 h-4 w-4" />
									Message ({selectedUsers.length})
								</Button>
							)}
							<Button variant="outline" size="sm" onClick={fetchUsers}>
								<RefreshCw className="mr-2 h-4 w-4" />
								Refresh
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="mb-4 flex flex-wrap gap-2">
						<div className="relative flex-1">
							<Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
							<Input
								placeholder="Search users..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-8"
							/>
						</div>
						<Select value={filterVerified} onValueChange={setFilterVerified}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Filter by verification" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Users</SelectItem>
								<SelectItem value="verified">Verified</SelectItem>
								<SelectItem value="unverified">Unverified</SelectItem>
							</SelectContent>
						</Select>
						<Select value={filterRole} onValueChange={setFilterRole}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Filter by role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="admin">Admins</SelectItem>
								<SelectItem value="user">Regular Users</SelectItem>
							</SelectContent>
						</Select>
						<Select value={sortBy} onValueChange={setSortBy}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Sort by" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="created">Created Date</SelectItem>
								<SelectItem value="name">Name</SelectItem>
								<SelectItem value="email">Email</SelectItem>
								<SelectItem value="activity">Last Activity</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[40px]">
										<input
											type="checkbox"
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedUsers(sortedUsers.map((u) => u.id));
												} else {
													setSelectedUsers([]);
												}
											}}
											checked={
												selectedUsers.length === sortedUsers.length && sortedUsers.length > 0
											}
										/>
									</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Workspaces</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<input
												type="checkbox"
												checked={selectedUsers.includes(user.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedUsers([...selectedUsers, user.id]);
													} else {
														setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
													}
												}}
											/>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{user.image ? (
													<img src={user.image} alt={user.name} className="h-8 w-8 rounded-full" />
												) : (
													<div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
														<User className="h-4 w-4" />
													</div>
												)}
												<div>
													<div className="font-medium">{user.name}</div>
													{user.isAdmin && (
														<Badge variant="secondary" className="text-xs">
															Admin
														</Badge>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="text-sm">{user.email}</span>
												{user.emailVerified ? (
													<CheckCircle className="h-3 w-3 text-green-600" />
												) : (
													<XCircle className="h-3 w-3 text-yellow-600" />
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													user.lastLoginAt &&
													new Date(user.lastLoginAt) >
														new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
														? 'default'
														: 'secondary'
												}
											>
												{user.lastLoginAt &&
												new Date(user.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
													? 'Active'
													: 'Inactive'}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1">
												<Users className="h-3 w-3" />
												<span className="text-sm">{user.workspaces.length}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-muted-foreground text-sm">
												{new Date(user.createdAt).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="icon">
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>Actions</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => {
															setSelectedUser(user);
															setShowUserModal(true);
														}}
													>
														<User className="mr-2 h-4 w-4" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => impersonateUser(user.id)}>
														<Key className="mr-2 h-4 w-4" />
														Impersonate
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => resetPassword(user.id)}>
														<RefreshCw className="mr-2 h-4 w-4" />
														Reset Password
													</DropdownMenuItem>
													{!user.emailVerified && (
														<DropdownMenuItem onClick={() => verifyEmail(user.id)}>
															<CheckCircle className="mr-2 h-4 w-4" />
															Verify Email
														</DropdownMenuItem>
													)}
													<DropdownMenuSeparator />
													{user.isAdmin ? (
														<DropdownMenuItem
															onClick={() => removeAdmin(user.id)}
															className="text-red-600"
														>
															<XCircle className="mr-2 h-4 w-4" />
															Remove Admin
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={() => makeAdmin(user.id)}
															className="text-blue-600"
														>
															<Shield className="mr-2 h-4 w-4" />
															Make Admin
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* User Details Modal */}
			<Dialog open={showUserModal} onOpenChange={setShowUserModal}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>User Details</DialogTitle>
						<DialogDescription>
							View detailed information about {selectedUser?.name}
						</DialogDescription>
					</DialogHeader>
					{selectedUser && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label>Name</Label>
									<p className="text-sm">{selectedUser.name}</p>
								</div>
								<div>
									<Label>Email</Label>
									<p className="text-sm">{selectedUser.email}</p>
								</div>
								<div>
									<Label>User ID</Label>
									<p className="font-mono text-sm">{selectedUser.id}</p>
								</div>
								<div>
									<Label>Joined</Label>
									<p className="text-sm">{new Date(selectedUser.createdAt).toLocaleString()}</p>
								</div>
								<div>
									<Label>Email Verified</Label>
									<p className="text-sm">{selectedUser.emailVerified ? 'Yes' : 'No'}</p>
								</div>
								<div>
									<Label>Last Login</Label>
									<p className="text-sm">
										{selectedUser.lastLoginAt
											? new Date(selectedUser.lastLoginAt).toLocaleString()
											: 'Never'}
									</p>
								</div>
							</div>

							<div>
								<Label>Workspaces ({selectedUser.workspaces.length})</Label>
								<div className="mt-2 space-y-2">
									{selectedUser.workspaces.map((workspace) => (
										<div
											key={workspace.id}
											className="flex items-center justify-between rounded-lg border p-2"
										>
											<div>
												<p className="font-medium">{workspace.name}</p>
												<p className="text-muted-foreground text-xs">
													Joined {new Date(workspace.joinedAt).toLocaleDateString()}
												</p>
											</div>
											<Badge>{workspace.role}</Badge>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Bulk Action Modal */}
			<Dialog open={showBulkAction} onOpenChange={setShowBulkAction}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Send Message to Users</DialogTitle>
						<DialogDescription>
							Send a message to {selectedUsers.length} selected users
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="message">Message</Label>
							<Textarea
								id="message"
								placeholder="Enter your message..."
								value={bulkMessage}
								onChange={(e) => setBulkMessage(e.target.value)}
								rows={5}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setShowBulkAction(false);
									setBulkMessage('');
								}}
							>
								Cancel
							</Button>
							<Button onClick={sendBulkMessage} disabled={!bulkMessage.trim()}>
								Send Message
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
