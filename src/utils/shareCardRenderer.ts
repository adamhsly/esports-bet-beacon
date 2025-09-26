// src/utils/shareCardRenderer.ts
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { getTeamLogoUrl, getPlaceholderLogo, preloadImage } from '@/lib/resolveLogoUrl';
import { getShareCardUrl } from './shareUrlHelper';
import { resolveAvatarFrameAsset } from './avatarFrames';
import { resolveAvatarBorderAsset } from './avatarBorders';
import { 
  proxifyAvatarUrl, 
  proxifyFrameAsset, 
  proxifyBorderAsset, 
  proxifyBadgeAssets,
  preloadAssetsSafely 
} from './assetProxyHelper';

interface ShareCardData {
  user: {
    username: string;
    avatar_url?: string;
    avatar_frame_asset?: string;
    avatar_border_asset?: string;
    level: number;
    xp: number;
    next_xp_threshold: number;
  };
  lineup: Array<{
    id: string;
    name: string;
    type: 'pro' | 'amateur';
    logo_url?: string;
    image_url?: string;
  }>;
  starTeamId?: string;
  roundName: string;
  roundId: string;
  badges: Array<{ asset_url: string }>;
}

interface ShareCardResult {
  publicUrl: string;
  blob: Blob;
}

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;

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

    console.log('Step 4: HTML rendered, waiting for images to load...');
    
    // Wait for all images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Step 5: Generating canvas with enhanced error handling...');

    // Generate image with enhanced error handling
    const canvas = await html2canvas(container, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      backgroundColor: '#1a1a1a',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      foreignObjectRendering: false,
      ignoreElements: (element) => {
        // Skip problematic elements
        return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
      },
      onclone: (clonedDoc) => {
        console.log('html2canvas cloning document...');
        // Ensure all images have crossOrigin set
        const images = clonedDoc.querySelectorAll('img');
        images.forEach(img => {
          if (img.src && !img.src.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
          }
        });
      }
    });

    console.log('Step 6: Canvas generated successfully, size:', canvas.width, 'x', canvas.height);

    // Convert to blob with better error handling
    console.log('Step 7: Converting canvas to blob...');
    const blob = await new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((b) => {
          if (b) {
            resolve(b);
          } else {
            reject(new Error('Canvas toBlob returned null - canvas may be tainted by cross-origin content'));
          }
        }, 'image/png', 1.0);
      } catch (error) {
        reject(new Error(`Canvas toBlob failed: ${error}`));
      }
    });
    console.log('Step 8: Blob created successfully, size:', blob.size, 'bytes');

    console.log('Step 9: Uploading to Supabase storage...');

    // Upload to Supabase Storage
    const fileName = `${roundId}/${userId}.png`;
    const { error: uploadError } = await supabase.storage
      .from('shares')
      .upload(fileName, blob, {
        upsert: true,
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('Step 9 FAILED - Upload error:', uploadError);
      throw new Error(`Failed to upload share card: ${uploadError.message}`);
    }

    console.log('Step 10: File uploaded successfully');

    // Generate custom domain URL instead of direct Supabase URL
    const customUrl = getShareCardUrl(roundId, userId, true);

    console.log('Step 11: Custom URL generated:', customUrl);
    console.log('=== Share Card Generation Completed Successfully ===');

    return { publicUrl: customUrl, blob };
  } catch (error) {
    console.error('=== Share Card Generation Failed ===');
    console.error('Error details:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    } catch {}
  }
}

