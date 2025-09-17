import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Log environment variables during build (for debugging)
if (process.env.NODE_ENV === 'production' || process.env.CI) {
	console.log('=== Build Environment Variables ===');
	console.log('PUBLIC_SUPABASE_URL:', process.env.PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
	console.log('PUBLIC_SUPABASE_ANON_KEY:', process.env.PUBLIC_SUPABASE_ANON_KEY ? `Set (${process.env.PUBLIC_SUPABASE_ANON_KEY?.length} chars)` : 'Not set');
	console.log('===================================');
}

export default defineConfig({
	plugins: [sveltekit()]
});