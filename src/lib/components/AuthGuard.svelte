<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import Login from './Login.svelte';

	let { children } = $props();
	let authState = $state($auth);
</script>

{#if authState.isAuthenticated}
	{@render children()}
{:else}
	<Login />
{/if}