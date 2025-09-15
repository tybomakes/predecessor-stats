# Predecessor Stats Tracker

A private web application for tracking Predecessor game statistics, built with SvelteKit and hosted on GitHub Pages.

## Features

- 🔒 Password-protected access
- 📊 Player statistics tracking
- 🎮 Match history display
- 🏆 Rank and MMR tracking
- 🌙 Dark theme optimized for gaming
- 📱 Responsive design for all devices
- ⚡ Real-time match tracking (manual refresh)
- 💾 Client-side caching for performance

## Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- GitHub account for hosting

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/predecessor-stats.git
cd predecessor-stats
```

2. Install dependencies:
```bash
npm install
```

3. Configure the application:

#### Set Password
Edit `src/lib/stores/auth.ts` and change the `ACCESS_PASSWORD`:
```typescript
const ACCESS_PASSWORD = 'your-secure-password-here';
```

#### Add Users to Track
Edit `src/lib/config/users.ts` and add player IDs:
```typescript
export const TRACKED_USERS: TrackedUser[] = [
  {
    id: 'player-id-from-omeda-city',
    name: 'PlayerUsername',
    displayName: 'Display Name'
  },
  // Add more users here
];
```

To find player IDs:
1. Go to https://omeda.city
2. Search for the player
3. Copy the ID from the URL (e.g., `https://omeda.city/players/PLAYER-ID-HERE`)

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Building for Production

Build the static site:
```bash
npm run build
```

Preview the build locally:
```bash
npm run preview
```

## Deployment to GitHub Pages

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npx gh-pages -d build
```

### Automatic Deployment (Recommended)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Go to your repository Settings → Pages
3. Set Source to "GitHub Actions"
4. Push to main branch to trigger deployment

The site will be available at: `https://yourusername.github.io/predecessor-stats`

## Configuration

### API Settings
Edit `src/lib/config/api.ts` to adjust:
- Cache duration
- Polling intervals
- API base URL

### Theme Customization
Edit `tailwind.config.js` to customize colors and styling.

## Usage

1. Navigate to your deployed site
2. Enter the password you configured
3. Click on a user card to view their detailed stats
4. Use the refresh button to check for live matches
5. Click logout to end your session

## Security Notes

- The password is stored in the source code - this is basic protection only
- Suitable for small groups of trusted users
- For production use with sensitive data, implement proper authentication
- API calls are made from the browser (no backend required)

## Technology Stack

- **Framework**: SvelteKit
- **UI**: TailwindCSS + Custom Components
- **Hosting**: GitHub Pages (free)
- **API**: Omeda.city (public API)
- **Language**: TypeScript

## API Usage

This app uses the Omeda.city API responsibly:
- Implements client-side caching
- Respects rate limits
- Credits API provider in footer

## Troubleshooting

### Build fails
- Ensure Node.js 18+ is installed
- Run `npm ci` to clean install dependencies

### GitHub Pages 404
- Check repository settings for Pages configuration
- Ensure the base path is correct in `svelte.config.js`

### API errors
- Check if Omeda.city API is accessible
- Verify player IDs are correct
- Clear browser cache if data seems stale

## Contributing

This is a private project, but if you have access:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

Private project - not for public distribution

## Credits

- Powered by [Omeda.city API](https://omeda.city)
- Not affiliated with Omeda Studios or Predecessor