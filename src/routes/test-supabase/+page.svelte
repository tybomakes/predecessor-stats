<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { testSupabaseConnection } from '$lib/supabase';

	let url = '';
	let keyInfo = '';
	let connectionTest = 'Not tested';

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
		} else {
			keyInfo = 'NOT SET';
		}

		// Test connection
		const connected = await testSupabaseConnection();
		connectionTest = connected ? '✅ Connected' : '❌ Failed';
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
			<h3 class="font-semibold text-predecessor-orange">Connection Test:</h3>
			<p class="text-lg">{connectionTest}</p>
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