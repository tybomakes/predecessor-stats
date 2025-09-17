# Vercel Proxy Deployment Guide

This guide will help you deploy the Omeda.city API proxy to Vercel to bypass CORS restrictions.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier is sufficient)
- Git repository set up (this project)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Fork or Clone this Repository**
   - Push this project to your GitHub/GitLab/Bitbucket account

2. **Import to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your repository
   - Vercel will automatically detect the configuration

3. **Configure Project**
   - Project Name: `predecessor-proxy` (or your preference)
   - Framework Preset: Other (or leave as auto-detected)
   - Root Directory: `.` (leave as is)
   - Click "Deploy"

4. **Get Your Deployment URL**
   - After deployment, you'll get a URL like: `https://your-project.vercel.app`
   - Copy this URL

### Option 2: Deploy via CLI

1. **Install Vercel CLI** (already installed as dev dependency)
   ```bash
   npm install --save-dev vercel
   ```

2. **Login to Vercel**
   ```bash
   npx vercel login
   ```

3. **Deploy the Proxy**
   ```bash
   npx vercel --prod
   ```
   - Follow the prompts:
     - Set up and deploy: Yes
     - Select scope: Your username
     - Link to existing project?: No
     - Project name: `predecessor-proxy` (or your preference)
     - Directory: `.` (current directory)

4. **Get Your Deployment URL**
   - After deployment, copy the production URL shown

## Configure Your Application

1. **Create `.env.local` file** in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. **Add your Vercel URL** to `.env.local`:
   ```env
   VITE_VERCEL_PROXY_URL=https://your-project.vercel.app
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

## Testing the Proxy

1. **Check the proxy directly**:
   Visit: `https://your-project.vercel.app/api/proxy?path=/heroes.json`

   You should see JSON data for Predecessor heroes.

2. **Test in your application**:
   - Open your application
   - Check the browser console for any CORS errors
   - Data should load successfully through the proxy

## Troubleshooting

### CORS Errors Still Appearing
- Make sure you've set `VITE_VERCEL_PROXY_URL` in `.env.local`
- Verify the URL doesn't have a trailing slash
- Check that the proxy is deployed and accessible

### 500 Errors from Proxy
- The Omeda.city API might be down
- Check the Vercel function logs for details

### Data Not Loading
- Verify the proxy URL is correct in `.env.local`
- Check browser developer tools Network tab
- Ensure the proxy endpoint returns data when accessed directly

## Updating the Proxy

When you need to update the proxy function:

1. **Make changes** to `api/proxy.js`
2. **Commit and push** to your repository
3. **Vercel will auto-deploy** if connected to Git
   OR
   **Manually deploy** with: `npx vercel --prod`

## Production Deployment

For the main application (GitHub Pages):

1. Ensure `.env.local` has your Vercel proxy URL
2. Build the application: `npm run build`
3. Deploy to GitHub Pages: `npm run deploy`

## Security Notes

- The proxy is configured to only accept GET requests
- CORS is enabled for all origins (you can restrict this in `api/proxy.js`)
- No sensitive data or API keys are exposed
- The proxy only forwards requests to Omeda.city

## Cost

- Vercel's free tier includes:
  - 100 GB bandwidth per month
  - 100,000 function invocations per month
  - This is more than sufficient for personal use

## Alternative Solutions

If Vercel doesn't work for your needs, you can:
1. Deploy the proxy to Netlify (similar serverless functions)
2. Use a different CORS proxy service
3. Set up your own backend server (Node.js, Python, etc.)

## Support

For issues with:
- The proxy function: Check `api/proxy.js`
- Vercel deployment: See [Vercel Docs](https://vercel.com/docs)
- CORS configuration: Review `vercel.json`