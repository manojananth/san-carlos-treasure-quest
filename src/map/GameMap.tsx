import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import routesJson from '../data/routes.json';
import { STOPS } from '../data/stops';
import type { LonLat } from '../data/stops';
import { STYLE_URL, addTerrain, addTrailLayers, tidyBaseMap } from './style';
import { Explorer, prefersReducedMotion } from './explorer';
import { cumulative } from './geo';

type Leg = { from: string; to: string; coords: LonLat[]; lengthM: number };
const ROUTES = routesJson as unknown as GeoJSON.FeatureCollection<GeoJSON.LineString>;
const LEGS: Leg[] = ROUTES.features.map((f) => ({
  from: f.properties?.from, to: f.properties?.to, lengthM: f.properties?.lengthM, coords: f.geometry.coordinates as LonLat[],
}));
const legBetween = (a: string, b: string) => LEGS.find((l) => l.from === a && l.to === b);

/** Bounds of every stop: the initial and reset camera frames all of them (padding clears the top bar and panel). */
const STOP_LONS = STOPS.map((s) => s.lonLat[0]);
const STOP_LATS = STOPS.map((s) => s.lonLat[1]);
const STOP_BOUNDS: [LonLat, LonLat] = [
  [Math.min(...STOP_LONS), Math.min(...STOP_LATS)],
  [Math.max(...STOP_LONS), Math.max(...STOP_LATS)],
];
const FIT_OPTIONS: maplibregl.FitBoundsOptions = {
  padding: { top: 90, bottom: 190, left: 40, right: 40 },
  pitch: 60,
  bearing: -20,
};

export type MarkerState = 'locked' | 'unlocked' | 'current' | 'done';

export interface GameMapHandle {
  /**
   * Walk the explorer from stop index `from` to `to` (consecutive stops).
   * Resolves true when the leg completed, false when it was interrupted by reset (or could not start).
   */
  walk(from: number, to: number): Promise<boolean>;
  /** Put explorer at stop `index` and reset camera + done trail to the stops before it. */
  reset(index: number): void;
}
interface Props {
  states: MarkerState[];
  onReady: () => void;
}

/** Wait for the next 'moveend' (or a timeout, in case no move was needed). */
function moveEnd(map: maplibregl.Map, ms: number): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      window.clearTimeout(timer);
      map.off('moveend', done);
      resolve();
    };
    timer = window.setTimeout(done, ms);
    map.on('moveend', done);
  });
}

function buildMarkerEl(i: number): HTMLDivElement {
  const s = STOPS[i];
  const el = document.createElement('div');
  el.className = 'sign';
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', `${s.theme} — ${s.name}`);
  el.innerHTML = `
    <div class="sign-board">
      <span class="sign-badge">${s.bonus ? '★' : s.order}</span>
      <span class="sign-label"></span>
      <span class="sign-q">?</span>
    </div>
    ${s.bonus ? '<span class="sign-ribbon">BONUS</span>' : ''}
    <div class="sign-post"></div>
    <div class="sign-pulse"></div>`;
  (el.querySelector('.sign-label') as HTMLElement).textContent = s.theme;
  return el;
}

