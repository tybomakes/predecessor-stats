<script lang="ts">
	import type { TrackedUser } from '$lib/config/users';

	interface Props {
		user: TrackedUser;
	}

	let { user }: Props = $props();
</script>

<a
	href="/player/{user.id}"
	class="block bg-predecessor-card border border-predecessor-border rounded-lg p-6 hover:border-predecessor-orange/50 transition-all hover:shadow-lg hover:shadow-predecessor-orange/10"
>
	<div class="flex items-center justify-between mb-4">
		<div class="w-12 h-12 bg-gradient-to-br from-predecessor-orange to-amber-600 rounded-full"></div>
		<div class="text-right">
			<span class="text-xs text-gray-500 uppercase tracking-wide">Rank</span>
			<p class="text-lg font-semibold">Loading...</p>
		</div>
	</div>

	<h3 class="text-xl font-bold mb-1">{user.displayName}</h3>
	<p class="text-gray-400 text-sm mb-4">{user.name}</p>

	<div class="grid grid-cols-3 gap-2 text-center">
		<div>
			<p class="text-2xl font-bold text-predecessor-orange">-</p>
			<p class="text-xs text-gray-500">Games</p>
		</div>
		<div>
			<p class="text-2xl font-bold text-green-500">-</p>
			<p class="text-xs text-gray-500">Win %</p>
		</div>
		<div>
			<p class="text-2xl font-bold text-blue-500">-</p>
			<p class="text-xs text-gray-500">KDA</p>
		</div>
	</div>
</a>