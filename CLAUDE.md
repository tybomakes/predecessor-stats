# Predecessor Stats Tracker Platform

## Project Overview
A free, self-hosted web platform for tracking Predecessor game statistics for a small group of users. The platform provides real-time match information, player statistics, and item build recommendations.

## Tech Stack

### Frontend
- **Framework**: SvelteKit (Static site generation for GitHub Pages hosting)
- **UI Components**: shadcn-svelte (for a modern, dark-themed UI)
- **Styling**: TailwindCSS
- **State Management**: Svelte stores
- **Data Fetching**: Native fetch with SvelteKit load functions

### Hosting
- **Platform**: GitHub Pages (free static hosting)
- **Deployment**: GitHub Actions for automated deployment
- **Domain**: Will use GitHub Pages domain (username.github.io/predecessor-stats)

### Architecture Decisions

#### 1. Static Site with Client-Side API Calls
- Since we're using GitHub Pages, we'll build a static site
- All API calls to omeda.city will be made from the client
- No backend required, keeping hosting free

#### 2. User Management
- Simple client-side user selection (no authentication needed)
- Store selected users in localStorage
- Pre-configured list of tracked users

#### 3. Data Caching Strategy
- Use browser localStorage for caching frequently accessed data
- Implement smart refresh intervals to respect API limits
- Cache player data, hero images, and item data

## Core Features

### 1. Dashboard
- Clean grid layout showing pre-configured users
- Click to navigate to individual player stats
- Dark theme with Predecessor-inspired design

### 2. Player Profile Page
Features:
- Overall statistics (rank, win rate, KDA)
- Match history with detailed stats
- Hero performance breakdown
- Common teammates

### 3. Live Match Tracker
- Manual refresh button to check for active matches
- Display current match participants
- Show suggested item builds based on hero/role
- Display player ranks and recent performance

### 4. Item Build Recommendations
- Fetch popular builds for current hero/role combination
- Display most used items by high-performing players
- Quick reference during matches

## API Integration Points

### Primary Endpoints Used:
1. `/players/{player_id}.json` - Player info and rank
2. `/players/{player_id}/matches.json` - Match history
3. `/players/{player_id}/statistics.json` - Overall stats
4. `/players/{player_id}/hero_statistics.json` - Hero-specific stats
5. `/matches/{match_id}.json` - Detailed match data
6. `/heroes.json` - Hero metadata and images
7. `/items.json` - Item information
8. `/builds.json` - Build recommendations

### API Usage Guidelines
- No current rate limits but use responsibly
- Implement client-side caching
- Batch requests where possible
- Add loading states for better UX

## Design System

### Color Palette
- Background: Dark grays (#0a0a0a, #1a1a1a)
- Primary: Predecessor orange/amber (#f97316)
- Secondary: Cool blues (#3b82f6)
- Success: Green (#10b981)
- Error: Red (#ef4444)
- Text: White/gray shades

### Typography
- Headers: Bold, modern sans-serif
- Body: Clean, readable sans-serif
- Monospace for stats/numbers

### Components
- Cards for player profiles
- Tables for match history
- Progress bars for stats visualization
- Tooltips for item/hero information
- Modal for live match details

## Development Workflow

### Phase 1: Foundation
- Set up SvelteKit project with static adapter
- Configure TailwindCSS and shadcn-svelte
- Create basic routing structure
- Implement dark theme

### Phase 2: Core Features
- Build dashboard with user selection
- Implement player profile pages
- Add match history display
- Integrate API calls with caching

### Phase 3: Live Match Features
- Add live match detection
- Build item recommendation system
- Create match detail views

### Phase 4: Polish
- Add loading states and error handling
- Implement responsive design
- Optimize performance
- Add data visualization

### Phase 5: Deployment
- Configure GitHub Actions
- Deploy to GitHub Pages
- Test with target users
- Document usage

## Project Structure
```
predecessor-stats/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte       # App layout with navigation
│   │   ├── +page.svelte         # Dashboard
│   │   └── player/
│   │       └── [id]/
│   │           ├── +page.svelte # Player profile
│   │           └── +page.js     # Data loading
│   ├── lib/
│   │   ├── api/                 # API integration
│   │   │   ├── omeda.js         # Omeda.city API client
│   │   │   └── cache.js         # Caching utilities
│   │   ├── components/          # Reusable components
│   │   │   ├── PlayerCard.svelte
│   │   │   ├── MatchHistory.svelte
│   │   │   ├── LiveMatch.svelte
│   │   │   └── ItemBuild.svelte
│   │   ├── stores/              # Svelte stores
│   │   │   └── users.js         # User management
│   │   └── utils/               # Helper functions
│   └── app.html                 # HTML template
├── static/                      # Static assets
│   └── images/                  # Local images if needed
├── package.json
├── svelte.config.js             # SvelteKit config
├── tailwind.config.js           # Tailwind config
├── vite.config.js               # Vite config
└── .github/
    └── workflows/
        └── deploy.yml           # GitHub Actions deployment
```

## Configuration

### User Configuration (src/lib/config/users.js)
```javascript
export const TRACKED_USERS = [
  {
    id: 'fe580209-fb5f-402b-a720-9260259e92c8',
    name: 'YourUsername',
    displayName: 'Display Name'
  },
  // Add more users here
];
```

### API Configuration (src/lib/config/api.js)
```javascript
export const API_BASE_URL = 'https://omeda.city';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const LIVE_MATCH_POLL_INTERVAL = 30 * 1000; // 30 seconds
```

## Performance Considerations

1. **Image Optimization**
   - Cache hero and item images locally after first fetch
   - Use lazy loading for images
   - Implement progressive image loading

2. **Data Management**
   - Paginate match history (20 matches per page)
   - Implement virtual scrolling for long lists
   - Cache API responses with TTL

3. **Bundle Size**
   - Use dynamic imports for heavy components
   - Tree-shake unused shadcn components
   - Optimize build with Vite

## Security Considerations

- No sensitive data stored (no authentication)
- All API calls are read-only
- No user input that could lead to XSS
- Validate all API responses

## Future Enhancements

1. **Phase 2 Features**
   - Compare players side-by-side
   - Team composition analyzer
   - Win rate predictions
   - Performance trends over time

2. **Phase 3 Features**
   - Discord bot integration
   - Mobile app wrapper
   - Export stats to CSV
   - Custom notifications for live matches

## Notes

- This is a client-side only application
- All users share the same instance
- No backend or database required
- Respects omeda.city API usage guidelines