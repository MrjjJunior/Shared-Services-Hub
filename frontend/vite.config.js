import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-node produces a self-contained `build/` server that runs anywhere
			// Node runs (Docker, Compose, Railway). `node build/index.js` serves it and
			// the PORT/ORIGIN environment variables control it in production.
			adapter: adapter()
		})
	]
});
