import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';

interface ShareCardData {
  user: {
    username: string;
    avatar_url?: string;
    level: number;
    xp: number;
    next_xp_threshold: number;
  };
  lineup: Array<{
    id: string;
    name: string;
    type: 'pro' | 'amateur';
    logo_url?: string;
  }>;
  starTeamId?: string;
  roundName: string;
  roundId: string;
  badges: Array<{
    asset_url: string;
  }>;
}

interface ShareCardResult {
  publicUrl: string;
  blob: Blob;
}

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;

// CORS-safe image proxy for external logos (Faceit CDN etc.)
const SUPABASE_FUNCTIONS_BASE = 'https://zcjzeafelunqxmxzznos.supabase.co/functions/v1';
const IMAGE_PROXY_URL = `${SUPABASE_FUNCTIONS_BASE}/image-proxy`;
function corsSafeUrl(url?: string) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    const host = u.hostname;
    // Route external CDN URLs through proxy to avoid CORS issues
    if (host.endsWith('faceit-cdn.net') || 
        host.includes('faceit-cdn') || 
        host === 'cdn.pandascore.co' ||
        host.includes('sportdevs.com') ||
        host === 'raw.githubusercontent.com') {
      return `${IMAGE_PROXY_URL}?url=${encodeURIComponent(u.toString())}`;
    }
    return url;
  } catch {
    return url || '';
  }
}

