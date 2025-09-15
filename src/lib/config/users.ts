export interface TrackedUser {
	id: string;
	name: string;
	displayName: string;
}

// Pre-configured users - add your player IDs here
export const TRACKED_USERS: TrackedUser[] = [
	{
		id: 'fe580209-fb5f-402b-a720-9260259e92c8',
		name: 'YourUsername',
		displayName: 'Main Account'
	},
	// Add more users here as needed
];