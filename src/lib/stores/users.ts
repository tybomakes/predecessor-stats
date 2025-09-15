import { writable } from 'svelte/store';
import { TRACKED_USERS } from '$lib/config/users';
import type { TrackedUser } from '$lib/config/users';

// Initialize with pre-configured users
export const trackedUsers = writable<TrackedUser[]>(TRACKED_USERS);