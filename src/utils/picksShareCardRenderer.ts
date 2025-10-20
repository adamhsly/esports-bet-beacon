// src/utils/picksShareCardRenderer.ts
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { getTeamLogoUrl, getPlaceholderLogo, preloadImage } from '@/lib/resolveLogoUrl';
import { proxifyAsset, proxifyAvatarUrl } from './assetProxyHelper'; // reuse your proxy helpers

type PickItem = {
  rank: number;
  team_id: string;
  team_name: string | null;
  team_type: 'pro' | 'amateur';
  price: number;
  score: number;
};

type PicksCardData = {
  roundId: string;
  roundName: string;
  dateLabel: string;
  picks: Array<{
    id: string;
    name: string;
    type: 'pro' | 'amateur';
    logo_url?: string;
    image_url?: string;
    score: number;
  }>;
};

type PicksCardResult = {
  publicUrl: string;
  blob: Blob;
};

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;

const ensureProxied = (u?: string | null) => {
  if (!u) return u as undefined;
  if (u.startsWith('data:') || u.startsWith('/assets/')) return u;
  if (u.includes('/functions/v1/public-image-proxy')) return u;

  if (/^https?:\/\//i.test(u)) {
    const base = (supabase as any).supabaseUrl ?? 'https://YOURPROJECT.supabase.co';
    const origin = new URL(base).origin;
    return `${origin}/functions/v1/public-image-proxy?url=${encodeURIComponent(u)}`;
  }
  return u;
};

// ---------- Public entry ----------
export async function renderPicksShareCard(roundId: string): Promise<PicksCardResult> {
  // Offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${FRAME_WIDTH}px`;
  container.style.height = `${FRAME_HEIGHT}px`;
  container.style.fontFamily = 'Inter, system-ui, sans-serif';
  container.setAttribute('data-share-root', 'true');
  document.body.appendChild(container);

  try {
    const data = await fetchPicksShareData(roundId);
    await renderPicksCardHTML(container, data);

    // Let images settle
    await new Promise(r => setTimeout(r, 800));

    const canvas = await html2canvas(container, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      backgroundColor: '#0f172a',
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      foreignObjectRendering: false,
      ignoreElements: (el) => el.tagName === 'SCRIPT' || el.tagName === 'STYLE',
      onclone: (doc) => {
        const root = doc.querySelector('[data-share-root="true"]') as HTMLElement | null;
        if (root) {
          const kids = Array.from(doc.body.children);
          for (const k of kids) if (k !== root) k.remove();
          doc.body.style.background = '#0f172a';
        }
      }
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))), 'image/png', 1.0);
    });

    const fileName = `fantasy-picks/${roundId}/${new Date().toISOString().slice(0,10)}.png`;
    const { error: uploadError } = await supabase.storage
      .from('shares')
      .upload(fileName, blob, { upsert: true, contentType: 'image/png' });
    if (uploadError) throw uploadError;

    const { data: pub } = supabase.storage.from('shares').getPublicUrl(fileName);
    return { publicUrl: pub?.publicUrl!, blob };
  } finally {
    try { container.parentNode && document.body.removeChild(container); } catch {}
  }
}

// ---------- Data ----------
async function fetchPicksShareData(roundId: string): Promise<PicksCardData> {
  // Round info
  const { data: round } = await supabase
    .from('fantasy_rounds')
    .select('id, type')
    .eq('id', roundId)
    .maybeSingle();

  const roundName = round?.type
    ? `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`
    : 'Fantasy Round';

  // Call your edge function
  const baseUrl = (supabase as any).supabaseUrl;
  const fnUrl = `${baseUrl}/functions/v1/fantasy-picks`;
  const edgeRes = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ round_id: roundId, n: 5, min_pro: 2, min_amateur: 2 })
  });
  if (!edgeRes.ok) {
    throw new Error(`fantasy-picks failed ${edgeRes.status}: ${await edgeRes.text()}`);
  }
  const { picks } = await edgeRes.json();

  // Resolve logos with your existing function + proxy + preload
  const resolved = await Promise.all(
    (picks as PickItem[]).map(async (p) => {
      const raw = await getTeamLogoUrl({
        supabase: supabase as any,
        teamType: p.team_type,
        teamId: p.team_id,
        teamName: p.team_name ?? p.team_id,
        forCanvas: true
      });
      const safeLogo = ensureProxied(raw) ?? getPlaceholderLogo(p.team_name ?? p.team_id);
      try { await preloadImage(safeLogo); } catch {}
      return {
        id: p.team_id,
        name: p.team_name ?? p.team_id,
        type: p.team_type,
        logo_url: safeLogo,
        image_url: safeLogo,
        score: p.score
      };
    })
  );

  const dateLabel = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    roundId,
    roundName,
    dateLabel,
    picks: resolved
  };
}

