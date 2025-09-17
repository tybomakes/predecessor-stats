<script lang="ts">
	import type { Build, Item } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';
	import { gameData } from '$lib/api/gameData';
	import { onMount } from 'svelte';

	interface Props {
		build: Build;
		compact?: boolean;
	}

	let { build, compact = false }: Props = $props();
	let items = $state<Item[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const allItems = await gameData.getItems();

			// Get main build items
			const itemIds = [
				build.item1_id,
				build.item2_id,
				build.item3_id,
				build.item4_id,
				build.item5_id,
				build.item6_id
			].filter(id => id != null);

			items = itemIds.map(id => allItems.find(i => i.id === id)).filter(Boolean) as Item[];
		} catch (error) {
			console.error('Failed to load items:', error);
		} finally {
			loading = false;
		}
	});
</script>

<div class="bg-predecessor-dark rounded-lg p-4">
	<div class="mb-3">
		<h4 class="font-semibold text-sm text-predecessor-orange">{build.title}</h4>
		{#if build.author_player}
			<p class="text-xs text-gray-400">
				by {build.author_player.display_name}
				{#if build.author_player.rank_title}
					<span class="text-predecessor-orange">({build.author_player.rank_title})</span>
				{/if}
			</p>
		{/if}
		{#if build.upvotes_count}
			<p class="text-xs text-gray-500 mt-1">
				👍 {build.upvotes_count}
				{#if build.downvotes_count}
					👎 {build.downvotes_count}
				{/if}
			</p>
		{/if}
	</div>

	<div class="space-y-2">
		<p class="text-xs text-gray-400">Recommended Items:</p>
		{#if loading}
			<div class="flex gap-2">
				{#each Array(6) as _}
					<div class="w-10 h-10 bg-predecessor-border rounded animate-pulse"></div>
				{/each}
			</div>
		{:else if items.length > 0}
			<div class="flex flex-wrap gap-2">
				{#each items as item, index}
					<div class="relative group">
						{#if item.image || item.image_url}
							<img
								src={getImageUrl(item.image || item.image_url)}
								alt={item.display_name || item.name}
								class="w-10 h-10 rounded border border-predecessor-border hover:border-predecessor-orange transition-colors"
							/>
						{:else}
							<div class="w-10 h-10 rounded border border-predecessor-border bg-predecessor-darker flex items-center justify-center">
								<span class="text-xs opacity-50">{index + 1}</span>
							</div>
						{/if}

						<!-- Tooltip -->
						<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/95 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
							{item.display_name || item.name}
							{#if item.price}
								<span class="text-predecessor-orange ml-1">{item.price}g</span>
							{/if}
						</div>

						<!-- Build order number -->
						<span class="absolute -top-1 -right-1 w-4 h-4 bg-predecessor-orange rounded-full text-xs flex items-center justify-center text-black font-bold">
							{index + 1}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-xs text-gray-500">No items available</p>
		{/if}
	</div>

	{#if !compact && build.modules && build.modules.length > 0}
		<div class="mt-4 space-y-2">
			<p class="text-xs text-gray-400">Build Path:</p>
			{#each build.modules.slice(0, 3) as module}
				<div class="text-xs bg-predecessor-darker p-2 rounded">
					<p class="font-semibold mb-1">{module.title}</p>
					<!-- Could add module items here if needed -->
				</div>
			{/each}
		</div>
	{/if}
</div>