<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { TrackedUser } from '$lib/config/users';
	import { omedaAPI } from '$lib/api/omeda';
	import type { Player } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';

	interface Props {
		user: TrackedUser;
	}

	let { user }: Props = $props();
	let playerData = $state<Player | null>(null);
	let playerStats = $state<any>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Helper to get rank color
	function getRankColor(rankTitle: string | undefined) {
		if (!rankTitle) return 'from-gray-600 to-gray-700';
		const rank = rankTitle.toLowerCase();
		if (rank.includes('bronze')) return 'from-amber-700 to-amber-900';
		if (rank.includes('silver')) return 'from-gray-400 to-gray-600';
		if (rank.includes('gold')) return 'from-yellow-500 to-yellow-700';
		if (rank.includes('platinum')) return 'from-cyan-400 to-cyan-600';
		if (rank.includes('diamond')) return 'from-blue-400 to-purple-500';
		if (rank.includes('paragon')) return 'from-purple-500 to-pink-500';
		return 'from-gray-600 to-gray-700';
	}

	onMount(async () => {
		try {
			loading = true;
			error = null;
			console.log('Fetching data for player:', user.id);

			// Fetch both player info and statistics
			const [player, stats] = await Promise.all([
				omedaAPI.getPlayer(user.id),
				omedaAPI.getPlayerStatistics(user.id)
			]);

			console.log('Player data received:', player);
			console.log('Player stats received:', stats);

			playerData = player;
			playerStats = stats;
		} catch (e) {
			console.error('Failed to load player data:', e);
			error = 'Failed to load data';
		} finally {
			loading = false;
		}
	});
</script>

<a
	href="{base}/player/{user.id}"
	class="block bg-predecessor-card border border-predecessor-border rounded-lg p-4 hover:border-predecessor-orange/50 transition-all hover:shadow-lg hover:shadow-predecessor-orange/10 group"
>
	<div class="flex flex-col items-center text-center">
		<!-- Rank Badge with Image -->
		<div class="relative mb-3">
			{#if loading}
				<div class="w-24 h-24 rounded-full bg-predecessor-dark animate-pulse flex items-center justify-center">
					<span class="text-gray-400">⚡</span>
				</div>
			{:else if playerData?.rank_image}
				<div class="relative">
					<img
						src={getImageUrl(playerData.rank_image)}
						alt={playerData.rank_title || 'Rank'}
						class="w-24 h-24 object-contain group-hover:scale-110 transition-transform"
					/>
					<!-- VP Display in center -->
					<div class="absolute inset-0 flex flex-col items-center justify-center">
						<span class="text-2xl font-bold text-white drop-shadow-lg">
							{playerData?.vp_total || 0}
						</span>
						<span class="text-xs text-white/80 drop-shadow">VP</span>
					</div>
				</div>
			{:else}
				<!-- Fallback gradient circle -->
				<div class="w-24 h-24 rounded-full bg-gradient-to-br {getRankColor(playerData?.rank_title)} flex flex-col items-center justify-center">
					<span class="text-2xl font-bold text-white">
						{playerData?.vp_total || 0}
					</span>
					<span class="text-xs text-white/80">VP</span>
				</div>
			{/if}
		</div>

		<!-- Player Name -->
		<h3 class="text-lg font-bold mb-1">
			{playerData?.display_name || user.displayName}
		</h3>

		<!-- Rank Info -->
		<div class="text-sm text-gray-400">
			{#if playerData?.rank_title}
				<p class="text-predecessor-orange font-semibold">{playerData.rank_title}</p>
			{/if}
			{#if playerData?.leaderboard_rank}
				<p>Rank #{playerData.leaderboard_rank}</p>
			{/if}
			{#if playerData?.top_percentage}
				<p>Top {playerData.top_percentage}%</p>
			{/if}
		</div>

		{#if error}
			<p class="text-xs text-red-400 mt-2">Failed to load</p>
		{/if}
	</div>
</a>