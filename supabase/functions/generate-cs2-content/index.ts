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

interface MatchInput {
  match_id: string;
  team_a_name: string;
  team_a_acronym: string;
  team_b_name: string;
  team_b_acronym: string;
  start_time_utc: string;
  tournament_name: string;
  league_name: string;
  serie_name: string;
  best_of: number;
  match_page_url: string;
}

interface SlateInput {
  date: string;
  matches: Array<{
    match_id: string;
    team_a: string;
    team_b: string;
    time_utc: string;
    tournament: string;
    best_of: number;
    tier: string;
    match_slug: string;
  }>;
}

interface TournamentInput {
  tournament_name: string;
  league_name: string;
  serie_name: string;
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
    match_slug: string;
  }>;
}

// Tier classification based on tournament/league
function classifyTier(tournamentName: string, leagueName: string): string {
  const name = `${tournamentName} ${leagueName}`.toLowerCase();
  if (name.includes("major") || name.includes("blast premier") || name.includes("esl pro league") || name.includes("iem")) {
    return "S";
  }
  if (name.includes("esl challenger") || name.includes("roobet cup") || name.includes("betboom")) {
    return "A";
  }
  if (name.includes("cct") || name.includes("esea") || name.includes("thunderpick")) {
    return "B";
  }
  if (name.includes("open") || name.includes("qualifier")) {
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

// Extract team info from match
function extractTeamInfo(match: Match): { teamA: any; teamB: any } | null {
  if (!match.teams || match.teams.length < 2) return null;
  
  const teamA = match.teams[0]?.opponent || match.teams[0];
  const teamB = match.teams[1]?.opponent || match.teams[1];
  
  return { teamA, teamB };
}

// Prompt templates
const MATCH_PROMPT_TEMPLATE = `You are an expert CS2 fantasy esports content writer. Generate SEO-optimized content for a specific match.

INPUT DATA (use ONLY this data, do not fabricate anything):
{input_json}

REQUIREMENTS:
1. Title: Include both team names, tournament name, and date. Max 60 chars ideally.
2. Meta title: Must be ≤60 characters, include main keyword
3. Meta description: Must be ≤155 characters, compelling CTA
4. Content must include:
   - Match info block with time in Europe/London timezone
   - Fantasy angle (team-level, role-level picks since we have no player data)
   - Quick picks section: "Safe Pick" and "Upside Pick" at team level
   - Risk notes (generic unless DB provides specifics)
   - CTAs linking to: /fantasy, the match page URL provided, and tournament hub
   - FAQ section with 3-5 long-tail queries
   - "Last updated" timestamp at the bottom

CRITICAL RULES:
- Do NOT mention specific player names, stats, ratings, or roster news - we have no player data
- Do NOT fabricate odds, map vetoes, or historical stats
- Do NOT include gambling encouragement
- Keep picks at team/role-level and opinion-based
- Be conversion-oriented with esports-native tone
- Include the match_page_url from input in CTAs

OUTPUT: Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "slug": "string (use format: cs2-{team-a-slug}-vs-{team-b-slug}-{YYYY-MM-DD}-{shortid})",
  "meta_title": "string (max 60 chars)",
  "meta_description": "string (max 155 chars)",
  "content_markdown": "string (full article in markdown)"
}`;

const SLATE_PROMPT_TEMPLATE = `You are an expert CS2 fantasy esports content writer. Generate SEO-optimized daily slate content.

INPUT DATA (use ONLY this data, do not fabricate anything):
{input_json}

REQUIREMENTS:
1. Title: "CS2 Fantasy Slate for {Date} – Daily Picks & Draft Guide"
2. Meta title: Must be ≤60 characters
3. Meta description: Must be ≤155 characters
4. Content must include:
   - Introduction to the day's CS2 matches
   - Matches grouped by tier (S/A/B/C/D) with brief descriptions
   - Link to each match post using the match_slug provided
   - Quick picks per tier (generic, team-level only)
   - Draft close time reminders
   - Strong CTAs to /fantasy page

CRITICAL RULES:
- Do NOT fabricate player names, stats, or roster info
- Keep all picks at team-level
- Do NOT include gambling encouragement
- Esports-native, conversion-focused tone

OUTPUT: Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "slug": "string (use format: cs2-fantasy-slate-{YYYY-MM-DD})",
  "meta_title": "string (max 60 chars)",
  "meta_description": "string (max 155 chars)",
  "content_markdown": "string (full article in markdown)"
}`;

const TOURNAMENT_PROMPT_TEMPLATE = `You are an expert CS2 fantasy esports content writer. Generate SEO-optimized tournament hub content.

INPUT DATA (use ONLY this data, do not fabricate anything):
{input_json}

REQUIREMENTS:
1. Title: "{Tournament Name} CS2 Fantasy Hub – Picks, Schedule & Guide"
2. Meta title: Must be ≤60 characters
3. Meta description: Must be ≤155 characters
4. Content must include:
   - Short intro about the tournament
   - "How to Play" section linking to /fantasy
   - Upcoming matches section with links to match posts
   - Past matches section with links (if any)
   - CTA to join fantasy

CRITICAL RULES:
- Do NOT fabricate prize pools, team rosters, or stats
- Only reference information provided in the input
- Esports-native, conversion-focused tone

OUTPUT: Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "slug": "string (use format: cs2-fantasy-{tournament-slug})",
  "meta_title": "string (max 60 chars)",
  "meta_description": "string (max 155 chars)",
  "content_markdown": "string (full article in markdown)"
}`;

// Validation: Check if output contains entities not in input
function validateOutput(output: GeneratedContent, allowedEntities: string[]): { valid: boolean; reason?: string } {
  const content = `${output.title} ${output.meta_title} ${output.meta_description} ${output.content_markdown}`.toLowerCase();
  
  // Check for common hallucination patterns
  const hallucinations = [
    /\$[\d,]+\s*(prize|pool)/i, // Prize pools we didn't provide
    /\d+\.\d+\s*rating/i, // Player ratings
    /K\/D\s*ratio/i, // K/D ratios
    /odds\s*of\s*\d/i, // Betting odds
    /map veto/i, // Map vetoes we can't know
  ];
  
  for (const pattern of hallucinations) {
    if (pattern.test(content)) {
      return { valid: false, reason: `Content contains potentially fabricated data matching pattern: ${pattern}` };
    }
  }
  
  // Validate meta lengths
  if (output.meta_title.length > 60) {
    return { valid: false, reason: `Meta title exceeds 60 chars: ${output.meta_title.length}` };
  }
  if (output.meta_description.length > 155) {
    return { valid: false, reason: `Meta description exceeds 155 chars: ${output.meta_description.length}` };
  }
  
  return { valid: true };
}

// Call OpenAI API
async function generateWithOpenAI(prompt: string, apiKey: string): Promise<GeneratedContent> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert esports content writer. You ONLY output valid JSON, nothing else." },
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

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  if (content.includes("```json")) {
    jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  } else if (content.includes("```")) {
    jsonStr = content.replace(/```\n?/g, "");
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to parse JSON:", jsonStr);
    throw new Error("Failed to parse OpenAI response as JSON");
  }
}

// Upsert blog post
async function upsertBlogPost(
  supabase: any,
  content: GeneratedContent,
  category: string,
  tags: string[],
  matchId?: string
): Promise<void> {
  const now = new Date().toISOString();
  
  // Check if post exists
  const { data: existing } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", content.slug)
    .single();

  if (existing) {
    // Update existing post
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
    // Insert new post
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

    const results = {
      matches: [] as string[],
      slates: [] as string[],
      tournaments: [] as string[],
      errors: [] as string[],
    };

    // Determine date range
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    // For tournament hubs, look at a wider range
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

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
        for (const match of matches) {
          try {
            const teamInfo = extractTeamInfo(match);
            if (!teamInfo) {
              console.log(`Skipping match ${match.match_id}: no team info`);
              continue;
            }

            const { teamA, teamB } = teamInfo;
            const matchDate = formatDateForSlug(match.start_time);
            const shortId = generateShortId();

            const matchInput: MatchInput = {
              match_id: match.match_id,
              team_a_name: teamA.name || "Team A",
              team_a_acronym: teamA.acronym || "",
              team_b_name: teamB.name || "Team B",
              team_b_acronym: teamB.acronym || "",
              start_time_utc: match.start_time,
              tournament_name: match.tournament_name || "Unknown Tournament",
              league_name: match.league_name || "",
              serie_name: match.serie_name || "",
              best_of: match.number_of_games || 1,
              match_page_url: `/matches/pandascore/${match.match_id}`,
            };

            const expectedSlug = `cs2-${slugify(teamA.name || "team-a")}-vs-${slugify(teamB.name || "team-b")}-${matchDate}-${shortId}`;
            const allowedEntities = [
              teamA.name?.toLowerCase(),
              teamB.name?.toLowerCase(),
              teamA.acronym?.toLowerCase(),
              teamB.acronym?.toLowerCase(),
              match.tournament_name?.toLowerCase(),
            ].filter(Boolean);

            const prompt = MATCH_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(matchInput, null, 2));
            const content = await generateWithOpenAI(prompt, openAIApiKey);

            // Ensure slug follows our format
            if (!content.slug || !content.slug.startsWith("cs2-")) {
              content.slug = expectedSlug;
            }

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
              ["cs2", "fantasy", "match-preview", slugify(teamA.name || ""), slugify(teamB.name || "")],
              match.match_id
            );
            results.matches.push(content.slug);
          } catch (e) {
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
          const slateInput: SlateInput = {
            date: formatDateForSlug(targetDate.toISOString()),
            matches: slateMatches.map((m) => {
              const teamInfo = extractTeamInfo(m);
              const teamA = teamInfo?.teamA;
              const teamB = teamInfo?.teamB;
              return {
                match_id: m.match_id,
                team_a: teamA?.name || "TBD",
                team_b: teamB?.name || "TBD",
                time_utc: m.start_time,
                tournament: m.tournament_name || "Unknown",
                best_of: m.number_of_games || 1,
                tier: classifyTier(m.tournament_name || "", m.league_name || ""),
                match_slug: `cs2-${slugify(teamA?.name || "tbd")}-vs-${slugify(teamB?.name || "tbd")}-${formatDateForSlug(m.start_time)}`,
              };
            }),
          };

          const prompt = SLATE_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(slateInput, null, 2));
          const content = await generateWithOpenAI(prompt, openAIApiKey);

          // Ensure slug follows format
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
            await upsertBlogPost(supabase, content, "CS2 Fantasy", ["cs2", "fantasy", "daily-slate", formatDateForSlug(targetDate.toISOString())]);
            results.slates.push(content.slug);
          }
        } catch (e) {
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
      
      // Get unique tournaments with upcoming matches
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
        // Get unique tournaments
        const uniqueTournaments = new Map<string, { tournament_name: string; league_name: string; serie_name: string }>();
        for (const m of tournamentMatches) {
          const key = `${m.tournament_name}-${m.league_name}-${m.serie_name}`;
          if (!uniqueTournaments.has(key) && m.tournament_name) {
            uniqueTournaments.set(key, m);
          }
        }

        // Filter by specific tournament if provided
        const tournamentsToProcess = tournamentName
          ? Array.from(uniqueTournaments.values()).filter((t) => t.tournament_name?.toLowerCase().includes(tournamentName.toLowerCase()))
          : Array.from(uniqueTournaments.values()).slice(0, 5); // Limit to 5 tournaments per run

        for (const tournament of tournamentsToProcess) {
          try {
            // Get upcoming matches for this tournament
            const { data: upcomingMatches } = await supabase
              .from("pandascore_matches")
              .select("*")
              .eq("esport_type", "Counter-Strike")
              .eq("tournament_name", tournament.tournament_name)
              .eq("status", "not_started")
              .gte("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(20);

            // Get past matches for this tournament
            const { data: pastMatches } = await supabase
              .from("pandascore_matches")
              .select("*")
              .eq("esport_type", "Counter-Strike")
              .eq("tournament_name", tournament.tournament_name)
              .eq("status", "finished")
              .gte("start_time", thirtyDaysAgo.toISOString())
              .order("start_time", { descending: true })
              .limit(10);

            const tournamentInput: TournamentInput = {
              tournament_name: tournament.tournament_name,
              league_name: tournament.league_name || "",
              serie_name: tournament.serie_name || "",
              upcoming_matches: (upcomingMatches || []).map((m) => {
                const teamInfo = extractTeamInfo(m);
                return {
                  match_id: m.match_id,
                  team_a: teamInfo?.teamA?.name || "TBD",
                  team_b: teamInfo?.teamB?.name || "TBD",
                  date: formatDateForSlug(m.start_time),
                  match_slug: `cs2-${slugify(teamInfo?.teamA?.name || "tbd")}-vs-${slugify(teamInfo?.teamB?.name || "tbd")}-${formatDateForSlug(m.start_time)}`,
                };
              }),
              past_matches: (pastMatches || []).map((m) => {
                const teamInfo = extractTeamInfo(m);
                return {
                  match_id: m.match_id,
                  team_a: teamInfo?.teamA?.name || "TBD",
                  team_b: teamInfo?.teamB?.name || "TBD",
                  date: formatDateForSlug(m.start_time),
                  match_slug: `cs2-${slugify(teamInfo?.teamA?.name || "tbd")}-vs-${slugify(teamInfo?.teamB?.name || "tbd")}-${formatDateForSlug(m.start_time)}`,
                };
              }),
            };

            const prompt = TOURNAMENT_PROMPT_TEMPLATE.replace("{input_json}", JSON.stringify(tournamentInput, null, 2));
            const content = await generateWithOpenAI(prompt, openAIApiKey);

            // Ensure slug follows format
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
              ["cs2", "fantasy", "tournament-hub", slugify(tournament.tournament_name)]
            );
            results.tournaments.push(content.slug);
          } catch (e) {
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
  } catch (error) {
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
