# Security Configuration

## Password Protection

This application uses password-based authentication for access control. Since it's hosted on GitHub Pages (static hosting), we need to handle authentication carefully.

## Setting Up Secure Password

### For GitHub Pages Deployment (Production)

1. **Go to your GitHub repository**
2. **Navigate to Settings → Secrets and variables → Actions**
3. **Click "New repository secret"**
4. **Add a secret named `ACCESS_PASSWORD`** with your desired password
5. **The password will be injected during build time** and won't be visible in the source code

### For Local Development

1. **Copy `.env.example` to `.env.local`**:
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** and set your password:
   ```
   VITE_ACCESS_PASSWORD=your-password-here
   ```

3. **Never commit `.env.local`** - it's already in .gitignore

## Current Security Features

- **Session-based authentication** - Users stay logged in for 24 hours
- **Brute force protection** - Account locks after 5 failed attempts
- **5-minute lockout period** after too many failed attempts
- **Password stored as environment variable** - Not visible in source code when properly configured
- **HTTPS only** - GitHub Pages serves over HTTPS

## Important Notes

1. **Default Password**: If no environment variable is set, the app falls back to a default password. This should only be used for testing.

2. **Public Repository**: Since this is a public repository, NEVER commit actual passwords to the code.

3. **Client-Side Only**: This is client-side authentication only. It provides basic access control but should not be considered highly secure. For sensitive data, use a proper backend with server-side authentication.

## Changing the Password

### For Production (GitHub Pages)
1. Update the `ACCESS_PASSWORD` secret in GitHub repository settings
2. Re-run the deployment workflow

### For Local Development
1. Update the password in `.env.local`
2. Restart the development server

## Troubleshooting

### Password Not Working
1. Clear browser localStorage
2. Check if `.env.local` exists and has the correct password
3. Restart the development server after changing the password
4. For production, ensure the GitHub secret is properly set

### Locked Out
- Wait 5 minutes for the lockout to expire
- Or clear browser localStorage to reset

## Alternative Security Options

For higher security requirements, consider:

1. **Deploy to Vercel/Netlify** - Support server-side environment variables
2. **Add a backend service** - Implement proper server-side authentication
3. **Use OAuth providers** - Integrate with GitHub, Google, etc.
4. **Deploy to a private server** - Full control over security