export const GameMap = forwardRef<GameMapHandle, Props>(function GameMap({ states, onReady }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const explorerRef = useRef<Explorer | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const markersRef = useRef<{ marker: maplibregl.Marker; el: HTMLDivElement }[]>([]);
  const doneRef = useRef<GeoJSON.Feature[]>([]);
  /** bumped on reset so an in-flight walk knows it was cancelled */
  const genRef = useRef(0);
  const statesRef = useRef(states);
  statesRef.current = states;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const applyStates = () => {
    markersRef.current.forEach(({ el }, i) => {
      el.classList.remove('locked', 'unlocked', 'current', 'done');
      el.classList.add(statesRef.current[i] ?? 'unlocked');
    });
  };

  const setDone = (extra?: GeoJSON.Feature) => {
    const src = mapRef.current?.getSource('trail-done') as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features: extra ? [...doneRef.current, extra] : doneRef.current });
  };
  const legFeature = (leg: Leg) =>
    ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: leg.coords } }) as GeoJSON.Feature;

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      bounds: STOP_BOUNDS,
      fitBoundsOptions: FIT_OPTIONS,
      minZoom: 12.5,
      maxZoom: 18,
      maxPitch: 68,
      maxBounds: [[-122.36, 37.45], [-122.2, 37.55]],
      dragPan: true,
      dragRotate: true,
      touchPitch: true,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    } as maplibregl.MapOptions);
    mapRef.current = map;
    if (import.meta.env.DEV || location.search.includes('debug')) {
      (window as unknown as { __map: maplibregl.Map }).__map = map;
    }

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-left');
    // MapLibre re-opens the compact attribution whenever it refreshes (resize, style/source/terrain updates).
    // Its listeners were registered first, so re-collapsing on the same events runs after them.
    const collapseAttribution = () => {
      const a = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
      a?.classList.remove('maplibregl-compact-show');
      a?.removeAttribute('open');
    };
    collapseAttribution();
    for (const ev of ['resize', 'styledata', 'sourcedata', 'terrain'] as const) map.on(ev, collapseAttribution);

    // Liberty references a few sprite icons that its sprite sheet lacks; supply blanks to keep the console clean.
    map.on('styleimagemissing', (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    map.on('style.load', () => {
      addTerrain(map);
      addTrailLayers(map, ROUTES);
      tidyBaseMap(map);
    });

    const popup = new maplibregl.Popup({ closeButton: true, className: 'sign-popup', maxWidth: '240px' });
    popupRef.current = popup;
    markersRef.current = STOPS.map((s, i) => {
      const el = buildMarkerEl(i);
      const show = () => {
        const box = document.createElement('div');
        box.className = 'popup-card';
        const h = document.createElement('strong');
        h.textContent = s.theme;
        const p = document.createElement('span');
        p.textContent = s.name;
        box.append(h, p);
        // sit just above the sign, whatever its current height (tall posts when overlapping)
        popup.setOffset([0, -(el.offsetHeight + 8)]).setLngLat(s.lonLat).setDOMContent(box).addTo(map);
      };
      el.addEventListener('click', (e) => { e.stopPropagation(); show(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(s.lonLat).addTo(map);
      el.setAttribute('aria-label', `${s.theme} - ${s.name}`); // Marker sets a generic label; override it
      return { marker, el };
    });
    applyStates();
    // keep nearer (lower on screen) signs in front so clustered stops overlap sensibly.
    // A sign whose board would overlap one already placed behind it gets a taller post, lifting its board.
    const sortSigns = () => {
      const ss = Number(map.getContainer().style.getPropertyValue('--ss')) || 1;
      const items = markersRef.current.map(({ marker, el }) => {
        const p = map.project(marker.getLngLat());
        const r = (el.querySelector('.sign-board') as HTMLElement).getBoundingClientRect();
        // board size does not change with .tall, so measure the base (56px) geometry to avoid flip-flopping
        const right = p.x + r.width / 2, left = p.x - r.width / 2;
        const bottom = p.y - 56 * ss, top = bottom - r.height;
        return { el, y: p.y, box: { left, right, top, bottom } };
      }).sort((a, b) => a.y - b.y);
      const overlap = (a: typeof items[0]['box'], b: typeof items[0]['box']) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      items.forEach((it, j) => {
        it.el.style.zIndex = String(Math.round(it.y) + 1000);
        it.el.classList.toggle('tall', items.slice(0, j).some((o) => overlap(o.box, it.box)));
      });
    };
    map.on('render', sortSigns);
    // signs/explorer shrink a little when zoomed out so clustered stops stay readable
    const scaleSigns = () => {
      const k = Math.min(1.1, Math.max(0.8, 0.66 + (map.getZoom() - 13.3) * 0.2));
      map.getContainer().style.setProperty('--ss', k.toFixed(3));
      map.getContainer().classList.toggle('signs-compact', map.getZoom() < 13.6);
    };
    map.on('zoom', scaleSigns);
    scaleSigns();

    explorerRef.current = new Explorer(map, STOPS[0].lonLat);

    let ready = false;
    map.on('idle', () => {
      if (ready) return;
      ready = true;
      document.documentElement.dataset.ready = '1';
      onReadyRef.current();
    });
    map.on('error', (e) => console.warn('[map]', e?.error?.message ?? e));

    return () => {
      genRef.current++;
      explorerRef.current?.stop();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(applyStates, [states]);

  useImperativeHandle(ref, () => ({
    async walk(from, to) {
      const map = mapRef.current, ex = explorerRef.current;
      if (!map || !ex) return false;
      const leg = legBetween(STOPS[from].id, STOPS[to].id);
      if (!leg) return false;
      const gen = genRef.current;
      const cum = cumulative(leg.coords);
      const totalM = cum[cum.length - 1];
      const finish = () => { doneRef.current = [...doneRef.current, legFeature(leg)]; setDone(); };

      // bring the camera down to the start of the leg so the walk is visible, then follow
      const start = leg.coords[0];
      const zoom = Math.max(map.getZoom(), 15.5);
      if (prefersReducedMotion()) {
        map.jumpTo({ center: start, zoom });
      } else {
        const settled = moveEnd(map, 1200);
        map.easeTo({ center: start, zoom, duration: 600 });
        await settled;
      }
      if (gen !== genRef.current) return false; // reset happened while the camera was moving

      let lastDraw = -Infinity;
      const ok = await ex.walk(leg.coords, (p, travelled) => {
        map.jumpTo({ center: p });
        // draw the walked part of this leg solid, at most every 100 ms (always on the final frame)
        const now = performance.now();
        const final = travelled >= totalM;
        if (!final && now - lastDraw < 100) return;
        lastDraw = now;
        let k = cum.findIndex((c) => c > travelled);
        if (k < 0) k = cum.length;
        const part = leg.coords.slice(0, Math.max(1, k));
        part.push(p);
        setDone({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: part } });
      });
      if (!ok || gen !== genRef.current) return false;
      finish();
      return true;
    },
    reset(index) {
      const map = mapRef.current, ex = explorerRef.current;
      if (!map || !ex) return;
      genRef.current++;
      map.stop();
      ex.stop();
      popupRef.current?.remove();
      ex.setPosition(STOPS[index].lonLat);
      doneRef.current = [];
      setDone();
      map.fitBounds(STOP_BOUNDS, { ...FIT_OPTIONS, animate: false });
    },
  }), []);

  return <div ref={container} className="map" />;
});
