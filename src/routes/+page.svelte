<script lang="ts">
	import { onMount } from 'svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { supabaseTrackedUsers } from '$lib/stores/supabaseTrackedUsers';
	import { gameData } from '$lib/api/gameData';
	import { omedaAPI } from '$lib/api/omeda';
	import type { TrackedPlayer } from '$lib/supabase';
	import type { Player } from '$lib/api/omeda';

	let users = $state<TrackedPlayer[]>([]);
	let playersData = $state<Map<string, Player>>(new Map());
	let sortedUsers = $state<TrackedPlayer[]>([]);
	let loading = $state(true);

	// Subscribe to tracked users store
	$effect(() => {
		const unsubscribe = supabaseTrackedUsers.subscribe(value => {
			users = value;
			if (value.length > 0) {
				loadPlayersData(value);
			}
		});

		return unsubscribe;
	});

	// Load player data for sorting by rank
	async function loadPlayersData(usersList: TrackedPlayer[]) {
		if (usersList.length === 0) {
			loading = false;
			return;
		}

		loading = true;
		for (const user of usersList) {
			try {
				const playerData = await omedaAPI.getPlayer(user.player_id);
				playersData.set(user.player_id, playerData);
			} catch (error) {
				console.error(`Failed to load data for ${user.player_id}:`, error);
			}
		}
		sortUsersByRank();
		loading = false;
	}

	// Sort users by rank (higher VP first)
	function sortUsersByRank() {
		sortedUsers = [...users].sort((a, b) => {
			const playerA = playersData.get(a.player_id);
			const playerB = playersData.get(b.player_id);

			// Sort by VP total (higher first)
			const vpA = playerA?.vp_total || 0;
			const vpB = playerB?.vp_total || 0;

			return vpB - vpA;
		});
	}

	// Preload game data and load users from storage
	onMount(() => {
		supabaseTrackedUsers.init();
		gameData.preloadAll().catch(console.error);

		// Subscribe to real-time changes if Supabase is configured
		const unsubscribe = supabaseTrackedUsers.subscribeToChanges();

		return () => {
			if (unsubscribe) unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>Predecessor Stats Tracker</title>
	<meta name="description" content="Track your Predecessor game statistics" />
</svelte:head>

<div class="py-8 px-4">
	<!-- Users Grid - 4 cards per row -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin text-4xl mb-4 text-predecessor-orange">⚡</div>
				<p class="text-gray-400">Loading players...</p>
			</div>
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-7xl mx-auto">
			{#each sortedUsers as user}
				<PlayerCard {user} />
			{/each}

			{#if sortedUsers.length === 0}
				<div class="col-span-full text-center py-12">
					<p class="text-gray-400 text-lg">No users configured yet</p>
					<p class="text-gray-500 mt-2">Go to Admin to add players</p>
				</div>
			{/if}
		</div>
	{/if}
</div>