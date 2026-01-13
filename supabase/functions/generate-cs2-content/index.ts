import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface Match {
  id: string;
  match_id: string;
  teams: any[];
  start_time: string;
  tournament_name: string;
  league_name: string;
  serie_name: string;
  number_of_games: number;
  status: string;
  slug?: string;
}

interface GeneratedContent {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  content_markdown: string;
}

interface TeamStats {
  win_rate: number;
  recent_form: string;
  total_matches: number;
}

interface HeadToHead {
  team1Wins: number;
  team2Wins: number;
  totalMatches: number;
}

interface MatchInput {
  match_id: string;
  team_a: {
    id: string;
    name: string;
    acronym: string;
    logo_url?: string;
    stats: TeamStats | null;
  };
  team_b: {
    id: string;
    name: string;
    acronym: string;
    logo_url?: string;
    stats: TeamStats | null;
  };
  head_to_head: HeadToHead | null;
  start_time_utc: string;
  tournament_name: string;
  league_name: string;
  serie_name: string;
  best_of: number;
  tier: string;
  match_page_url: string;
  fantasy_page_url: string;
  current_date: string;
}

interface SlateInput {
  date: string;
  date_formatted: string;
  fantasy_page_url: string;
  matches_by_tier: Record<string, Array<{
    match_id: string;
    team_a: { name: string; acronym: string; stats: TeamStats | null };
    team_b: { name: string; acronym: string; stats: TeamStats | null };
    head_to_head: HeadToHead | null;
    time_utc: string;
    tournament: string;
    best_of: number;
    match_slug: string;
  }>>;
  total_match_count: number;
}

interface TournamentInput {
  tournament_name: string;
  tournament_slug: string;
  league_name: string;
  serie_name: string;
  tier: string;
  fantasy_page_url: string;
  upcoming_matches: Array<{
    match_id: string;
    team_a: string;
    team_b: string;
    date: string;
    match_slug: string;
  }>;
  past_matches: Array<{
    match_id: string;
    team_a: string;
    team_b: string;
    date: string;
    winner?: string;
    match_slug: string;
  }>;
}

// Tier classification based on tournament/league
function classifyTier(tournamentName: string, leagueName: string): string {
  const name = `${tournamentName} ${leagueName}`.toLowerCase();
  if (name.includes("major") || name.includes("blast premier") || name.includes("esl pro league") || name.includes("iem katowice") || name.includes("iem cologne")) {
    return "S";
  }
  if (name.includes("esl challenger") || name.includes("roobet cup") || name.includes("betboom") || name.includes("pgl") || name.includes("iem")) {
    return "A";
  }
  if (name.includes("cct") || name.includes("esea") || name.includes("thunderpick") || name.includes("elisa")) {
    return "B";
  }
  if (name.includes("open") || name.includes("qualifier") || name.includes("rmr")) {
    return "C";
  }
  return "D";
}

// Generate short ID for slug
function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

// Slugify team name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Format date for slug
function formatDateForSlug(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split("T")[0];
}

// Format date for display
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Extract team info from match
function extractTeamInfo(match: Match): { teamA: any; teamB: any } | null {
  if (!match.teams || match.teams.length < 2) return null;
  
  const teamA = match.teams[0]?.opponent || match.teams[0];
  const teamB = match.teams[1]?.opponent || match.teams[1];
  
  return { teamA, teamB };
}

// Fetch team stats from RPC
async function fetchTeamStats(supabase: any, teamId: string): Promise<TeamStats | null> {
  try {
    const { data, error } = await supabase.rpc("get_team_stats_optimized", { p_team_id: teamId });
    if (error) {
      console.error(`Error fetching stats for team ${teamId}:`, error);
      return null;
    }
    if (data && data.length > 0) {
      // Exclude tournament_wins as it's incorrectly calculated (counts tournaments with any match win, not actual championships)
      const { tournament_wins, ...validStats } = data[0];
      return validStats;
    }
    return null;
  } catch (e) {
    console.error(`Exception fetching stats for team ${teamId}:`, e);
    return null;
  }
}

