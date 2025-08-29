import { useMutation } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import {
	Calendar,
	Copy,
	Edit,
	Eye,
	FileText,
	Loader2,
	MoreVertical,
	Plus,
	Search,
	Trash2,
} from 'lucide-react';
import React, { useState } from 'react';

import { mutApi } from '@/api/mutations';
import { Layout } from '@/components/layouts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMutations } from '@/hooks/use-mutations';

export const Route = createFileRoute('/mutations/')({
	component: ConfigurationsComponent,
});

export function ConfigurationsComponent() {
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [configToDelete, setConfigToDelete] = useState<string | null>(null);

	const {
		data: configurationsData,
		isLoading,
		error,
	} = useMutations({
		page: currentPage,
		limit: 10,
		search: searchTerm || undefined,
	});

	const cloneConfiguration = useMutation({
		mutationFn: (configId: string) => mutApi.clone(configId),
	});

	const deleteConfiguration = useMutation({
		mutationFn: (configId: string) => mutApi.delete(configId),
	});

	const configurations = configurationsData?.data || [];
	const pagination = configurationsData?.pagination;

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
	};

	const handleClone = async (configId: string) => {
		try {
			await cloneConfiguration.mutateAsync(configId);
			setSelectedConfig(null);
		} catch (error) {
			console.error('Failed to clone configuration:', error);
		}
	};

	const handleDelete = async (configId: string) => {
		try {
			await deleteConfiguration.mutateAsync(configId);
			setShowDeleteModal(false);
			setConfigToDelete(null);
		} catch (error) {
			console.error('Failed to delete configuration:', error);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Since search is handled server-side via query params, no need for client-side filtering
	const filteredConfigurations = configurations;

	return (
		<Layout>
			<div className="space-y-8">
				{error && (
					<div className="bg-destructive/10 border-destructive/20 rounded-md border p-4">
						<div className="text-destructive text-sm">
							{error.message || 'An error occurred'}
						</div>
					</div>
				)}

				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1">
						<h1 className="text-foreground text-3xl font-bold">Mutations</h1>
						<p className="text-muted-foreground">
							Manage your file transformations
							{pagination && ` (${pagination.total} total)`}
						</p>
					</div>
					<Link to="/mutations/studio">
						<Button>
							<Plus className="mr-2 h-4 w-4" />
							New Mutation
						</Button>
					</Link>
				</div>

				<Card>
					<CardContent className="pt-6">
						<form onSubmit={handleSearch} className="flex gap-4">
							<div className="flex-1">
								<div className="relative">
									<Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
									<input
										type="text"
										placeholder="Search mutations..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="border-input bg-background file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 pl-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
									/>
								</div>
							</div>
							<Button type="submit" variant="outline">
								Search
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card>
					{isLoading ? (
						<CardContent className="flex items-center justify-center py-8">
							<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
							<span className="text-muted-foreground ml-2">
								Loading mutations...
							</span>
						</CardContent>
					) : filteredConfigurations?.length > 0 ? (
						<CardContent className="p-6">
							<div className="space-y-4">
								{filteredConfigurations.map((config) => (
									<div
										key={config.id}
										className="border-border hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
									>
										<div className="flex flex-1 items-start space-x-4">
											<div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
												<FileText className="text-primary h-4 w-4" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="mb-1 flex items-center space-x-2">
													<h3 className="text-foreground truncate text-base font-medium">
														{config.name}
													</h3>
													<span className="text-muted-foreground text-xs">
														v{config.version}
													</span>
													<Badge
														variant={config.isActive ? 'default' : 'secondary'}
													>
														{config.isActive ? 'Active' : 'Inactive'}
													</Badge>
												</div>
												<p className="text-muted-foreground mb-2 text-sm">
													{config.description || 'No description provided'}
												</p>
												<div className="text-muted-foreground flex items-center space-x-4 text-xs">
													<div className="flex items-center">
														<Calendar className="mr-1 h-3 w-3" />
														Updated {formatDate(config.updatedAt)}
													</div>
													<div className="flex items-center">
														<FileText className="mr-1 h-3 w-3" />
														{config.rules?.length} rules
													</div>
												</div>
											</div>
										</div>

										<div className="flex items-center space-x-2">
											<Link
												to="/mutations/$configId"
												params={{ configId: config.id }}
											>
												<Button variant="outline" size="sm">
													<Eye className="mr-1 h-3 w-3" />
													View
												</Button>
											</Link>
											<Link
												to="/mutations/$configId/edit"
												params={{ configId: config.id }}
											>
												<Button variant="default" size="sm">
													<Edit className="mr-1 h-3 w-3" />
													Edit
												</Button>
											</Link>

											{/* Dropdown Menu */}
											<div className="relative">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														setSelectedConfig(
															selectedConfig === config.id ? null : config.id,
														)
													}
												>
													<MoreVertical className="h-3 w-3" />
												</Button>

												{selectedConfig === config.id && (
													<div className="border-border bg-background absolute right-0 z-10 mt-2 w-48 rounded-md border shadow-lg">
														<div className="py-1">
															<button
																onClick={() => handleClone(config.id)}
																className="text-foreground hover:bg-muted flex w-full items-center px-4 py-2 text-sm"
															>
																<Copy className="mr-3 h-4 w-4" />
																Clone
															</button>
															<button
																onClick={() => {
																	setConfigToDelete(config.id);
																	setShowDeleteModal(true);
																	setSelectedConfig(null);
																}}
																className="text-destructive hover:bg-destructive/10 flex w-full items-center px-4 py-2 text-sm"
															>
																<Trash2 className="mr-3 h-4 w-4" />
																Delete
															</button>
														</div>
													</div>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					) : (
						<CardContent className="py-12 text-center">
							<div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-md">
								<FileText className="text-muted-foreground h-6 w-6" />
							</div>
							<h3 className="text-foreground mt-4 text-sm font-medium">
								{searchTerm ? 'No configurations found' : 'No configurations'}
							</h3>
							<p className="text-muted-foreground mt-2 text-sm">
								{searchTerm
									? 'Try adjusting your search terms'
									: 'Get started by creating your first transformation configuration.'}
							</p>
							{!searchTerm && (
								<div className="mt-4">
									<Link to="/mutations/studio">
										<Button>
											<Plus className="mr-2 h-4 w-4" />
											Create Configuration
										</Button>
									</Link>
								</div>
							)}
						</CardContent>
					)}
				</Card>

				{/* Pagination */}
				{pagination && pagination.totalPages > 1 && (
					<div className="flex items-center justify-between">
						<div className="text-sm text-gray-700">
							Page {pagination.page} of {pagination.totalPages}
						</div>
						<div className="flex space-x-2">
							<button
								onClick={() => setCurrentPage(pagination.page - 1)}
								disabled={pagination.page <= 1}
								className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-50"
							>
								Previous
							</button>
							<button
								onClick={() => setCurrentPage(pagination.page + 1)}
								disabled={pagination.page >= pagination.totalPages}
								className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Delete Confirmation Modal */}
			{showDeleteModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
					<div className="w-full max-w-md rounded-lg bg-white p-6">
						<h3 className="mb-4 text-lg font-medium text-gray-900">
							Delete Configuration
						</h3>
						<p className="mb-6 text-sm text-gray-600">
							Are you sure you want to delete this configuration? This action
							cannot be undone.
						</p>
						<div className="flex justify-end space-x-3">
							<button
								onClick={() => {
									setShowDeleteModal(false);
									setConfigToDelete(null);
								}}
								className="btn btn-outline"
							>
								Cancel
							</button>
							<button
								onClick={() => configToDelete && handleDelete(configToDelete)}
								className="btn bg-red-600 text-white hover:bg-red-700"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Click outside to close dropdown */}
			{selectedConfig && (
				<div
					className="fixed inset-0 z-0"
					onClick={() => setSelectedConfig(null)}
				/>
			)}
		</Layout>
	);
}
