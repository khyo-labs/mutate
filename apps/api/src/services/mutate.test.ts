import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { MutationService } from './mutate.js';

// Note: Using `as any` for configuration to minimize required fields
const baseConfig: any = {
	name: 'Test Config',
	outputFormat: {
		type: 'CSV',
		delimiter: ',',
		encoding: 'UTF-8',
		includeHeaders: true,
	},
};

describe('MutationService', () => {
	it('returns error for unknown rule type', async () => {
		const service = new MutationService();
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet([[1, 2]]);
		XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
		const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
		const configuration = {
			...baseConfig,
			rules: [{ id: '1', type: 'NOT_A_RULE' as any, params: {} }],
		};

		const result = await service.transformFile(buffer, configuration);
		expect(result.success).toBe(false);
		expect(result.error).toContain('Unknown rule type');
	});
});
