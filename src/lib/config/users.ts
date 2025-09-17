export interface TrackedUser {
	id: string;
	name: string;
	displayName: string;
}

// Pre-configured users - add your player IDs here
export const TRACKED_USERS: TrackedUser[] = [
	{
		id: 'fe580209-fb5f-402b-a720-9260259e92c8',
		name: 'Madman2024',
		displayName: 'Main Account'
	},
	// Add more player IDs here
	// Example format:
	// {
	//   id: 'player-uuid-here',
	//   name: 'PlayerName',
	//   displayName: 'Display Name'
	// },
];