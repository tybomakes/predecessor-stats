<script lang="ts">
	import { onMount } from 'svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { trackedUsers } from '$lib/stores/users';

	let users = $state($trackedUsers);
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

	<!-- Users Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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