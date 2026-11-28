import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import maplibregl from 'maplibre-gl';
import { SPIKES } from '../data/spikes';
import type { SpikeDef } from '../data/spikes';
import { sfx } from '../audio/sfx';

/** Spikes only show once the camera is this close. */
export const SPIKE_MIN_ZOOM = 15.3;

/** Which spikes should be on the map: leg unlocked, not found yet, and the map zoomed in far enough. */
export function visibleSpikes(legs: readonly string[], found: readonly string[], zoom: number, defs: readonly SpikeDef[] = SPIKES): SpikeDef[] {
  if (zoom < SPIKE_MIN_ZOOM) return [];
  return defs.filter((s) => legs.includes(s.leg) && !found.includes(s.id));
}

const SVG = `<svg viewBox="0 0 32 40" width="26" height="32" aria-hidden="true" focusable="false">
  <defs><linearGradient id="spk-g" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".45" stop-color="#ffe27a"/><stop offset="1" stop-color="#c8921a"/></linearGradient></defs>
  <ellipse cx="16" cy="37" rx="9" ry="2.4" fill="rgba(0,0,0,.28)"/>
  <path d="M16 36 L12.5 21 H19.5 Z" fill="url(#spk-g)" stroke="#7a5a08" stroke-width="1" stroke-linejoin="round"/>
  <rect x="6" y="9" width="20" height="7" rx="3.2" fill="url(#spk-g)" stroke="#7a5a08" stroke-width="1"/>
  <rect x="11" y="15" width="10" height="7" rx="1.5" fill="url(#spk-g)" stroke="#7a5a08" stroke-width="1"/>
  <path d="M9 11.2 H15" stroke="#fffbe0" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>
  <path class="spk-star" d="M26 2 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#fffbe0"/>
</svg>`;

function buildEl(def: SpikeDef): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'spike';
  el.dataset.noPick = '1';
  el.setAttribute('data-testid', `spike-${def.id}`);
  el.setAttribute('aria-label', 'Golden spike - tap to collect');
  el.innerHTML = `<span class="spike-art">${SVG}</span>`;
  return el;
}

/**
 * Renders the hidden golden spikes as small DOM markers on `mapRef.current`.
 * Call it after the effect that creates the map. Markers are added/removed on zoom and when legs/found change.
 */
export function useSpikes(mapRef: RefObject<maplibregl.Map | null>, legs: string[], found: string[], onSpike: (id: string) => void, ready: boolean) {
  const markers = useRef(new Map<string, maplibregl.Marker>());
  const cb = useRef(onSpike);
  cb.current = onSpike;
  const legsRef = useRef(legs);
  legsRef.current = legs;
  const foundRef = useRef(found);
  foundRef.current = found;

  const sync = () => {
    const map = mapRef.current;
    if (!map) return;
    const want = new Map(visibleSpikes(legsRef.current, foundRef.current, map.getZoom()).map((s) => [s.id, s]));
    for (const [id, m] of markers.current) {
      if (!want.has(id)) { m.remove(); markers.current.delete(id); }
    }
    for (const [id, def] of want) {
      if (markers.current.has(id)) continue;
      const el = buildEl(def);
      const collect = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (el.classList.contains('collected')) return;
        sfx('coin');
        el.classList.add('collected');
        window.setTimeout(() => cb.current(id), 260);
      };
      el.addEventListener('click', collect);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') collect(e); });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      const m = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(def.lonLat).addTo(map);
      el.removeAttribute('role'); // Marker sets none on button, keep native semantics
      el.setAttribute('aria-label', `Golden spike: ${def.name} - press Enter to collect`);
      markers.current.set(id, m);
    }
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('zoomend', sync);
    map.on('zoom', sync);
    sync();
    const ms = markers.current;
    return () => {
      map.off('zoomend', sync);
      map.off('zoom', sync);
      for (const m of ms.values()) m.remove();
      ms.clear();
    };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(sync, [legs, found]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Tiny "Spikes 3/8" counter for the menu. Does not reveal where they are. */
export function SpikeCounter({ found }: { found: readonly string[] }) {
  const n = SPIKES.filter((s) => found.includes(s.id)).length;
  return (
    <span className="spike-counter" data-testid="spike-counter">
      <span aria-hidden="true">{'✦'}</span> Spikes {n}/{SPIKES.length}
    </span>
  );
}
