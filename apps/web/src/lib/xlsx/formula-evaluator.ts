import * as XLSX from 'xlsx';

/**
 * Evaluates SUBTOTAL function
 * @param func - Function number (1=AVERAGE, 7=STDEV.S, 9=SUM)
 * @param range - Range string like "AK20:AK23"
 * @param worksheet - The worksheet to evaluate in
 */
function evaluateSubtotal(func: number, range: string, worksheet: XLSX.WorkSheet): number | null {
	// Parse the range
	const rangeObj = XLSX.utils.decode_range(range);
	const values: number[] = [];

	// Collect values from the range
	for (let row = rangeObj.s.r; row <= rangeObj.e.r; row++) {
		for (let col = rangeObj.s.c; col <= rangeObj.e.c; col++) {
			const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
			const cell = worksheet[cellAddr];

			if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
				const num = Number(cell.v);
				if (!isNaN(num)) {
					values.push(num);
				}
			}
		}
	}

	if (values.length === 0) return 0;

	switch (func) {
		case 1: // AVERAGE
		case 101: // AVERAGE (ignoring hidden)
			return values.reduce((a, b) => a + b, 0) / values.length;

		case 3: // COUNTA (count non-empty cells)
		case 103: {
			// COUNTA (ignoring hidden)
			// For COUNTA, we need to count all non-empty cells, not just numeric ones
			let count = 0;
			for (let row = rangeObj.s.r; row <= rangeObj.e.r; row++) {
				for (let col = rangeObj.s.c; col <= rangeObj.e.c; col++) {
					const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
					const cell = worksheet[cellAddr];
					if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
						count++;
					}
				}
			}
			return count;
		}
		case 7: // STDEV.S
		case 107: {
			// STDEV.S (ignoring hidden)
			if (values.length < 2) return 0;
			const avg = values.reduce((a, b) => a + b, 0) / values.length;
			const variance =
				values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / (values.length - 1);
			return Math.sqrt(variance);
		}

		case 9: // SUM
		case 109: // SUM (ignoring hidden)
			return values.reduce((a, b) => a + b, 0);

		default:
			return null;
	}
}

/**
 * Simple formula evaluator for basic Excel formulas
 * Currently supports:
 * - SUBTOTAL function
 * - IF(ISERROR(...), defaultValue, expression)
 * - Basic arithmetic operations
 */
export function evaluateFormula(
	formula: string,
	worksheet: XLSX.WorkSheet,
	cellFormat?: string,
): number | string | null {
	if (!formula) return null;

	// Handle SUBTOTAL division pattern first (e.g., SUBTOTAL(9,range1)/SUBTOTAL(9,range2))
	const subtotalDivisionMatch = formula.match(
		/SUBTOTAL\((\d+),([A-Z]+\d+:[A-Z]+\d+)\)\/SUBTOTAL\((\d+),([A-Z]+\d+:[A-Z]+\d+)\)/,
	);
	if (subtotalDivisionMatch) {
		const func1 = parseInt(subtotalDivisionMatch[1]);
		const range1 = subtotalDivisionMatch[2];
		const func2 = parseInt(subtotalDivisionMatch[3]);
		const range2 = subtotalDivisionMatch[4];

		const val1 = evaluateSubtotal(func1, range1, worksheet);
		const val2 = evaluateSubtotal(func2, range2, worksheet);

		if (val2 === null || val2 === 0) return 0;
		if (val1 === null) return 0;

		return val1 / val2;
	}

	// Handle single SUBTOTAL function
	const subtotalMatch = formula.match(/SUBTOTAL\((\d+),([A-Z]+\d+:[A-Z]+\d+)\)/);
	if (subtotalMatch) {
		const func = parseInt(subtotalMatch[1]);
		const range = subtotalMatch[2];
		return evaluateSubtotal(func, range, worksheet);
	}

	// Handle IF(ISERROR(expression), defaultValue, expression) pattern
	const ifIsErrorMatch = formula.match(/IF\(ISERROR\((.*?)\),\s*(.*?),\s*(.*?)\)$/);
	if (ifIsErrorMatch) {
		const expression = ifIsErrorMatch[3];
		const defaultValue = ifIsErrorMatch[2];

		// Try to evaluate the expression
		const result = evaluateFormula(expression, worksheet, cellFormat);

		// Return default value if result is null/undefined/NaN/Infinity
		if (
			result === null ||
			result === undefined ||
			(typeof result === 'number' && (isNaN(result) || !isFinite(result)))
		) {
			// Parse the default value
			if (defaultValue === '0') return 0;
			if (defaultValue === 'n/a' || defaultValue === '"n/a"') return 'n/a';
			return defaultValue;
		}

		return result;
	}

	// Handle cell references with arithmetic operations (e.g., "AK9/AK10")
	const divisionMatch = formula.match(/^([A-Z]+\d+)\/([A-Z]+\d+)$/);
	if (divisionMatch) {
		const cell1Addr = divisionMatch[1];
		const cell2Addr = divisionMatch[2];

		const cell1 = worksheet[cell1Addr];
		const cell2 = worksheet[cell2Addr];

		let val1 = cell1?.v;
		let val2 = cell2?.v;

		// If cells have formulas, evaluate them first
		if (cell1?.f) {
			val1 = evaluateFormula(cell1.f, worksheet, cell1.z);
		}
		if (cell2?.f) {
			val2 = evaluateFormula(cell2.f, worksheet, cell2.z);
		}

		const num1 = Number(val1);
		const num2 = Number(val2);

		if (num2 === 0) return null; // Division by zero
		if (isNaN(num1) || isNaN(num2)) return null;

		return num1 / num2;
	}

	// Handle SUM function with division
	const sumDivisionMatch = formula.match(
		/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)\/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)/,
	);
	if (sumDivisionMatch) {
		const range1 = sumDivisionMatch[1];
		const range2 = sumDivisionMatch[2];

		const sum1 = evaluateSubtotal(9, range1, worksheet); // Use SUM function
		const sum2 = evaluateSubtotal(9, range2, worksheet);

		if (sum2 === null || sum2 === 0) return 0;
		if (sum1 === null) return 0;

		return sum1 / sum2;
	}

	// Handle STDEV function
	const stdevMatch = formula.match(/STDEV\(([A-Z]+\d+:[A-Z]+\d+)\)/);
	if (stdevMatch) {
		const range = stdevMatch[1];
		return evaluateSubtotal(7, range, worksheet); // STDEV.S
	}

	// Handle AVERAGE function
	const avgMatch = formula.match(/AVERAGE\(([A-Z]+\d+:[A-Z]+\d+)\)/);
	if (avgMatch) {
		const range = avgMatch[1];
		return evaluateSubtotal(1, range, worksheet); // AVERAGE
	}

	// Handle SUM function
	const sumMatch = formula.match(/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)/);
	if (sumMatch) {
		const range = sumMatch[1];
		return evaluateSubtotal(9, range, worksheet); // SUM
	}

	// Handle COUNT function
	const countMatch = formula.match(/COUNT\(([A-Z]+\d+:[A-Z]+\d+)\)/);
	if (countMatch) {
		const range = countMatch[1];
		const rangeObj = XLSX.utils.decode_range(range);
		let count = 0;

		for (let row = rangeObj.s.r; row <= rangeObj.e.r; row++) {
			for (let col = rangeObj.s.c; col <= rangeObj.e.c; col++) {
				const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
				const cell = worksheet[cellAddr];
				if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
					count++;
				}
			}
		}

		return count;
	}

	// If we can't evaluate the formula, return null
	return null;
}
