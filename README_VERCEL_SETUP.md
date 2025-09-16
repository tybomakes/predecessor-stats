# Setting up Vercel Proxy for Omeda.city API

Since Omeda.city has CORS restrictions and Cloudflare bot protection, we need a backend proxy to fetch the data. Here's how to set it up for free using Vercel:

## Steps:

1. **Create a Vercel account** (if you don't have one)
   - Go to https://vercel.com and sign up with your GitHub account

2. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

3. **Deploy the proxy**
   ```bash
   vercel --prod
   ```
   - Follow the prompts to link to your Vercel account
   - Choose a project name (e.g., `predecessor-proxy`)

4. **Get your proxy URL**
   - After deployment, you'll get a URL like: `https://your-project.vercel.app`

5. **Update the API configuration**
   - Edit `src/lib/config/api.ts`
   - Change `API_BASE_URL` to: `https://your-project.vercel.app/api/proxy?path=`

## How it works:

- The Vercel function acts as a proxy server
- It receives requests from your frontend
- Makes the actual API call to Omeda.city (without CORS restrictions)
- Returns the data to your frontend

## Example:
Instead of calling:
```
https://omeda.city/players/123.json
```

Your app will call:
```
https://your-project.vercel.app/api/proxy?path=/players/123.json
```

## Alternative: Use Netlify Functions

If you prefer Netlify, you can use Netlify Functions instead. The setup is similar but uses a different file structure.