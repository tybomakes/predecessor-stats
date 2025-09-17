# Deployment Configuration

## GitHub Pages Deployment with Supabase

### Required GitHub Secrets

To deploy this application to GitHub Pages with Supabase integration, you need to configure the following secrets in your GitHub repository:

1. **Go to your GitHub repository**
2. **Navigate to Settings → Secrets and variables → Actions**
3. **Add the following secrets:**

| Secret Name | Value | Description |
|------------|-------|-------------|
| `ACCESS_PASSWORD` | `your_password` | Password for accessing the admin panel (optional) |
| `PUBLIC_SUPABASE_URL` | `https://xnvbiudjergtkxgakmcs.supabase.co` | Your Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Your Supabase anon/public key (safe for client-side) |

### Getting Your Supabase Credentials

1. **Log into your Supabase dashboard**
2. **Select your project**
3. **Go to Settings → API**
4. **Copy:**
   - **Project URL** → Use as `PUBLIC_SUPABASE_URL`
   - **anon public key** → Use as `PUBLIC_SUPABASE_ANON_KEY`

### Important Notes

- The `anon public` key is safe to expose client-side as it only provides access based on your Row Level Security (RLS) policies
- Never commit the `.env.local` file to version control
- The GitHub Actions workflow will automatically inject these secrets during the build process

### Local Development

For local development, create a `.env.local` file:

```env
# Local environment variables (DO NOT COMMIT THIS FILE)
VITE_ACCESS_PASSWORD=your_local_password

# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Deployment Process

1. **Configure GitHub Secrets** (as described above)
2. **Push to main branch** - GitHub Actions will automatically:
   - Build the static site with environment variables
   - Deploy to GitHub Pages
3. **Access your site** at: `https://[your-username].github.io/predecessor-stats`

### Multi-User Access

Once deployed with Supabase:
- All users accessing the site will see the same tracked players
- Changes made by one user will be visible to all users in real-time
- Builds and tracked players are stored in the Supabase database
- No authentication is required (public access mode)

### Troubleshooting

If the production site isn't connecting to Supabase:

1. **Check GitHub Actions logs** for build errors
2. **Verify secrets are correctly set** in GitHub repository settings
3. **Ensure Supabase RLS policies** allow public access (already configured in our schema)
4. **Check browser console** for any connection errors

### Database Backup

To backup your Supabase data:
1. Go to Supabase Dashboard → Database → Backups
2. Download a backup of your data
3. Store it securely

### Scaling Considerations

The free Supabase tier includes:
- 500MB database space
- 2GB bandwidth
- 50MB file storage
- Unlimited API requests

This should be sufficient for a small group of users tracking their Predecessor stats.