// ---------- HTML ----------
async function renderPicksCardHTML(container: HTMLElement, data: PicksCardData) {
  const assets = data.picks.map(t => t.image_url || t.logo_url).filter(Boolean) as string[];
  // Preload via your helper if you have a bulk variant; otherwise individual preloads already attempted above.

  container.innerHTML = `
    <div style="
      position: relative;
      width: ${FRAME_WIDTH}px;
      height: ${FRAME_HEIGHT}px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
      color: #EAF2FF;
      overflow: hidden;
    ">
      <!-- Title -->
      <div style="position:absolute; top:120px; left:0; width:100%; text-align:center;">
        <div style="font-size:44px; font-weight:900; letter-spacing:.4px;">Top 5 Fantasy Picks</div>
        <div style="margin-top:10px; font-size:26px; font-weight:700; color:#CFE3FF;">${data.roundName}</div>
        <div style="margin-top:4px; font-size:18px; font-weight:600; color:#9FB8FF;">${data.dateLabel}</div>
      </div>

      <!-- Grid -->
      <div style="position:absolute; top:320px; left:72px; right:72px;">
        <div style="display:flex; gap:72px; justify-content:center; margin-bottom:64px;">
          ${data.picks.slice(0,3).map((t, i) => renderPickSlot(t, i+1)).join('')}
        </div>
        <div style="display:flex; gap:168px; justify-content:center;">
          ${data.picks.slice(3,5).map((t, i) => renderPickSlot(t, i+4)).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div style="
        position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
        text-align:center; font-size:20px; font-weight:700; color:#EAF2FF;
      ">
        Play now at fragsandfortunes.com
      </div>
    </div>
  `;
}

function renderPickSlot(team: {name:string; type:'pro'|'amateur'; image_url?:string; logo_url?:string; score:number}, rank:number) {
  const isAm = team.type === 'amateur';
  const border = isAm ? '#F97316' : '#8B5CF6';
  const chip = isAm ? '#F97316' : '#A78BFA';
  const label = isAm ? 'Amateur' : 'Pro';
  const logo = team.image_url || team.logo_url || getPlaceholderLogo(team.name);

  return `
    <div style="
      position: relative;
      width: 264px;
      height: 264px;
      background: rgba(255,255,255,0.1);
      border: 3px solid ${border};
      border-radius: 24px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
    ">
      <div style="position:absolute; top:10px; left:10px; background:${chip}; color:#fff; font-size:11px; font-weight:800; letter-spacing:.2px; height:22px; padding:0 10px; border-radius:9999px; display:flex; align-items:center;">
        ${label}
      </div>
      <div style="position:absolute; top:10px; right:12px; color:#EAF2FF; font-weight:800;">#${rank}</div>

      <img 
        src="${logo}" 
        crossorigin="anonymous"
        style="width:120px; height:120px; object-fit:contain; border-radius:12px;"
      />

      <div style="
        font-size:16px; font-weight:800; color:#EAF2FF; text-align:center;
        max-width:240px; padding:0 8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.2; min-height:40px;
      ">
        ${team.name}
      </div>

      <div style="margin-top:-6px; font-size:12px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; color:${chip};">
        Score: ${team.score.toFixed(3)}
      </div>
    </div>
  `;
}
