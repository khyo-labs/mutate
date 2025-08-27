import { Link } from '@tanstack/react-router';
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

import { Layout } from '../components/layout';
import {
	useCloneConfiguration,
	useConfigurations,
	useDeleteConfiguration,
} from '../hooks/use-configurations';

export function ConfigurationsPage() {
	const [searchTerm, setSearchTerm] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [configToDelete, setConfigToDelete] = useState<string | null>(null);

	const {
		data: configurationsData,
		isLoading,
		error,
	} = useConfigurations({
		page: currentPage,
		limit: 10,
		search: searchTerm || undefined,
	});

	const deleteConfiguration = useDeleteConfiguration();
	const cloneConfiguration = useCloneConfiguration();

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
			<div className="space-y-6">
				{/* Error Display */}
				{error && (
					<div className="rounded-md bg-red-50 p-4">
						<div className="text-sm text-red-700">
							{error.message || 'An error occurred'}
						</div>
					</div>
				)}

				{/* Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Configurations</h1>
						<p className="text-gray-600">
							Manage your transformation configurations
							{pagination && ` (${pagination.total} total)`}
						</p>
					</div>
					<Link to="/configurations/new" className="btn btn-primary">
						<Plus className="mr-2 h-4 w-4" />
						New Configuration
					</Link>
				</div>

				{/* Search */}
				<div className="card">
					<form onSubmit={handleSearch} className="flex gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
								<input
									type="text"
									placeholder="Search configurations..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="input pl-10"
								/>
							</div>
						</div>
						<button type="submit" className="btn btn-outline">
							Search
						</button>
					</form>
				</div>

				{/* Configurations List */}
				<div className="card">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
							<span className="ml-2 text-gray-600">
								Loading configurations...
							</span>
						</div>
					) : filteredConfigurations?.length > 0 ? (
						<div className="space-y-4">
							{filteredConfigurations.map((config) => (
								<div
									key={config.id}
									className="flex items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
								>
									<div className="flex flex-1 items-start space-x-4">
										<div className="bg-primary-100 rounded-lg p-2">
											<FileText className="text-primary-600 h-5 w-5" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center space-x-2">
												<h3 className="truncate text-lg font-medium text-gray-900">
													{config.name}
												</h3>
												<span className="text-sm text-gray-500">
													v{config.version}
												</span>
												<span
													className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
														config.isActive
															? 'bg-green-100 text-green-800'
															: 'bg-gray-100 text-gray-800'
													}`}
												>
													{config.isActive ? 'Active' : 'Inactive'}
												</span>
											</div>
											<p className="mb-2 text-sm text-gray-600">
												{config.description || 'No description provided'}
											</p>
											<div className="flex items-center space-x-4 text-xs text-gray-500">
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
											to="/configurations/$configId"
											params={{ configId: config.id }}
											className="btn btn-outline px-3 py-1 text-sm"
										>
											<Eye className="mr-1 h-3 w-3" />
											View
										</Link>
										<Link
											to="/configurations/$configId/builder"
											params={{ configId: config.id }}
											className="btn btn-secondary px-3 py-1 text-sm"
										>
											<Edit className="mr-1 h-3 w-3" />
											Edit
										</Link>

										{/* Dropdown Menu */}
										<div className="relative">
											<button
												onClick={() =>
													setSelectedConfig(
														selectedConfig === config.id ? null : config.id,
													)
												}
												className="btn btn-outline p-2 text-sm"
											>
												<MoreVertical className="h-3 w-3" />
											</button>

											{selectedConfig === config.id && (
												<div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg">
													<div className="py-1">
														<button
															onClick={() => handleClone(config.id)}
															className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
															className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
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
					) : (
						<div className="py-12 text-center">
							<FileText className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-medium text-gray-900">
								{searchTerm ? 'No configurations found' : 'No configurations'}
							</h3>
							<p className="mt-1 text-sm text-gray-500">
								{searchTerm
									? 'Try adjusting your search terms'
									: 'Get started by creating your first transformation configuration.'}
							</p>
							{!searchTerm && (
								<div className="mt-6">
									<Link to="/configurations/new" className="btn btn-primary">
										<Plus className="mr-2 h-4 w-4" />
										Create Configuration
									</Link>
								</div>
							)}
						</div>
					)}
				</div>

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