async function fetchShareCardData(roundId: string, userId: string): Promise<ShareCardData> {
  console.log('Fetching share card data for roundId:', roundId, 'userId:', userId);

  // Fetch user profile and progress
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, avatar_url, avatar_frame_id, avatar_border_id')
    .eq('id', userId)
    .single();

  if (profileError) {
    throw new Error(`Failed to fetch user profile: ${profileError.message}`);
  }

  const { data: progress } = await supabase
    .from('user_progress')
    .select('level, xp')
    .eq('user_id', userId)
    .maybeSingle();

  // Fetch user's lineup for the round
  const { data: picks, error: picksError } = await supabase
    .from('fantasy_round_picks')
    .select('team_picks')
    .eq('round_id', roundId)
    .eq('user_id', userId)
    .maybeSingle();

  if (picksError) {
    throw new Error(`Failed to fetch lineup picks: ${picksError.message}`);
  }

  if (!picks?.team_picks) {
    throw new Error('No lineup found for this round');
  }

  // Enhance team picks with logos (resolver now proxies for canvas)
  const enhancedTeamPicks = await Promise.all(
    (picks.team_picks as any[]).map(async (team) => {
      console.log(`Resolving logo for: ${team.name} (ID: ${team.id}, Type: ${team.type})`);

      const safeLogo = await getTeamLogoUrl({
        supabase: supabase as any,
        teamType: team.type,
        teamId: team.id,
        teamName: team.name,
        forCanvas: true, // CORS-safe for html2canvas
      });

      if (safeLogo) {
        try {
          await preloadImage(safeLogo);
        } catch (e) {
          console.warn(`Failed to preload ${team.name} logo:`, e);
        }
        return {
          ...team,
          logo_url: safeLogo,
          image_url: safeLogo,
        };
      }

      const ph = getPlaceholderLogo(team.name);
      return {
        ...team,
        logo_url: ph,
        image_url: ph,
      };
    })
  );

  // Star team
  const { data: starTeam } = await supabase
    .from('fantasy_round_star_teams')
    .select('star_team_id')
    .eq('round_id', roundId)
    .eq('user_id', userId)
    .maybeSingle();

  // Round info
  const { data: round } = await supabase.from('fantasy_rounds').select('type').eq('id', roundId).maybeSingle();

  // User badges (recent 4)
  const { data: badges } = await supabase
    .from('user_rewards')
    .select('season_rewards(reward_value)')
    .eq('user_id', userId)
    .eq('unlocked', true)
    .order('unlocked_at', { ascending: false })
    .limit(4);

  // Resolve avatar frame and border assets with CORS-safe proxying
  const avatarFrameAsset = profile?.avatar_frame_id ? 
    proxifyFrameAsset(resolveAvatarFrameAsset(profile.avatar_frame_id), true) : undefined;
  const avatarBorderAsset = profile?.avatar_border_id ? 
    proxifyBorderAsset(resolveAvatarBorderAsset(profile.avatar_border_id), true) : undefined;

  // Proxy avatar URL for CORS safety if it exists
  const proxiedAvatarUrl = proxifyAvatarUrl(profile?.avatar_url, true);

  // Next XP threshold
  const next_xp_threshold = Math.pow((progress?.level ?? 1) + 1, 2) * 100;

  const roundName = round?.type ? `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round` : 'Fantasy Round';

  // Process badges with CORS-safe proxying
  const processedBadges = badges?.map((b) => ({ 
    asset_url: `/assets/rewards/${b.season_rewards?.reward_value}.png` 
  })) || [];
  const proxiedBadges = proxifyBadgeAssets(processedBadges, true);

  return {
    user: {
      username: profile?.username || 'Anonymous',
      avatar_url: proxiedAvatarUrl,
      avatar_frame_asset: avatarFrameAsset,
      avatar_border_asset: avatarBorderAsset,
      level: progress?.level || 1,
      xp: progress?.xp || 0,
      next_xp_threshold,
    },
    lineup: enhancedTeamPicks,
    starTeamId: starTeam?.star_team_id,
    roundName,
    roundId,
    badges: proxiedBadges,
  };
}

