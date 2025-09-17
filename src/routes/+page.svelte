<script lang="ts">
	import { onMount } from 'svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { trackedUsersStore } from '$lib/stores/trackedUsers';
	import { gameData } from '$lib/api/gameData';
	import { omedaAPI } from '$lib/api/omeda';
	import type { TrackedUser } from '$lib/config/users';
	import type { Player } from '$lib/api/omeda';

	let users = $state<TrackedUser[]>([]);
	let playersData = $state<Map<string, Player>>(new Map());
	let sortedUsers = $state<TrackedUser[]>([]);

	// Subscribe to tracked users store
	$effect(() => {
		const unsubscribe = trackedUsersStore.subscribe(value => {
			users = value;
			loadPlayersData(value);
		});

		return unsubscribe;
	});

	// Load player data for sorting by rank
	async function loadPlayersData(usersList: TrackedUser[]) {
		for (const user of usersList) {
			try {
				const playerData = await omedaAPI.getPlayer(user.id);
				playersData.set(user.id, playerData);
			} catch (error) {
				console.error(`Failed to load data for ${user.id}:`, error);
			}
		}
		sortUsersByRank();
	}

	// Sort users by rank (higher VP first)
	function sortUsersByRank() {
		sortedUsers = [...users].sort((a, b) => {
			const playerA = playersData.get(a.id);
			const playerB = playersData.get(b.id);

			// Sort by VP total (higher first)
			const vpA = playerA?.vp_total || 0;
			const vpB = playerB?.vp_total || 0;

			return vpB - vpA;
		});
	}

	// Preload game data and load users from storage
	onMount(() => {
		trackedUsersStore.loadFromStorage();
		gameData.preloadAll().catch(console.error);
	});
</script>

<svelte:head>
	<title>Predecessor Stats Tracker</title>
	<meta name="description" content="Track your Predecessor game statistics" />
</svelte:head>

<div class="space-y-8">
	<!-- Hero Section -->
	<div class="text-center py-12">
		<h1 class="text-5xl font-bold mb-4 bg-gradient-to-r from-predecessor-orange to-amber-500 bg-clip-text text-transparent">
			Predecessor Stats Tracker
		</h1>
		<p class="text-xl text-gray-400">Track your stats, analyze matches, and improve your gameplay</p>
	</div>

	<!-- Users Grid - 4 cards per row -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
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
</div>