<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { adminStore } from '$lib/stores/admin';
	import { supabaseTrackedUsers } from '$lib/stores/supabaseTrackedUsers';
	import { omedaAPI } from '$lib/api/omeda';
	import type { TrackedPlayer } from '$lib/supabase';
	import type { Player } from '$lib/api/omeda';

	let isAuthenticated = $state(false);
	let password = $state('');
	let loginError = $state('');

	// Admin panel states
	let users = $state<TrackedPlayer[]>([]);
	let newPlayerId = $state('');
	let searchingPlayer = $state(false);
	let searchError = $state('');
	let foundPlayer = $state<Player | null>(null);

	// Subscribe to stores
	$effect(() => {
		const unsubscribeAuth = adminStore.subscribe(value => {
			isAuthenticated = value.isAuthenticated;
		});

		const unsubscribeUsers = supabaseTrackedUsers.subscribe(value => {
			users = value;
		});

		return () => {
			unsubscribeAuth();
			unsubscribeUsers();
		};
	});

	onMount(() => {
		// Check if already authenticated
		adminStore.checkAuth();
		// Initialize Supabase store
		supabaseTrackedUsers.init();
	});

	function handleLogin() {
		loginError = '';
		if (!password) {
			loginError = 'Please enter a password';
			return;
		}

		const success = adminStore.login(password);
		if (!success) {
			loginError = 'Invalid password';
			password = '';
		} else {
			// Force re-check authentication state
			isAuthenticated = true;
		}
	}

	function handleLogout() {
		adminStore.logout();
		goto('/');
	}

	async function searchPlayer() {
		if (!newPlayerId.trim()) {
			searchError = 'Please enter a player ID';
			return;
		}

		searchingPlayer = true;
		searchError = '';
		foundPlayer = null;

		try {
			const player = await omedaAPI.getPlayer(newPlayerId.trim());
			foundPlayer = player;
		} catch (error) {
			searchError = 'Player not found or invalid ID';
			console.error('Failed to find player:', error);
		} finally {
			searchingPlayer = false;
		}
	}

	async function addPlayer() {
		if (!foundPlayer) return;

		await supabaseTrackedUsers.addUser(
			foundPlayer.display_name || foundPlayer.name || 'Unknown',
			foundPlayer.id,
			'na'
		);

		// Reset form
		newPlayerId = '';
		foundPlayer = null;
		searchError = '';
	}

	async function removePlayer(userId: string) {
		if (confirm('Are you sure you want to remove this player?')) {
			await supabaseTrackedUsers.removeUser(userId);
		}
	}
</script>

<svelte:head>
	<title>Admin - Predecessor Stats</title>
</svelte:head>

<div class="min-h-screen py-12">
	<div class="max-w-6xl mx-auto px-4">
		{#if !isAuthenticated}
			<!-- Login Form -->
			<div class="max-w-md mx-auto">
				<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-8">
					<h1 class="text-2xl font-bold mb-6 text-center">Admin Login</h1>

					<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
						<div class="space-y-4">
							<div>
								<label for="password" class="block text-sm font-medium mb-2">
									Password
								</label>
								<input
									type="password"
									id="password"
									bind:value={password}
									placeholder="Enter admin password"
									class="w-full px-4 py-2 bg-predecessor-dark border border-predecessor-border rounded-lg focus:border-predecessor-orange focus:outline-none"
								/>
							</div>

							{#if loginError}
								<p class="text-red-500 text-sm">{loginError}</p>
							{/if}

							<button
								type="submit"
								class="w-full py-2 bg-predecessor-orange hover:bg-predecessor-orange/80 rounded-lg font-semibold transition-colors"
							>
								Login
							</button>
						</div>
					</form>
				</div>
			</div>
		{:else}
			<!-- Admin Dashboard -->
			<div class="space-y-8">
				<!-- Header -->
				<div class="flex justify-between items-center">
					<h1 class="text-3xl font-bold">Admin Dashboard</h1>
					<button
						onclick={handleLogout}
						class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
					>
						Logout
					</button>
				</div>

				<!-- Add Player Section -->
				<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
					<h2 class="text-xl font-bold mb-4">Add New Player</h2>

					<div class="space-y-4">
						<div class="flex gap-4">
							<input
								type="text"
								bind:value={newPlayerId}
								placeholder="Enter player ID (UUID format)"
								class="flex-1 px-4 py-2 bg-predecessor-dark border border-predecessor-border rounded-lg focus:border-predecessor-orange focus:outline-none"
								disabled={searchingPlayer}
							/>
							<button
								onclick={searchPlayer}
								disabled={searchingPlayer || !newPlayerId.trim()}
								class="px-6 py-2 bg-predecessor-orange hover:bg-predecessor-orange/80 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{searchingPlayer ? 'Searching...' : 'Search'}
							</button>
						</div>

						{#if searchError}
							<p class="text-red-500">{searchError}</p>
						{/if}

						{#if foundPlayer}
							<div class="bg-predecessor-dark rounded-lg p-4">
								<div class="flex items-center justify-between">
									<div>
										<h3 class="font-bold text-lg">{foundPlayer.display_name || foundPlayer.name}</h3>
										<p class="text-sm text-gray-400">
											{foundPlayer.rank_title || 'Unranked'} - Rank #{foundPlayer.leaderboard_rank || 'N/A'}
										</p>
										<p class="text-sm text-gray-400">VP: {foundPlayer.vp_total || 0}</p>
									</div>
									<button
										onclick={addPlayer}
										class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
									>
										Add Player
									</button>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Current Players Section -->
				<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
					<h2 class="text-xl font-bold mb-4">Current Players ({users.length})</h2>

					{#if users.length === 0}
						<p class="text-gray-400">No players tracked yet.</p>
					{:else}
						<div class="space-y-2">
							{#each users as user}
								<div class="flex items-center justify-between bg-predecessor-dark rounded-lg p-4">
									<div>
										<h3 class="font-bold">{user.display_name}</h3>
										<p class="text-sm text-gray-400">ID: {user.player_id}</p>
									</div>
									<button
										onclick={() => removePlayer(user.player_id)}
										class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
									>
										Remove
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Instructions -->
				<div class="bg-predecessor-dark rounded-lg p-6">
					<h3 class="font-bold mb-2">How to find Player IDs:</h3>
					<ol class="list-decimal list-inside space-y-1 text-sm text-gray-400">
						<li>Go to omeda.city</li>
						<li>Search for the player by name</li>
						<li>Click on their profile</li>
						<li>Copy the UUID from the URL (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)</li>
					</ol>
				</div>
			</div>
		{/if}
	</div>
</div>