// Fetch head-to-head from RPC
async function fetchHeadToHead(supabase: any, team1Id: string, team2Id: string, matchId: string): Promise<HeadToHead | null> {
  try {
    const { data, error } = await supabase.rpc("get_head_to_head_optimized", {
      p_team1: team1Id,
      p_team2: team2Id,
      p_match_id: matchId,
      p_months: 12,
    });
    if (error) {
      console.error(`Error fetching H2H for ${team1Id} vs ${team2Id}:`, error);
      return null;
    }
    return data || null;
  } catch (e) {
    console.error(`Exception fetching H2H:`, e);
    return null;
  }
}

// SEO-optimized match post prompt
const MATCH_PROMPT_TEMPLATE = `You are an expert CS2 esports SEO content writer for Frags & Fortunes, a fantasy esports platform.

CRITICAL: Our fantasy game is TEAM-BASED. Players draft TEAMS, not individual players. Never suggest picking individual players.

INPUT DATA (use ONLY this data):
{input_json}

CONTENT REQUIREMENTS:

## Structure (use exact H2 headings for SEO):
1. **## Match Overview** - Quick intro with teams, tournament, date/time (convert UTC to Europe/London), and stakes
2. **## Team Form & Statistics** - Use the stats provided (win_rate, recent_form like "WWLWL", total_matches). If stats are null, say "Limited recent data available". NEVER mention tournament wins as we don't have accurate data for this.
3. **## Head-to-Head History** - Use h2h data if available. If totalMatches > 0, discuss the record
4. **## CS2 Fantasy Team Picks** - TEAM picks only. Subsections:
   - **### Safe Team Pick** - Lower risk team choice with reasoning
   - **### High Upside Team Pick** - Higher risk/reward team choice
   - **### Star Team Recommendation** - Which team to assign as Star Team (2x points)
5. **## Match Prediction** - Brief opinion-based prediction (no odds/percentages)
6. **## Ready to Play?** - Brief CTA explaining team-based fantasy, link to {fantasy_page_url}
7. **## FAQ** - 4-5 questions targeting long-tail searches like:
   - "Who will win {team_a} vs {team_b}?"
   - "Best fantasy team pick for {team_a} vs {team_b}"
   - "When does {team_a} vs {team_b} start?"
   - "{team_a} vs {team_b} head to head record"

## SEO Requirements:
- Primary keyword in title: "{team_a} vs {team_b} CS2"
- Include tournament name in title
- Meta title ≤60 chars, front-load keywords
- Meta description ≤155 chars, include CTA
- Use team names naturally throughout (3-5x each)
- Include "CS2 fantasy", "fantasy picks", "team picks" phrases
- Add "Last updated: {current_date}" at bottom

## Content Rules:
- NEVER mention individual player names, stats, or ratings
- NEVER fabricate data not in the input
- NEVER include betting odds or gambling encouragement
- Keep paragraphs short (2-3 sentences max)
- Use bullet points for lists
- Esports-native, conversion-focused tone

OUTPUT: Return ONLY valid JSON:
{
  "title": "string",
  "slug": "string (format: cs2-{team-a-slug}-vs-{team-b-slug}-{YYYY-MM-DD}-{match_id})",
  "meta_title": "string (≤60 chars)",
  "meta_description": "string (≤155 chars)",
  "content_markdown": "string"
}`;

