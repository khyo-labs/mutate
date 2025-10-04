import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	dts: false,
	sourcemap: false,
	clean: true,
	outDir: 'dist',
	splitting: false,
	treeshake: true,
	minify: false,
	target: 'node22',
	tsconfig: './tsconfig.json',
	onSuccess: 'cp -r src/db/migrations dist/db/',
});
