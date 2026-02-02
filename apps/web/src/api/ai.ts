import { useWorkspaceStore } from '@/stores/workspace-store';
import type { SuccessResponse, TransformationRule } from '@/types';

import { api } from './client';

export const aiApi = {
	generateRules: async (
		inputXlsx: File,
		outputCsv: File,
		hint?: string,
	): Promise<TransformationRule[]> => {
		const workspace = useWorkspaceStore.getState().activeWorkspace;
		if (!workspace) {
			throw new Error('No active workspace selected');
		}

		const formData = new FormData();
		formData.append('inputXlsx', inputXlsx);
		formData.append('outputCsv', outputCsv);
		if (hint?.trim()) {
			formData.append('hint', hint.trim());
		}

		const response = await api.postForm<SuccessResponse<{ rules: TransformationRule[] }>>(
			`/v1/workspace/${workspace.id}/ai/generate-rules`,
			formData,
		);

		return response.data.rules;
	},
};
