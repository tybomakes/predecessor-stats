<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { testSupabaseConnection } from '$lib/supabase';
	import { createClient } from '@supabase/supabase-js';

	let url = '';
	let keyInfo = '';
	let connectionTest = 'Not tested';
	let detailedError = '';
	let rawConnectionTest = 'Not tested';

	onMount(async () => {
		url = PUBLIC_SUPABASE_URL || 'NOT SET';

		if (PUBLIC_SUPABASE_ANON_KEY) {
			const key = PUBLIC_SUPABASE_ANON_KEY;
			keyInfo = `Length: ${key.length}, First 20 chars: ${key.substring(0, 20)}..., Last 20 chars: ...${key.substring(key.length - 20)}`;

			// Check for common issues
			if (key.includes(' ')) {
				keyInfo += ' | WARNING: Contains spaces';
			}
			if (key.includes('\n')) {
				keyInfo += ' | WARNING: Contains newlines';
			}
			if (key.startsWith("'") || key.startsWith('"')) {
				keyInfo += ' | WARNING: Starts with quotes';
			}
			if (key.endsWith("'") || key.endsWith('"')) {
				keyInfo += ' | WARNING: Ends with quotes';
			}
		} else {
			keyInfo = 'NOT SET';
		}

		// Test connection using the main function
		const connected = await testSupabaseConnection();
		connectionTest = connected ? '✅ Connected' : '❌ Failed';

		// Also test with a fresh client to get more detailed error info
		if (PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY) {
			try {
				const testClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
				const { data, error } = await testClient
					.from('tracked_players')
					.select('count')
					.limit(1);

				if (error) {
					rawConnectionTest = '❌ Failed';
					detailedError = `Error: ${error.message || 'Unknown error'}\nCode: ${error.code || 'N/A'}\nDetails: ${JSON.stringify(error.details) || 'N/A'}\nHint: ${error.hint || 'N/A'}`;
				} else {
					rawConnectionTest = '✅ Connected';
					detailedError = '';
				}
			} catch (err) {
				rawConnectionTest = '❌ Exception';
				detailedError = `Exception: ${err}`;
			}
		} else {
			rawConnectionTest = '⚠️ Missing credentials';
		}
	});
</script>

<div class="max-w-4xl mx-auto p-8">
	<h1 class="text-2xl font-bold mb-6">Supabase Configuration Test</h1>

	<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6 space-y-4">
		<div>
			<h3 class="font-semibold text-predecessor-orange">URL:</h3>
			<p class="font-mono text-sm break-all">{url}</p>
		</div>

		<div>
			<h3 class="font-semibold text-predecessor-orange">API Key Info:</h3>
			<p class="font-mono text-sm break-all">{keyInfo}</p>
		</div>

		<div>
			<h3 class="font-semibold text-predecessor-orange">Connection Test (via lib/supabase.ts):</h3>
			<p class="text-lg">{connectionTest}</p>
		</div>

		<div>
			<h3 class="font-semibold text-predecessor-orange">Direct Connection Test:</h3>
			<p class="text-lg">{rawConnectionTest}</p>
			{#if detailedError}
				<pre class="mt-2 p-2 bg-red-900/20 text-red-400 text-xs rounded overflow-x-auto">{detailedError}</pre>
			{/if}
		</div>

		<div class="mt-6 p-4 bg-predecessor-dark rounded">
			<h3 class="font-semibold mb-2">Expected Values:</h3>
			<ul class="text-sm space-y-1">
				<li>URL should be: <code class="text-predecessor-orange">https://xnvbiudldergtkcgakme.supabase.co</code></li>
				<li>Key length should be: <code class="text-predecessor-orange">251 characters</code></li>
				<li>Key should start with: <code class="text-predecessor-orange">eyJhbGciOiJIUzI1NiIs</code></li>
				<li>Key should end with: <code class="text-predecessor-orange">x2hTGEcaOWM</code></li>
			</ul>
		</div>
	</div>
</div>