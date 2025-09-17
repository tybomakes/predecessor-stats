<script lang="ts">
	import type { Item } from '$lib/api/omeda';
	import { getImageUrl } from '$lib/config/api';

	interface Props {
		items: Item[];
		size?: 'sm' | 'md' | 'lg';
		showTooltip?: boolean;
	}

	let { items, size = 'md', showTooltip = true }: Props = $props();

	const sizeClasses = {
		sm: 'w-6 h-6',
		md: 'w-8 h-8',
		lg: 'w-10 h-10'
	};
</script>

<div class="flex items-center gap-1">
	{#each items as item}
		<div class="relative group">
			{#if item.image || item.image_url}
				<img
					src={getImageUrl(item.image || item.image_url)}
					alt={item.display_name || item.name}
					class="{sizeClasses[size]} rounded border border-predecessor-border object-cover"
				/>
			{:else}
				<div class="{sizeClasses[size]} rounded border border-predecessor-border bg-predecessor-dark flex items-center justify-center">
					<span class="text-xs opacity-50">?</span>
				</div>
			{/if}

			{#if showTooltip}
				<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
					{item.display_name || item.name}
					{#if item.price}
						<span class="text-predecessor-orange ml-1">{item.price}g</span>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>