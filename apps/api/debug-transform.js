import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';

// Simple script to debug Excel file processing
console.log('Debug: Excel File Analysis');

// You can replace this with the actual file path if you have it locally
// For now, let's create a simple example
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet([
	{ Name: 'John', Age: 30, City: 'New York' },
	{ Name: 'Jane', Age: 25, City: 'Chicago' },
]);

XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

console.log('Available worksheets:', workbook.SheetNames);
console.log('First worksheet content:');
console.log(XLSX.utils.sheet_to_csv(worksheet));
