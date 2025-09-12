import { describe, expect, it } from 'vitest';

import { generateId } from './id.js';

describe('generateId', () => {
	it('generates a lowercase 26-character id', () => {
		const id = generateId();
		expect(id).toHaveLength(26);
		expect(id).toBe(id.toLowerCase());
	});

	it('generates unique ids', () => {
		const id1 = generateId();
		const id2 = generateId();
		expect(id1).not.toBe(id2);
	});
});
