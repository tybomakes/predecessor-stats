// Auth configuration
// For production, use environment variables or a secure backend

// Option 1: Use a hashed password (more secure for public repos)
// Generate hash at: https://bcrypt-generator.com/ or https://passwordsgenerator.net/sha256-hash-generator/
// This is the SHA-256 hash of your password - change this!
export const PASSWORD_HASH = '7f3b9b8c4a5e2d1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f'; // Change this!

// Option 2: Use environment variable (for build-time configuration)
// Set VITE_ACCESS_PASSWORD in your environment or .env.local file
export const ENV_PASSWORD = import.meta.env.VITE_ACCESS_PASSWORD;

// Option 3: Prompt for password configuration on first visit
// Store the admin-configured password in localStorage

export const AUTH_CONFIG = {
	// Maximum login attempts before lockout
	maxAttempts: 5,
	// Lockout duration in milliseconds (5 minutes)
	lockoutDuration: 5 * 60 * 1000,
	// Session duration in milliseconds (24 hours)
	sessionDuration: 24 * 60 * 60 * 1000,
	// Use hashed password comparison
	useHash: false
};