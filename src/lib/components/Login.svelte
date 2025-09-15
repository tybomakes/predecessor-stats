<script lang="ts">
	import { auth } from '$lib/stores/auth';

	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let authState = $state($auth);

	function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		setTimeout(() => {
			const success = auth.login(password);
			if (!success) {
				error = 'Invalid password';
				password = '';

				if (authState.attemptCount >= 3) {
					error = 'Too many failed attempts. Please refresh the page.';
				}
			}
			loading = false;
		}, 500); // Small delay to prevent brute force
	}
</script>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h1 class="text-4xl font-bold mb-2 bg-gradient-to-r from-predecessor-orange to-amber-500 bg-clip-text text-transparent">
				Predecessor Stats
			</h1>
			<p class="text-gray-400">Enter password to access the tracker</p>
		</div>

		<form onsubmit={handleSubmit} class="mt-8 space-y-6">
			<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
				<div class="space-y-4">
					<div>
						<label for="password" class="block text-sm font-medium text-gray-300 mb-2">
							Access Password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							disabled={loading || authState.attemptCount >= 3}
							required
							class="w-full px-4 py-3 bg-predecessor-dark border border-predecessor-border rounded-lg focus:outline-none focus:border-predecessor-orange transition-colors text-white placeholder-gray-500"
							placeholder="Enter password"
						/>
					</div>

					{#if error}
						<div class="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
							<p class="text-red-400 text-sm">{error}</p>
						</div>
					{/if}

					<button
						type="submit"
						disabled={loading || authState.attemptCount >= 3}
						class="w-full bg-gradient-to-r from-predecessor-orange to-amber-600 text-black font-semibold py-3 rounded-lg hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if loading}
							<span class="inline-block animate-spin">⚡</span> Authenticating...
						{:else}
							Access Tracker
						{/if}
					</button>
				</div>

				<div class="mt-4 text-center">
					<p class="text-xs text-gray-500">
						Protected access for authorized users only
					</p>
				</div>
			</div>
		</form>
	</div>
</div>