export async function renderShareCard(
  roundId: string, 
  userId: string
): Promise<ShareCardResult> {
  console.log('=== Share Card Generation Started ===');
  console.log('Round ID:', roundId);
  console.log('User ID:', userId);

  // Create offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${FRAME_WIDTH}px`;
  container.style.height = `${FRAME_HEIGHT}px`;
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  document.body.appendChild(container);

  try {
    // Fetch data
    console.log('Step 1: Fetching share card data...');
    const shareData = await fetchShareCardData(roundId, userId);
    
    console.log('Step 2: Share data fetched successfully:', shareData);
    
    // Render share card
    console.log('Step 3: Rendering HTML...');
    await renderShareCardHTML(container, shareData);
    
    console.log('Step 4: HTML rendered, generating canvas...');
    
    // Generate image with error handling
    const canvas = await html2canvas(container, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      backgroundColor: '#1a1a1a',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: true, // Enable logging to see what's happening
      foreignObjectRendering: false, // Disable to avoid React conflicts
      proxy: IMAGE_PROXY_URL,
    });

    console.log('Step 5: Canvas generated successfully, size:', canvas.width, 'x', canvas.height);

    // Convert to blob
    console.log('Step 6: Converting canvas to blob...');
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('Step 7: Blob created successfully, size:', blob.size, 'bytes');
          resolve(blob);
        } else {
          reject(new Error('Failed to generate blob from canvas'));
        }
      }, 'image/png', 1.0);
    });

    console.log('Step 8: Uploading to Supabase storage...');

    // Upload to Supabase Storage
    const fileName = `${roundId}/${userId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('shares')
      .upload(fileName, blob, {
        upsert: true,
        contentType: 'image/png'
      });

    if (uploadError) {
      console.error('Step 8 FAILED - Upload error:', uploadError);
      throw new Error(`Failed to upload share card: ${uploadError.message}`);
    }

    console.log('Step 9: File uploaded successfully');

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shares')
      .getPublicUrl(fileName);

    console.log('Step 10: Public URL generated:', publicUrl);
    console.log('=== Share Card Generation Completed Successfully ===');

    return { publicUrl, blob };
    
  } catch (error) {
    console.error('=== Share Card Generation FAILED ===');
    console.error('Error details:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError);
    }
  }
}

async function fetchShareCardData(roundId: string, userId: string): Promise<ShareCardData> {
  console.log('Fetching share card data for roundId:', roundId, 'userId:', userId);
  
  // Fetch user profile and progress
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('level, xp')
    .eq('user_id', userId)
    .maybeSingle();

  if (progressError) {
    console.error('Progress fetch error:', progressError);
    // Don't throw, just use defaults
  }

  // Fetch user's lineup for the round
  const { data: picks, error: picksError } = await supabase
    .from('fantasy_round_picks')
    .select('team_picks')
    .eq('round_id', roundId)
    .eq('user_id', userId)
    .maybeSingle();

  if (picksError) {
    console.error('Picks fetch error:', picksError);
    throw new Error(`Failed to fetch lineup picks: ${picksError.message}`);
  }

  if (!picks || !picks.team_picks) {
    throw new Error('No lineup found for this round');
  }

  // Enhance team picks with logo data using the same approach as TeamPicker
  const enhancedTeamPicks = await Promise.all(
    (picks.team_picks as any[]).map(async (team) => {
      console.log(`Enhancing team data for: ${team.name} (ID: ${team.id}, Type: ${team.type})`);
      
      if (team.type === 'pro') {
        // For professional teams, fetch from pandascore_matches using the same logic as TeamPicker
        const { data: pandaMatches } = await supabase
          .from('pandascore_matches')
          .select('teams, esport_type')
          .gte('start_time', roundId) // Using roundId as a proxy, ideally we'd have round dates
          .not('teams', 'is', null)
          .limit(50); // Limit to avoid large queries

        if (pandaMatches) {
          for (const match of pandaMatches) {
             if (match.teams && Array.isArray(match.teams)) {
               for (const teamObj of match.teams as any[]) {
                 if (teamObj.type === 'Team' && teamObj.opponent) {
                   const opponent = teamObj.opponent;
                   if (String(opponent.id) === team.id || opponent.slug === team.id) {
                     console.log(`Found pro team logo for ${team.name}:`, opponent.image_url);
                     return {
                       ...team,
                       logo_url: opponent.image_url,
                       slug: opponent.slug
                     };
                   }
                 }
               }
             }
          }
        }
      } else if (team.type === 'amateur') {
        // For amateur teams, fetch from FACEIT database using the same logic as TeamPicker
        const { data: faceitTeam } = await supabase
          .rpc('get_all_faceit_teams')
          .then((res: any) => {
            if (res.data) {
              const found = res.data.find((t: any) => t.team_id === team.id);
              return { data: found };
            }
            return { data: null };
          });

        if (faceitTeam) {
          console.log(`Found amateur team logo for ${team.name}:`, faceitTeam.logo_url);
          return {
            ...team,
            logo_url: faceitTeam.logo_url
          };
        }
      }
      
      console.log(`No enhanced data found for ${team.name}, using original`);
      return team;
    })
  );

  // Fetch star team
  const { data: starTeam, error: starTeamError } = await supabase
    .from('fantasy_round_star_teams')
    .select('star_team_id')
    .eq('round_id', roundId)
    .eq('user_id', userId)
    .maybeSingle();

  if (starTeamError) {
    console.error('Star team fetch error:', starTeamError);
  }

  // Fetch round info
  const { data: round, error: roundError } = await supabase
    .from('fantasy_rounds')
    .select('type')
    .eq('id', roundId)
    .maybeSingle();

  if (roundError) {
    console.error('Round fetch error:', roundError);
    // Don't throw, use default
  }

  // Fetch user badges (recent 4)
  const { data: badges } = await supabase
    .from('user_rewards')
    .select('season_rewards(reward_value)')
    .eq('user_id', userId)
    .eq('unlocked', true)
    .order('unlocked_at', { ascending: false })
    .limit(4);

  // Calculate next XP threshold (simple calculation)
  const nextXpThreshold = Math.pow(progress?.level + 1 || 2, 2) * 100;

  const roundName = round?.type ? `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round` : 'Fantasy Round';

  return {
    user: {
      username: profile?.username || 'Anonymous',
      avatar_url: undefined,
      level: progress?.level || 1,
      xp: progress?.xp || 0,
      next_xp_threshold: nextXpThreshold,
    },
    lineup: enhancedTeamPicks,
    starTeamId: starTeam?.star_team_id,
    roundName,
    roundId,
    badges: badges?.map(b => ({ asset_url: `/assets/rewards/${b.season_rewards?.reward_value}.png` })) || [],
  };
}

async function renderShareCardHTML(container: HTMLElement, data: ShareCardData) {
  container.innerHTML = `
    <div style="
      position: relative;
      width: ${FRAME_WIDTH}px;
      height: ${FRAME_HEIGHT}px;
      background-image: url('/assets/share-frame.png');
      background-size: cover;
      background-position: center;
      color: #EAF2FF;
    ">
      <!-- User Profile Section -->
      <div style="position: absolute; left: 72px; top: 160px; display: flex; align-items: center; gap: 24px;">
        <!-- Avatar -->
        <div style="
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: ${data.user.avatar_url ? `url('${data.user.avatar_url}')` : 'linear-gradient(135deg, #8B5CF6, #F97316)'};
          background-size: cover;
          background-position: center;
          border: 4px solid #8B5CF6;
        "></div>
        
        <!-- User Info -->
        <div>
          <div style="font-size: 32px; font-weight: bold; color: #EAF2FF; margin-bottom: 8px;">
            ${data.user.username}
          </div>
          <div style="font-size: 20px; color: #CFE3FF; margin-bottom: 12px;">
            Level ${data.user.level}
          </div>
          <!-- XP Progress Bar -->
          <div style="width: 610px; height: 14px; background: rgba(255,255,255,0.2); border-radius: 7px; overflow: hidden;">
            <div style="
              width: ${Math.min(100, (data.user.xp / data.user.next_xp_threshold) * 100)}%;
              height: 100%;
              background: linear-gradient(90deg, #8B5CF6, #F5C042);
            "></div>
          </div>
          <div style="font-size: 14px; color: #CFE3FF; margin-top: 4px;">
            ${data.user.xp} / ${data.user.next_xp_threshold} XP
          </div>
        </div>
      </div>

      <!-- Badges -->
      <div style="position: absolute; left: 72px; top: 410px; display: flex; gap: 16px;">
        ${data.badges.slice(0, 4).map(badge => `
          <div style="
            width: 56px;
            height: 56px;
            background: url('${badge.asset_url}');
            background-size: cover;
            background-position: center;
            border-radius: 8px;
          "></div>
        `).join('')}
      </div>

      <!-- Team Lineup -->
      <div style="position: absolute; left: 72px; top: 540px;">
        <!-- First Row (3 teams) -->
        <div style="display: flex; gap: 72px; margin-bottom: 64px; justify-content: center;">
          ${data.lineup.slice(0, 3).map((team, index) => 
            renderTeamSlot(team, data.starTeamId === team.id)
          ).join('')}
        </div>
        
        <!-- Second Row (2 teams) -->
        <div style="display: flex; gap: 168px; justify-content: center;">
          ${data.lineup.slice(3, 5).map((team, index) => 
            renderTeamSlot(team, data.starTeamId === team.id)
          ).join('')}
        </div>
      </div>

      <!-- Footer CTA -->
      <div style="
        position: absolute;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        font-size: 20px;
        color: #EAF2FF;
        font-weight: 600;
      ">
        Think you can beat me? Join the ${data.roundName} at fragsandfortunes.com
      </div>
    </div>
  `;
}

function renderTeamSlot(team: any, isStarred: boolean) {
  const borderColor = team.type === 'pro' ? '#8B5CF6' : '#F97316';
  const logoUrl = getEnhancedTeamLogoUrl(team);
  const safeLogoUrl = corsSafeUrl(logoUrl);
  
  return `
    <div style="
      position: relative;
      width: 264px;
      height: 264px;
      background: rgba(255,255,255,0.1);
      border: 3px solid ${borderColor};
      border-radius: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    ">
      <!-- Amateur Bonus Badge -->
      ${team.type === 'amateur' ? `
        <div style="
          position: absolute;
          top: 8px;
          left: 8px;
          background: #F97316;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 4px 8px;
          border-radius: 12px;
        ">
          +25% BONUS
        </div>
      ` : ''}
      
      <!-- Star Badge -->
      ${isStarred ? `
        <div style="
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 24px;
          filter: drop-shadow(0 0 8px #F5C042);
        ">
          ⭐
        </div>
      ` : ''}
      
      <!-- Team Logo -->
      <div style="
        width: 120px;
        height: 120px;
        background: url('${safeLogoUrl}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        border-radius: 12px;
      "></div>
      
      <!-- Team Name -->
      <div style="
        font-size: 16px;
        font-weight: 600;
        color: #EAF2FF;
        text-align: center;
        max-width: 240px;
        line-height: 1.2;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        padding: 0 8px;
        word-break: break-word;
      ">
        ${team.name}
      </div>
    </div>
  `;
}