async function renderShareCardHTML(container: HTMLElement, data: ShareCardData) {
  // Collect all asset URLs for preloading
  const assetsToPreload = [
    '/assets/share-frame.png', // Background
    data.user.avatar_url,
    data.user.avatar_frame_asset,
    data.user.avatar_border_asset,
    ...data.badges.map(b => b.asset_url),
    ...data.lineup.map(team => team.image_url || team.logo_url).filter(Boolean)
  ].filter(Boolean) as string[];

  // Preload all assets safely
  console.log('Preloading assets for canvas rendering:', assetsToPreload.length, 'assets');
  await preloadAssetsSafely(assetsToPreload);

  const shareFrameUrl = '/assets/share-frame.png';
  container.innerHTML = `
    <div style="
      position: relative;
      width: ${FRAME_WIDTH}px;
      height: ${FRAME_HEIGHT}px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
      background-size: cover;
      background-position: center;
      color: #EAF2FF;
    ">
      <!-- User/Profile Header -->
      <div style="position: absolute; left: 72px; top: 160px; display: flex; align-items: center; gap: 24px;">
        <!-- Enhanced Avatar with Frame and Border -->
        <div style="position: relative; width: 120px; height: 120px;">
          <!-- Border (background layer) -->
          ${data.user.avatar_border_asset ? `
            <div style="
              position: absolute; top: 0; left: 0; width: 120px; height: 120px;
              background: url('${data.user.avatar_border_asset}');
              background-size: cover; background-position: center;
              z-index: 1;
            "></div>
          ` : ''}
          
          <!-- Avatar (middle layer) -->
          <div style="
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: ${data.user.avatar_border_asset ? '96px' : '120px'}; 
            height: ${data.user.avatar_border_asset ? '96px' : '120px'}; 
            border-radius: 50%;
            background: ${data.user.avatar_url ? `url('${data.user.avatar_url}')` : 'linear-gradient(135deg, #8B5CF6, #F97316)'};
            background-size: cover; background-position: center;
            border: ${data.user.avatar_border_asset ? 'none' : '4px solid #8B5CF6'};
            z-index: 2;
          "></div>
          
          <!-- Frame (top layer) -->
          ${data.user.avatar_frame_asset ? `
            <div style="
              position: absolute; top: 0; left: 0; width: 120px; height: 120px;
              background: url('${data.user.avatar_frame_asset}');
              background-size: cover; background-position: center;
              z-index: 3;
            "></div>
          ` : ''}
        </div>
        <div>
          <div style="font-size: 32px; font-weight: 800; margin-bottom: 8px;">${data.user.username}</div>
          <div style="font-size: 20px; color: #CFE3FF; margin-bottom: 12px;">Level ${data.user.level}</div>
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
            width: 56px; height: 56px;
            background: url('${badge.asset_url}');
            background-size: cover; background-position: center;
            border-radius: 8px;
          "></div>
        `).join('')}
      </div>

      <!-- Round title -->
      <div style="
        position: absolute; top: 480px; left: 0; width: 100%;
        text-align: center; font-weight: 800; font-size: 28px; letter-spacing: .4px;
        color: #EAF2FF;
        text-shadow: 0 2px 8px rgba(0,0,0,.35);
      ">
        ${data.roundName}
      </div>

      <!-- Team Lineup -->
      <div style="position: absolute; left: 72px; top: 540px;">
        <!-- First Row (3 teams) -->
        <div style="display: flex; gap: 72px; margin-bottom: 64px; justify-content: center;">
          ${data.lineup.slice(0, 3).map((team) =>
            renderTeamSlot(team, data.starTeamId === team.id)
          ).join('')}
        </div>

        <!-- Second Row (2 teams) -->
        <div style="display: flex; gap: 168px; justify-content: center;">
          ${data.lineup.slice(3, 5).map((team) =>
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
  const isAmateur = team.type === 'amateur';
  const borderColor = isAmateur ? '#F97316' : '#8B5CF6';
  const safeLogoUrl = team.image_url || team.logo_url || getPlaceholderLogo(team.name);

  // Only show top-left pill for amateur bonus (no PRO pill)
  const amateurBonusTag = isAmateur
    ? `
      <div style="
        position: absolute; top: 10px; left: 10px;
        display: inline-flex; align-items: center; justify-content: center;
        height: 20px; padding: 0 10px; border-radius: 9999px;
        background:#F97316; color:#fff;
        font-size: 11px; font-weight: 800; letter-spacing:.2px; line-height:1;
      ">
        +25% BONUS
      </div>
    `
    : '';

  const starTag = isStarred
    ? `<div style="position:absolute; top:10px; right:10px; font-size:24px; filter: drop-shadow(0 0 8px #F5C042);">⭐</div>`
    : '';

  const typeLabelColor = isAmateur ? '#F97316' : '#A78BFA';

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
      gap: 12px;
    ">
      ${amateurBonusTag}
      ${starTag}

      <div style="
        width: 120px;
        height: 120px;
        background: url('${safeLogoUrl}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        border-radius: 12px;
      "></div>

      <div style="
        font-size: 16px;
        font-weight: 700;
        color: #EAF2FF;
        text-align: center;
        max-width: 240px;
        padding: 0 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
        white-space: normal;
        line-height: 1.25;
        min-height: 40px; /* prevents clipping/cut-off */
      ">
        ${team.name}
      </div>

      <div style="
        margin-top: -6px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .4px;
        text-transform: uppercase;
        color: ${typeLabelColor};
      ">
        ${isAmateur ? 'Amateur' : 'Pro'}
      </div>
    </div>
  `;
}
