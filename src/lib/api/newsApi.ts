
import { API_KEY, WEB_URL } from './apiConfig';

// Fetch news articles
export async function fetchNews(limit = 10) {
  try {
    console.log(`SportDevs API: Fetching news articles, limit: ${limit}`);
    
    const response = await fetch(
      `${WEB_URL}/news?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const news = await response.json();
    console.log(`SportDevs API: Received ${news.length} news articles`);
    return news;
    
  } catch (error) {
    console.error("Error fetching news:", error);
    throw error;
  }
}
