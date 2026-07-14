import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
	plugins: [
		react(),
		electron({
			main: {
				entry: 'electron/main/index.ts',
				vite: {
					build: {
						outDir: 'dist-electron',
						rollupOptions: {
							external: ['electron', 'sql.js', 'better-sqlite3'],
						},
					},
				},
			},
			preload: {
				input: path.join(__dirname, 'electron/preload/index.ts'),
				vite: {
					build: {
						outDir: 'dist-electron/preload',
						rollupOptions: {
							external: ['electron'],
							output: {
								entryFileNames: 'index.js',
							},
						},
					},
				},
			},
			renderer: {},
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@shared': path.resolve(__dirname, '../../packages/shared-types/src'),
		},
	},
	server: {
		port: 3000,
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
});
