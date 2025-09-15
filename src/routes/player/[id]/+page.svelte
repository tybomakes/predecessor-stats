<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { omedaAPI, type Player, type Match } from '$lib/api/omeda';
	import { cache, cacheKeys } from '$lib/api/cache';
	import { CACHE_DURATION } from '$lib/config/api';

	let playerId = $page.params.id;
	let player = $state<Player | null>(null);
	let matches = $state<Match[]>([]);
	let loading = $state(true);
	let error = $state('');
	let refreshing = $state(false);

	async function loadPlayerData(useCache = true) {
		try {
			loading = true;
			error = '';

			// Try cache first
			if (useCache) {
				const cachedPlayer = cache.get<Player>(cacheKeys.player(playerId));
				if (cachedPlayer) {
					player = cachedPlayer;
				}

				const cachedMatches = cache.get<{ matches: Match[] }>(cacheKeys.playerMatches(playerId));
				if (cachedMatches) {
					matches = cachedMatches.matches;
				}
			}

			// If no cache or force refresh, fetch from API
			if (!player || !useCache) {
				const [playerData, matchData] = await Promise.all([
					omedaAPI.getPlayer(playerId),
					omedaAPI.getPlayerMatches(playerId, { per_page: 20 })
				]);

				player = playerData;
				matches = matchData.matches || [];

				// Cache the data
				cache.set(cacheKeys.player(playerId), playerData, CACHE_DURATION);
				cache.set(cacheKeys.playerMatches(playerId), matchData, CACHE_DURATION);
			}
		} catch (err) {
			error = 'Failed to load player data';
			console.error(err);
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function refreshData() {
		refreshing = true;
		await loadPlayerData(false);
	}

	onMount(() => {
		loadPlayerData();
	});

	// Calculate KDA
	$: kda = player ? ((player.wins || 0) / Math.max(1, player.losses || 1)).toFixed(2) : '-';
</script>

<svelte:head>
	<title>{player?.name || 'Loading...'} - Predecessor Stats</title>
</svelte:head>

<div class="space-y-8">
	{#if loading && !player}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin text-4xl mb-4">⚡</div>
				<p class="text-gray-400">Loading player data...</p>
			</div>
		</div>
	{:else if error}
		<div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
			<p class="text-red-400">{error}</p>
			<button
				onclick={() => loadPlayerData()}
				class="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if player}
		<!-- Player Header -->
		<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
			<div class="flex items-start justify-between">
				<div>
					<h1 class="text-3xl font-bold mb-2">{player.name}</h1>
					<div class="flex items-center space-x-4 text-sm text-gray-400">
						<span class="text-predecessor-orange font-semibold">{player.rank_title || 'Unranked'}</span>
						<span>Rank #{player.rank || '-'}</span>
						<span>MMR: {player.mmr || '-'}</span>
					</div>
				</div>

				<button
					onclick={refreshData}
					disabled={refreshing}
					class="px-4 py-2 bg-predecessor-dark hover:bg-predecessor-border rounded-lg transition-colors disabled:opacity-50"
				>
					{#if refreshing}
						<span class="animate-spin inline-block">⚡</span> Refreshing...
					{:else}
						🔄 Refresh
					{/if}
				</button>
			</div>

			<!-- Stats Grid -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Games</p>
					<p class="text-2xl font-bold">{player.games_played || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Wins</p>
					<p class="text-2xl font-bold text-green-500">{player.wins || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Losses</p>
					<p class="text-2xl font-bold text-red-500">{player.losses || 0}</p>
				</div>
				<div class="bg-predecessor-dark rounded-lg p-4">
					<p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Win Rate</p>
					<p class="text-2xl font-bold text-predecessor-orange">{player.winrate ? `${player.winrate}%` : '-'}</p>
				</div>
			</div>
		</div>

		<!-- Match History -->
		<div class="bg-predecessor-card border border-predecessor-border rounded-lg p-6">
			<h2 class="text-xl font-bold mb-4">Recent Matches</h2>

			{#if matches.length > 0}
				<div class="space-y-2">
					{#each matches as match}
						<div class="bg-predecessor-dark rounded-lg p-4 hover:bg-predecessor-border/50 transition-colors">
							<div class="flex items-center justify-between">
								<div class="flex items-center space-x-4">
									<div class="w-2 h-12 rounded-full" class:bg-green-500={match.winning_team} class:bg-red-500={!match.winning_team}></div>
									<div>
										<p class="font-semibold">{match.game_mode}</p>
										<p class="text-sm text-gray-400">Duration: {Math.floor(match.game_duration / 60)}m</p>
									</div>
								</div>
								<div class="text-right text-sm text-gray-400">
									<p>{new Date(match.ended_at).toLocaleDateString()}</p>
									<p>{new Date(match.ended_at).toLocaleTimeString()}</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-gray-400 text-center py-8">No recent matches found</p>
			{/if}
		</div>
	{/if}
</div>