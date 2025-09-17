import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OMEDA_API_BASE = 'https://omeda.city/api';

export const GET: RequestHandler = async ({ params, url }) => {
	const path = params.path;
	const queryString = url.search;

	try {
		const apiUrl = `${OMEDA_API_BASE}/${path}${queryString}`;
		console.log('Proxying request to:', apiUrl);

		const response = await fetch(apiUrl, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept-Encoding': 'gzip, deflate, br',
				'DNT': '1',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1'
			}
		});

		if (!response.ok) {
			console.error('API error:', response.status, response.statusText);
			return json({ error: 'API request failed' }, { status: response.status });
		}

		const data = await response.json();

		return json(data, {
			headers: {
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		});
	} catch (error) {
		console.error('Proxy error:', error);
		return json({ error: 'Failed to fetch data' }, { status: 500 });
	}
};