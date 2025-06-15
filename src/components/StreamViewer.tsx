
import React, { useState } from "react";

type StreamInfo = {
  embed_url: string; // For embedding (Twitch/YouTube iframe)
  raw_url?: string; // "Watch on Twitch" or direct links
  language?: string;
  is_official?: boolean;
  name?: string;
  platform?: "twitch" | "youtube" | "other";
};

interface StreamViewerProps {
  streams: StreamInfo[];
  showTabs?: boolean;
}

const getLanguageLabel = (lang: string) => {
  if (!lang) return "Other";
  const map: Record<string, string> = {
    en: "English",
    ru: "Russian",
    ja: "Japanese",
    es: "Spanish",
    fr: "French",
    pt: "Portuguese",
    cs: "Czech",
    pl: "Polish",
    tr: "Turkish",
    de: "German",
    zh: "Chinese",
    ko: "Korean",
  };
  return map[lang] || lang.toUpperCase();
};

export const StreamViewer: React.FC<StreamViewerProps> = ({
  streams,
  showTabs = true,
}) => {
  const [selected, setSelected] = useState(0);

  if (!streams || streams.length === 0) {
    return (
      <div className="text-gray-400 py-8 text-center">
        No stream available.
      </div>
    );
  }

  return (
    <div className="w-full">
      {showTabs && streams.length > 1 && (
        <div className="flex space-x-2 mb-4">
          {streams.map((stream, idx) => (
            <button
              key={idx}
              className={`py-1 px-3 rounded 
                ${selected === idx ? "bg-blue-600 text-white" : "bg-theme-gray-light text-blue-300"}
                font-semibold text-xs border border-blue-700
              `}
              onClick={() => setSelected(idx)}
            >
              {stream.name 
                ? stream.name 
                : getLanguageLabel(stream.language || "")}
              {stream.is_official && (
                <span className="ml-1 inline-block bg-blue-400 text-white rounded px-1 text-[10px]">Official</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="aspect-w-16 aspect-h-9 bg-black rounded mb-2 relative overflow-hidden">
        <iframe
          src={streams[selected].embed_url}
          allowFullScreen
          allow="autoplay; picture-in-picture"
          className="w-full h-full border-0 rounded"
          title={`Stream ${selected + 1}`}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>

      <div className="flex flex-row flex-wrap gap-3 items-center mb-1">
        {streams[selected].raw_url && (
          <a
            href={streams[selected].raw_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Watch on {streams[selected].platform?.toUpperCase() || "Stream"}
          </a>
        )}
        <span className="text-xs text-gray-400">Language: {getLanguageLabel(streams[selected].language || "en")}</span>
        {streams[selected].is_official && (
          <span className="ml-2 text-xs bg-blue-400 px-2 py-0.5 rounded text-white">Official</span>
        )}
      </div>
    </div>
  );
};

/**
 * Extracts streams_list from PandaScore match raw_data and converts to StreamInfo[].
 */
export function extractStreamsFromRawData(rawData: any): StreamInfo[] {
  // Typical structure: { streams_list: [{ embed_url, raw_url, language, official, ... }] }
  if (!rawData || !rawData.streams_list) return [];
  return (rawData.streams_list as any[])
    .filter(s => s.embed_url)
    .map(s => {
      let platform: StreamInfo["platform"] = "other";
      if (s.embed_url?.includes("twitch.tv")) platform = "twitch";
      if (s.embed_url?.includes("youtube.com") || s.embed_url?.includes("youtu.be")) platform = "youtube";
      return {
        embed_url: s.embed_url,
        raw_url: s.raw_url || s.url || undefined,
        language: s.language,
        is_official: !!s.official,
        name: s.name,
        platform
      };
    });
}
