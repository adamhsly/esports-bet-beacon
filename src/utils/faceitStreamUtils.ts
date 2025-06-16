
import { StreamInfo } from '@/components/StreamViewer';

/**
 * Extracts stream information from FACEIT match data
 * Converts championship stream URLs into StreamInfo format for the StreamViewer component
 */
export function extractFaceitStreamsFromMatch(match: any): StreamInfo[] {
  const streams: StreamInfo[] = [];

  // Check for championship stream URL
  if (match.championship_stream_url) {
    const streamUrl = match.championship_stream_url;
    const streamInfo = convertToStreamInfo(streamUrl);
    if (streamInfo) {
      streams.push(streamInfo);
    }
  }

  return streams;
}

/**
 * Converts a direct stream URL to StreamInfo format
 * Handles common streaming platforms like Twitch and YouTube
 */
function convertToStreamInfo(url: string): StreamInfo | null {
  if (!url) return null;

  let platform: StreamInfo["platform"] = "other";
  let embedUrl = url;
  let rawUrl = url;
  let name = "Championship Stream";

  // Handle Twitch URLs
  if (url.includes('twitch.tv')) {
    platform = "twitch";
    name = "Twitch Stream";
    
    // Convert direct Twitch URL to embed format
    if (url.includes('/videos/')) {
      // VOD format: https://www.twitch.tv/videos/123456
      const videoId = url.split('/videos/')[1]?.split('?')[0];
      if (videoId) {
        embedUrl = `https://player.twitch.tv/?video=${videoId}&parent=${window.location.hostname}`;
      }
    } else if (url.includes('twitch.tv/')) {
      // Live channel format: https://www.twitch.tv/channelname
      const channelName = url.split('twitch.tv/')[1]?.split('?')[0]?.split('/')[0];
      if (channelName) {
        embedUrl = `https://player.twitch.tv/?channel=${channelName}&parent=${window.location.hostname}`;
      }
    }
  }
  
  // Handle YouTube URLs
  else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    platform = "youtube";
    name = "YouTube Stream";
    
    let videoId = '';
    
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('/embed/')[1]?.split('?')[0];
    }
    
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
  }

  return {
    embed_url: embedUrl,
    raw_url: rawUrl,
    language: "en",
    is_official: true,
    name: name,
    platform: platform
  };
}
