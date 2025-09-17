<script lang="ts">
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { TrackedUser } from '$lib/config/users';
	import { omedaAPI } from '$lib/api/omeda';
	import type { Player } from '$lib/api/omeda';

	interface Props {
		user: TrackedUser;
	}

	let { user }: Props = $props();
	let playerData = $state<Player | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			loading = true;
			error = null;
			playerData = await omedaAPI.getPlayer(user.id);
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
	class="block bg-predecessor-card border border-predecessor-border rounded-lg p-6 hover:border-predecessor-orange/50 transition-all hover:shadow-lg hover:shadow-predecessor-orange/10"
>
	<div class="flex items-center justify-between mb-4">
		<div class="w-12 h-12 bg-gradient-to-br from-predecessor-orange to-amber-600 rounded-full flex items-center justify-center">
			<span class="text-xl font-bold text-white">{user.displayName.charAt(0)}</span>
		</div>
		<div class="text-right">
			<span class="text-xs text-gray-500 uppercase tracking-wide">Rank</span>
			{#if loading}
				<p class="text-lg font-semibold">Loading...</p>
			{:else if error}
				<p class="text-lg font-semibold text-red-500">Error</p>
			{:else if playerData}
				<p class="text-lg font-semibold">{playerData.rank_title || 'Unranked'}</p>
			{:else}
				<p class="text-lg font-semibold">-</p>
			{/if}
		</div>
	</div>

	<h3 class="text-xl font-bold mb-1">{user.displayName}</h3>
	<p class="text-gray-400 text-sm mb-4">{user.name}</p>

	<div class="grid grid-cols-3 gap-2 text-center">
		<div>
			<p class="text-2xl font-bold text-predecessor-orange">
				{playerData?.games_played || '-'}
			</p>
			<p class="text-xs text-gray-500">Games</p>
		</div>
		<div>
			<p class="text-2xl font-bold text-green-500">
				{playerData ? `${Math.round(playerData.winrate)}%` : '-'}
			</p>
			<p class="text-xs text-gray-500">Win %</p>
		</div>
		<div>
			<p class="text-2xl font-bold text-blue-500">
				{playerData?.mmr || '-'}
			</p>
			<p class="text-xs text-gray-500">MMR</p>
		</div>
	</div>
</a>