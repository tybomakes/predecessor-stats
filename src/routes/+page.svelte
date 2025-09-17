<script lang="ts">
	import { onMount } from 'svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { trackedUsersStore } from '$lib/stores/trackedUsers';
	import { gameData } from '$lib/api/gameData';
	import type { TrackedUser } from '$lib/config/users';

	let users = $state<TrackedUser[]>([]);

	// Subscribe to tracked users store
	$effect(() => {
		const unsubscribe = trackedUsersStore.subscribe(value => {
			users = value;
		});

		return unsubscribe;
	});

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

	<!-- Users Grid - Optimized for 8 players -->
	<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
		{#each users as user}
			<PlayerCard {user} />
		{/each}

		{#if users.length === 0}
			<div class="col-span-full text-center py-12">
				<p class="text-gray-400 text-lg">No users configured yet</p>
				<p class="text-gray-500 mt-2">Add users to start tracking stats</p>
			</div>
		{/if}
	</div>
</div>