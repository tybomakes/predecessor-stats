// Supabase configuration with multiple fallback methods
// This ensures we can get the environment variables in different build contexts

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

// Try different methods to get the environment variables
try {
	// Method 1: Try to import from $env/static/public (SvelteKit way)
	const env = await import('$env/static/public');
	SUPABASE_URL = env.PUBLIC_SUPABASE_URL || '';
	SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY || '';
} catch (e) {
	// Method 2: Try import.meta.env (Vite way)
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || '';
		SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
	}
}

// Export the configuration
export const supabaseConfig = {
	url: SUPABASE_URL,
	anonKey: SUPABASE_ANON_KEY,
	isConfigured: () => !!(SUPABASE_URL && SUPABASE_ANON_KEY)
};

// Log configuration status (will be removed in production builds)
if (import.meta.env.DEV) {
	console.log('Supabase Config - URL:', supabaseConfig.url);
	console.log('Supabase Config - Key present:', !!supabaseConfig.anonKey);
	console.log('Supabase Config - Is configured:', supabaseConfig.isConfigured());
}