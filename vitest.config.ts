import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		deps: {
			optimizer: {
				// Prebundle Lucide's icon barrel and share one Svelte SSR context with renders.
				ssr: {
					enabled: true,
					include: ['@lucide/svelte', 'svelte', 'svelte/server', 'svelte/internal/server']
				}
			}
		}
	}
});