// SEO-optimized slate post prompt
const SLATE_PROMPT_TEMPLATE = `You are an expert CS2 esports SEO content writer for Frags & Fortunes fantasy platform.

CRITICAL: Our fantasy game is TEAM-BASED. Players draft TEAMS, not individual players.

INPUT DATA:
{input_json}

CONTENT REQUIREMENTS:

## Structure:
1. **## CS2 Fantasy Slate Overview** - Intro with match count, highlight tier breakdown
2. For each tier with matches (S/A/B/C/D):
   - **## Tier {X} Matches** - List matches with times (Europe/London), include team stats/form if available
   - For each match: link to match post using provided match_slug as "/blog/{match_slug}"
   - Quick team pick recommendation per match
3. **## Today's Best Team Picks** - Top 3-5 team recommendations across all matches with reasoning
4. **## Star Team of the Day** - Single best Star Team pick with explanation
5. **## Start Drafting Now** - CTA linking to {fantasy_page_url}
6. **## FAQ** - 3-4 questions like:
   - "Best CS2 fantasy picks for {date_formatted}"
   - "CS2 matches today {date_formatted}"

## SEO Requirements:
- Title format: "CS2 Fantasy Slate {date_formatted} – Daily Team Picks & Draft Guide"
- Meta title ≤60 chars
- Meta description ≤155 chars with match count
- Target keywords: "CS2 fantasy", "CS2 matches today", "CS2 team picks"

OUTPUT: Return ONLY valid JSON:
{
  "title": "string",
  "slug": "string (format: cs2-fantasy-slate-{YYYY-MM-DD})",
  "meta_title": "string (≤60 chars)",
  "meta_description": "string (≤155 chars)",
  "content_markdown": "string"
}`;

// SEO-optimized tournament hub prompt
const TOURNAMENT_PROMPT_TEMPLATE = `You are an expert CS2 esports SEO content writer for Frags & Fortunes fantasy platform.

CRITICAL: Our fantasy game is TEAM-BASED. Players draft TEAMS, not individual players.

INPUT DATA:
{input_json}

CONTENT REQUIREMENTS:

## Structure:
1. **## {tournament_name} Overview** - Brief tournament intro, tier level, format info
2. **## Join the Fantasy Action** - Explain team-based fantasy, link to {fantasy_page_url}
3. **## Upcoming {tournament_name} Matches** - List upcoming matches with links to "/blog/{match_slug}"
4. **## {tournament_name} Results** - Past match results if available
5. **## Fantasy Team Strategy for {tournament_name}** - General tier-appropriate team selection strategy
6. **## FAQ** - 3-4 questions like:
   - "{tournament_name} CS2 fantasy picks"
   - "When is {tournament_name}?"
   - "Best teams to draft for {tournament_name}"

## SEO Requirements:
- Title: "{tournament_name} CS2 Fantasy Hub – Team Picks & Schedule"
- Meta title ≤60 chars
- Meta description ≤155 chars

OUTPUT: Return ONLY valid JSON:
{
  "title": "string",
  "slug": "string (format: cs2-fantasy-{tournament-slug})",
  "meta_title": "string (≤60 chars)",
  "meta_description": "string (≤155 chars)",
  "content_markdown": "string"
}`;

// Validation: Check if output contains fabricated data
function validateOutput(output: GeneratedContent, allowedEntities: string[]): { valid: boolean; reason?: string } {
  const content = `${output.title} ${output.meta_title} ${output.meta_description} ${output.content_markdown}`.toLowerCase();
  
  // Check for hallucination patterns
  const hallucinations = [
    /\$[\d,]+\s*(prize|pool)/i,
    /\d+\.\d+\s*rating/i,
    /K\/D\s*ratio/i,
    /odds\s*of\s*\d/i,
    /map veto/i,
    /pick\s+(s1mple|zywoo|m0nesy|niko|dev1ce|donk|bit)/i, // Common player names
    /draft\s+(s1mple|zywoo|m0nesy|niko|dev1ce|donk|bit)/i,
  ];
  
  for (const pattern of hallucinations) {
    if (pattern.test(content)) {
      return { valid: false, reason: `Content contains potentially fabricated data: ${pattern}` };
    }
  }
  
  // Validate meta lengths
  if (output.meta_title.length > 65) {
    console.warn(`Meta title slightly over: ${output.meta_title.length} chars`);
  }
  if (output.meta_description.length > 160) {
    console.warn(`Meta description slightly over: ${output.meta_description.length} chars`);
  }
  
  return { valid: true };
}

