<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { auth, isAuthenticated } from '$lib/stores/auth';

	let { children } = $props();
	let authenticated = $state($isAuthenticated);

	function handleLogout() {
		auth.logout();
	}
</script>

<AuthGuard>
	<div class="min-h-screen bg-predecessor-darker flex flex-col">
		<!-- Header -->
		<header class="border-b border-predecessor-border bg-predecessor-dark/50 backdrop-blur-sm sticky top-0 z-50">
			<div class="container mx-auto px-4">
				<nav class="flex items-center justify-between h-16">
					<a href="{base}/" class="flex items-center space-x-2">
						<span class="text-2xl font-bold bg-gradient-to-r from-predecessor-orange to-amber-500 bg-clip-text text-transparent">
							Predecessor Stats
						</span>
					</a>

					<div class="flex items-center space-x-4">
						<a
							href="{base}/"
							class="px-4 py-2 rounded-lg hover:bg-predecessor-card transition-colors"
							class:bg-predecessor-card={$page.url.pathname === `${base}/` || $page.url.pathname === base || ($page.url.pathname === '/' && !base)}
						>
							Dashboard
						</a>
						<a
							href="{base}/admin"
							class="px-4 py-2 rounded-lg hover:bg-predecessor-card transition-colors"
							class:bg-predecessor-card={$page.url.pathname === `${base}/admin`}
						>
							Admin
						</a>
						<button
							onclick={handleLogout}
							class="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
						>
							Logout
						</button>
					</div>
				</nav>
			</div>
		</header>

		<!-- Main content -->
		<main class="container mx-auto px-4 py-8 flex-1">
			{@render children()}
		</main>
	</div>
</AuthGuard>