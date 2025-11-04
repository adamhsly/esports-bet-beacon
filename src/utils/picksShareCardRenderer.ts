// src/utils/picksShareCardRenderer.ts
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { getTeamLogoUrl, preloadImage } from '@/lib/resolveLogoUrl';

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
  publicUrl: string; // pretty URL (/api/share/<roundId>/<userId>.png)
  blob: Blob;
};

const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1350;
const PLACEHOLDER = '/placeholder-image.png';

// Ensure remote assets are same-origin via your public image proxy
const ensureProxied = (u?: string | null) => {
  if (!u) return undefined;
  if (u.startsWith('data:') || u.startsWith('/assets/') || u.startsWith('/')) return u;
  if (u.includes('/functions/v1/public-image-proxy')) return u;
  if (/^https?:\/\//i.test(u)) {
    const base = (supabase as any).supabaseUrl ?? 'https://YOURPROJECT.supabase.co';
    const origin = new URL(base).origin;
    return `${origin}/functions/v1/public-image-proxy?url=${encodeURIComponent(u)}`;
  }
  return u;
};

async function waitForAllImages(urls: string[]) {
  await Promise.all(
    urls.map(u => new Promise<void>((res) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => res();
      img.onerror = () => res(); // don't block on failures
      img.src = u;
    }))
  );
}

export async function renderPicksShareCard(roundId: string, userId: string): Promise<PicksCardResult> {
  // Offscreen container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${FRAME_WIDTH}px`;
  container.style.height = `${FRAME_HEIGHT}px`;
  container.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif';
  container.setAttribute('data-share-root', 'true');
  document.body.appendChild(container);

  try {
    const data = await fetchPicksShareData(roundId);
    await renderPicksCardHTML(container, data);

    // Deterministic preloading (faster + avoids arbitrary sleep)
    const assetUrls = data.picks.map(t => (t.image_url || t.logo_url || PLACEHOLDER)).filter(Boolean) as string[];
    await waitForAllImages(assetUrls);

    const canvas = await html2canvas(container, {
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      backgroundColor: '#0f172a',
      scale: 1,
      useCORS: true,
      foreignObjectRendering: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        const root = doc.querySelector('[data-share-root="true"]') as HTMLElement | null;
        if (root) {
          Array.from(doc.body.children).forEach(k => { if (k !== root) k.remove(); });
          doc.body.style.background = '#0f172a';
        }
      }
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))), 'image/png', 1.0);
    });

    // IMPORTANT: save exactly where your public URL lives:
    // shares/<roundId>/<userId>.png   (no "fantasy-picks" segment)
    const fileName = `${roundId}/${userId}.png`;

    const { error: uploadError } = await supabase.storage
      .from('shares')
      .upload(fileName, blob, { upsert: true, contentType: 'image/png' });
    if (uploadError) throw uploadError;

    // Return pretty Cloudflare route (it will redirect to the public Storage URL)
    const prettyUrl = `/api/share/${roundId}/${userId}.png`;
    return { publicUrl: prettyUrl, blob };
  } finally {
    try { container.parentNode && document.body.removeChild(container); } catch {}
  }
}

// ---------- Data ----------
async function fetchPicksShareData(roundId: string): Promise<PicksCardData> {
  const { data: round } = await supabase
    .from('fantasy_rounds')
    .select('id, type')
    .eq('id', roundId)
    .maybeSingle();

  const roundName = round?.type
    ? `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`
    : 'Fantasy Round';

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

  const resolved = await Promise.all(
    (picks as PickItem[]).map(async (p) => {
      const raw = await getTeamLogoUrl({
        supabase: supabase as any,
        teamType: p.team_type,
        teamId: p.team_id,
        teamName: p.team_name ?? p.team_id,
        forCanvas: true
      });
      const safeLogo = ensureProxied(raw) ?? PLACEHOLDER;
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

  return { roundId, roundName, dateLabel, picks: resolved };
}

// ---------- HTML ----------
async function renderPicksCardHTML(container: HTMLElement, data: PicksCardData) {
  container.innerHTML = `
    <div style="
      position: relative; width: ${FRAME_WIDTH}px; height: ${FRAME_HEIGHT}px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f172a 100%);
      color: #EAF2FF; overflow: hidden;
    ">
      <!-- Logo -->
      <div style="position: absolute; right: 72px; top: 60px;">
        <img src="/lovable-uploads/frags_and_fortunes_transparent.png" crossorigin="anonymous"
             style="width: 140px; height: auto; object-fit: contain; opacity: 0.95;" />
      </div>

      <!-- Centered Title Area -->
      <div style="
        position:absolute; left:0; right:0; top:210px;
        text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;
      ">
        <div style="
          font-size:64px; font-weight:900; letter-spacing:.4px;
          background: linear-gradient(90deg, #6CC0FF 0%, #B38CFF 100%);
          -webkit-background-clip:text; background-clip:text; color: transparent;
        ">
          ${data.roundName}
        </div>
        <div style="font-size:28px; font-weight:800; color:#CFE3FF;">Top 5 Fantasy Picks</div>
        <div style="font-size:18px; font-weight:700; color:#9FB8FF;">${data.dateLabel}</div>
      </div>

      <!-- Grid -->
      <div style="position:absolute; top:420px; left:72px; right:72px;">
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
        text-align:center; font-size:20px; font-weight:800; color:#EAF2FF;
      ">
        Play now at fragsandfortunes.com
      </div>
    </div>
  `;
}

function renderPickSlot(
  team: { name: string; type: 'pro'|'amateur'; image_url?: string; logo_url?: string; score: number; },
  rank: number
) {
  const isAm = team.type === 'amateur';
  const border = isAm ? '#F97316' : '#8B5CF6';
  const chip  = isAm ? '#F97316' : '#A78BFA';
  const label = isAm ? '+25% BONUS' : 'PRO';
  const logo  = team.image_url || team.logo_url || PLACEHOLDER;

  return `
    <div style="
      position: relative; width: 264px; height: 264px;
      background: rgba(255,255,255,0.08); border: 3px solid ${border};
      border-radius: 24px; display:flex; flex-direction:column; align-items:center;
      justify-content:center; gap:12px; overflow:hidden;
    ">
      <div style="
        position:absolute; top:12px; left:12px; background:${chip}; color:#fff;
        font-size:12px; font-weight:900; letter-spacing:.2px;
        height:24px; line-height:24px; padding:0 12px; border-radius:9999px;
        white-space:nowrap; user-select:none; transform: translateY(-1px);
      ">${label}</div>

      <div style="position:absolute; top:12px; right:14px; color:#EAF2FF; font-weight:900;">#${rank}</div>

      <img src="${logo}" crossorigin="anonymous" decoding="async" loading="eager"
           style="width:120px; height:120px; object-fit:contain; border-radius:12px;" />

      <div style="
        font-size:16px; font-weight:900; color:#EAF2FF; text-align:center;
        max-width:240px; padding:0 8px; display:-webkit-box; -webkit-line-clamp:2;
        -webkit-box-orient:vertical; overflow:hidden; line-height:1.2; min-height:40px;
      ">
        ${team.name}
      </div>

      <div style="margin-top:-6px; font-size:12px; font-weight:900; letter-spacing:.4px; text-transform:uppercase; color:${chip};">
        Score: ${team.score.toFixed(3)}
      </div>
    </div>
  `;
}