// Call OpenAI API
async function generateWithOpenAI(prompt: string, apiKey: string): Promise<GeneratedContent> {
  console.log("Calling OpenAI API...");
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert esports SEO content writer. Output ONLY valid JSON, no markdown code blocks, no extra text." 
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content returned from OpenAI");
  }

  console.log("OpenAI raw response length:", content.length);

  // Parse JSON from response
  let jsonStr = content.trim();
  if (jsonStr.includes("```json")) {
    jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (jsonStr.includes("```")) {
    jsonStr = jsonStr.replace(/```\n?/g, "");
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to parse JSON:", jsonStr.substring(0, 500));
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

// Upsert blog post
async function upsertBlogPost(
  supabase: any,
  content: GeneratedContent,
  category: string,
  tags: string[]
): Promise<void> {
  const now = new Date().toISOString();
  
  // Check if post exists by slug
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", content.slug)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("blog_posts")
      .update({
        title: content.title,
        content_markdown: content.content_markdown,
        seo_title: content.meta_title,
        seo_description: content.meta_description,
        excerpt: content.meta_description,
        updated_at: now,
        tags: tags,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating blog post:", error);
      throw error;
    }
    console.log(`Updated blog post: ${content.slug}`);
  } else {
    const { error } = await supabase.from("blog_posts").insert({
      slug: content.slug,
      title: content.title,
      content_markdown: content.content_markdown,
      seo_title: content.meta_title,
      seo_description: content.meta_description,
      excerpt: content.meta_description,
      category: category,
      tags: tags,
      author_name: "Frags & Fortunes",
      is_published: true,
      published_at: now,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      console.error("Error inserting blog post:", error);
      throw error;
    }
    console.log(`Created blog post: ${content.slug}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { type = "all", date, matchId, tournamentName } = body;

    console.log(`Starting content generation: type=${type}, date=${date}, matchId=${matchId}`);

    const results = {
      matches: [] as string[],
      slates: [] as string[],
      tournaments: [] as string[],
      errors: [] as string[],
    };

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const currentDate = new Date().toISOString();

    // 1. MATCH POSTS
    if (type === "all" || type === "matches") {
      console.log("Generating match posts...");
      
      let matchQuery = supabase
        .from("pandascore_matches")
        .select("*")
        .eq("esport_type", "Counter-Strike")
        .in("status", ["not_started", "running"]);

      if (matchId) {
        matchQuery = matchQuery.eq("match_id", matchId);
      } else {
        matchQuery = matchQuery
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString());
      }

      const { data: matches, error: matchError } = await matchQuery.order("start_time", { ascending: true });

      if (matchError) {
        console.error("Error fetching matches:", matchError);
        results.errors.push(`Match fetch error: ${matchError.message}`);
      } else if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} matches to process`);
        
        for (const match of matches) {
          try {
            const teamInfo = extractTeamInfo(match);
            if (!teamInfo) {
              console.log(`Skipping match ${match.match_id}: no team info`);
              continue;
            }

            const { teamA, teamB } = teamInfo;
            const teamAId = String(teamA.id || teamA.team_id || "");
            const teamBId = String(teamB.id || teamB.team_id || "");
            
            console.log(`Processing match: ${teamA.name} vs ${teamB.name} (IDs: ${teamAId}, ${teamBId})`);

            // Fetch team stats in parallel
            const [teamAStats, teamBStats, h2h] = await Promise.all([
              teamAId ? fetchTeamStats(supabase, teamAId) : Promise.resolve(null),
              teamBId ? fetchTeamStats(supabase, teamBId) : Promise.resolve(null),
              (teamAId && teamBId) ? fetchHeadToHead(supabase, teamAId, teamBId, match.match_id) : Promise.resolve(null),
            ]);

            console.log(`Stats fetched - TeamA: ${JSON.stringify(teamAStats)}, TeamB: ${JSON.stringify(teamBStats)}, H2H: ${JSON.stringify(h2h)}`);

            const tier = classifyTier(match.tournament_name || "", match.league_name || "");
            const matchDate = formatDateForSlug(match.start_time);

            const matchInput: MatchInput = {
              match_id: match.match_id,
              team_a: {
                id: teamAId,
                name: teamA.name || "Team A",
                acronym: teamA.acronym || "",
                logo_url: teamA.image_url || "",
                stats: teamAStats,
              },
              team_b: {
                id: teamBId,
                name: teamB.name || "Team B",
                acronym: teamB.acronym || "",
                logo_url: teamB.image_url || "",
                stats: teamBStats,
              },
              head_to_head: h2h,
              start_time_utc: match.start_time,
              tournament_name: match.tournament_name || "Unknown Tournament",
              league_name: match.league_name || "",
              serie_name: match.serie_name || "",
              best_of: match.number_of_games || 1,
              tier: tier,
              match_page_url: `/matches/pandascore/${match.match_id}`,
              fantasy_page_url: "/fantasy",
              current_date: currentDate,
            };

            const expectedSlug = `cs2-${slugify(teamA.name || "team-a")}-vs-${slugify(teamB.name || "team-b")}-${matchDate}-${match.match_id}`;

            const prompt = MATCH_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(matchInput, null, 2));
            const content = await generateWithOpenAI(prompt, openAIApiKey);

            // Ensure slug follows our format
            if (!content.slug || !content.slug.startsWith("cs2-")) {
              content.slug = expectedSlug;
            }

            const allowedEntities = [
              teamA.name?.toLowerCase(),
              teamB.name?.toLowerCase(),
              teamA.acronym?.toLowerCase(),
              teamB.acronym?.toLowerCase(),
              match.tournament_name?.toLowerCase(),
            ].filter(Boolean);

            const validation = validateOutput(content, allowedEntities);
            if (!validation.valid) {
              console.warn(`Validation failed for match ${match.match_id}: ${validation.reason}`);
              results.errors.push(`Match ${match.match_id} validation: ${validation.reason}`);
              continue;
            }

            await upsertBlogPost(
              supabase,
              content,
              "CS2 Fantasy",
              ["cs2", "fantasy", "match-preview", tier.toLowerCase(), slugify(teamA.name || ""), slugify(teamB.name || "")]
            );
            results.matches.push(content.slug);
          } catch (e: any) {
            console.error(`Error generating match post for ${match.match_id}:`, e);
            results.errors.push(`Match ${match.match_id}: ${e.message}`);
          }
        }
      } else {
        console.log("No matches found for the specified date/criteria");
      }
    }

    // 2. DAILY SLATE POST
    if (type === "all" || type === "slate") {
      console.log("Generating daily slate post...");
      
      const { data: slateMatches, error: slateError } = await supabase
        .from("pandascore_matches")
        .select("*")
        .eq("esport_type", "Counter-Strike")
        .in("status", ["not_started", "running"])
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString())
        .order("start_time", { ascending: true });

      if (slateError) {
        console.error("Error fetching slate matches:", slateError);
        results.errors.push(`Slate fetch error: ${slateError.message}`);
      } else if (slateMatches && slateMatches.length > 0) {
        try {
          // Group matches by tier and fetch stats
          const matchesByTier: Record<string, any[]> = { S: [], A: [], B: [], C: [], D: [] };
          
          for (const m of slateMatches) {
            const teamInfo = extractTeamInfo(m);
            if (!teamInfo) continue;
            
            const { teamA, teamB } = teamInfo;
            const teamAId = String(teamA.id || teamA.team_id || "");
            const teamBId = String(teamB.id || teamB.team_id || "");
            const tier = classifyTier(m.tournament_name || "", m.league_name || "");
            
            // Fetch stats (limit concurrency for slate)
            const [teamAStats, teamBStats, h2h] = await Promise.all([
              teamAId ? fetchTeamStats(supabase, teamAId) : Promise.resolve(null),
              teamBId ? fetchTeamStats(supabase, teamBId) : Promise.resolve(null),
              (teamAId && teamBId) ? fetchHeadToHead(supabase, teamAId, teamBId, m.match_id) : Promise.resolve(null),
            ]);

            matchesByTier[tier].push({
              match_id: m.match_id,
              team_a: { name: teamA.name || "TBD", acronym: teamA.acronym || "", stats: teamAStats },
              team_b: { name: teamB.name || "TBD", acronym: teamB.acronym || "", stats: teamBStats },
              head_to_head: h2h,
              time_utc: m.start_time,
              tournament: m.tournament_name || "Unknown",
              best_of: m.number_of_games || 1,
              match_slug: `cs2-${slugify(teamA.name || "tbd")}-vs-${slugify(teamB.name || "tbd")}-${formatDateForSlug(m.start_time)}-${m.match_id}`,
            });
          }

          // Filter out empty tiers
          const nonEmptyTiers: Record<string, any[]> = {};
          for (const [tier, matches] of Object.entries(matchesByTier)) {
            if (matches.length > 0) {
              nonEmptyTiers[tier] = matches;
            }
          }

          const slateInput: SlateInput = {
            date: formatDateForSlug(targetDate.toISOString()),
            date_formatted: formatDateForDisplay(targetDate.toISOString()),
            fantasy_page_url: "/fantasy",
            matches_by_tier: nonEmptyTiers,
            total_match_count: slateMatches.length,
          };

          const prompt = SLATE_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(slateInput, null, 2));
          const content = await generateWithOpenAI(prompt, openAIApiKey);

          const expectedSlateSlug = `cs2-fantasy-slate-${formatDateForSlug(targetDate.toISOString())}`;
          if (!content.slug || content.slug !== expectedSlateSlug) {
            content.slug = expectedSlateSlug;
          }

          const validation = validateOutput(content, slateMatches.flatMap((m) => {
            const teamInfo = extractTeamInfo(m);
            return [teamInfo?.teamA?.name?.toLowerCase(), teamInfo?.teamB?.name?.toLowerCase()].filter(Boolean);
          }));

          if (!validation.valid) {
            console.warn(`Slate validation failed: ${validation.reason}`);
            results.errors.push(`Slate validation: ${validation.reason}`);
          } else {
            await upsertBlogPost(
              supabase, 
              content, 
              "CS2 Fantasy", 
              ["cs2", "fantasy", "daily-slate", formatDateForSlug(targetDate.toISOString())]
            );
            results.slates.push(content.slug);
          }
        } catch (e: any) {
          console.error("Error generating slate post:", e);
          results.errors.push(`Slate: ${e.message}`);
        }
      } else {
        console.log("No matches found for slate");
      }
    }

    // 3. TOURNAMENT HUB POSTS
    if (type === "all" || type === "tournaments") {
      console.log("Generating tournament hub posts...");
      
      const { data: tournamentMatches, error: tournamentError } = await supabase
        .from("pandascore_matches")
        .select("tournament_name, league_name, serie_name")
        .eq("esport_type", "Counter-Strike")
        .eq("status", "not_started")
        .gte("start_time", new Date().toISOString())
        .lte("start_time", thirtyDaysAhead.toISOString());

      if (tournamentError) {
        console.error("Error fetching tournaments:", tournamentError);
        results.errors.push(`Tournament fetch error: ${tournamentError.message}`);
      } else if (tournamentMatches) {
        const uniqueTournaments = new Map<string, { tournament_name: string; league_name: string; serie_name: string }>();
        for (const m of tournamentMatches) {
          const key = `${m.tournament_name}-${m.league_name}-${m.serie_name}`;
          if (!uniqueTournaments.has(key) && m.tournament_name) {
            uniqueTournaments.set(key, m);
          }
        }

        const tournamentsToProcess = tournamentName
          ? Array.from(uniqueTournaments.values()).filter((t) => t.tournament_name?.toLowerCase().includes(tournamentName.toLowerCase()))
          : Array.from(uniqueTournaments.values()).slice(0, 5);

        for (const tournament of tournamentsToProcess) {
          try {
            const { data: upcomingMatches } = await supabase
              .from("pandascore_matches")
              .select("*")
              .eq("esport_type", "Counter-Strike")
              .eq("tournament_name", tournament.tournament_name)
              .eq("status", "not_started")
              .gte("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(20);

            const { data: pastMatches } = await supabase
              .from("pandascore_matches")
              .select("*")
              .eq("esport_type", "Counter-Strike")
              .eq("tournament_name", tournament.tournament_name)
              .eq("status", "finished")
              .gte("start_time", thirtyDaysAgo.toISOString())
              .order("start_time", { ascending: false })
              .limit(10);

            const tier = classifyTier(tournament.tournament_name, tournament.league_name || "");

            const tournamentInput: TournamentInput = {
              tournament_name: tournament.tournament_name,
              tournament_slug: slugify(tournament.tournament_name),
              league_name: tournament.league_name || "",
              serie_name: tournament.serie_name || "",
              tier: tier,
              fantasy_page_url: "/fantasy",
              upcoming_matches: (upcomingMatches || []).map((m) => {
                const teamInfo = extractTeamInfo(m);
                return {
                  match_id: m.match_id,
                  team_a: teamInfo?.teamA?.name || "TBD",
                  team_b: teamInfo?.teamB?.name || "TBD",
                  date: formatDateForSlug(m.start_time),
                  match_slug: `cs2-${slugify(teamInfo?.teamA?.name || "tbd")}-vs-${slugify(teamInfo?.teamB?.name || "tbd")}-${formatDateForSlug(m.start_time)}-${m.match_id}`,
                };
              }),
              past_matches: (pastMatches || []).map((m) => {
                const teamInfo = extractTeamInfo(m);
                return {
                  match_id: m.match_id,
                  team_a: teamInfo?.teamA?.name || "TBD",
                  team_b: teamInfo?.teamB?.name || "TBD",
                  date: formatDateForSlug(m.start_time),
                  winner: m.winner_id ? (teamInfo?.teamA?.id === m.winner_id ? teamInfo?.teamA?.name : teamInfo?.teamB?.name) : undefined,
                  match_slug: `cs2-${slugify(teamInfo?.teamA?.name || "tbd")}-vs-${slugify(teamInfo?.teamB?.name || "tbd")}-${formatDateForSlug(m.start_time)}-${m.match_id}`,
                };
              }),
            };

            const prompt = TOURNAMENT_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(tournamentInput, null, 2));
            const content = await generateWithOpenAI(prompt, openAIApiKey);

            const expectedTournamentSlug = `cs2-fantasy-${slugify(tournament.tournament_name)}`;
            if (!content.slug || !content.slug.startsWith("cs2-fantasy-")) {
              content.slug = expectedTournamentSlug;
            }

            const validation = validateOutput(content, [tournament.tournament_name.toLowerCase()]);
            if (!validation.valid) {
              console.warn(`Tournament validation failed for ${tournament.tournament_name}: ${validation.reason}`);
              results.errors.push(`Tournament ${tournament.tournament_name}: ${validation.reason}`);
              continue;
            }

            await upsertBlogPost(
              supabase,
              content,
              "CS2 Fantasy",
              ["cs2", "fantasy", "tournament-hub", tier.toLowerCase(), slugify(tournament.tournament_name)]
            );
            results.tournaments.push(content.slug);
          } catch (e: any) {
            console.error(`Error generating tournament hub for ${tournament.tournament_name}:`, e);
            results.errors.push(`Tournament ${tournament.tournament_name}: ${e.message}`);
          }
        }
      }
    }

    console.log("Content generation complete:", results);

    return new Response(JSON.stringify({
      success: true,
      generated: {
        matches: results.matches.length,
        slates: results.slates.length,
        tournaments: results.tournaments.length,
      },
      slugs: results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in generate-cs2-content:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
