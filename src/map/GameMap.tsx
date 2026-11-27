import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import routesJson from '../data/routes.json';
import { STOPS } from '../data/stops';
import type { LonLat } from '../data/stops';
import { STYLE_URL, addTerrain, addTrailLayers } from './style';
import { Explorer } from './explorer';
import { cumulative } from './geo';

type Leg = { from: string; to: string; coords: LonLat[]; lengthM: number };
const ROUTES = routesJson as unknown as GeoJSON.FeatureCollection<GeoJSON.LineString>;
const LEGS: Leg[] = ROUTES.features.map((f) => ({
  from: f.properties?.from, to: f.properties?.to, lengthM: f.properties?.lengthM, coords: f.geometry.coordinates as LonLat[],
}));
const legBetween = (a: string, b: string) => LEGS.find((l) => l.from === a && l.to === b);

export type MarkerState = 'locked' | 'unlocked' | 'current' | 'done';

export interface GameMapHandle {
  /** Walk the explorer from stop index `from` to `to` (consecutive stops). */
  walk(from: number, to: number): Promise<void>;
  /** Put explorer at stop `index` and reset camera + done trail to the stops before it. */
  reset(index: number): void;
}
interface Props {
  states: MarkerState[];
  onReady: () => void;
}

const START_CAMERA = () => {
  const d = STOPS[0].lonLat, h = STOPS[5].lonLat;
  const narrow = window.innerWidth < 600;
  const t = narrow ? 0.4 : 0.45; // portrait: lean toward the depot so Base Camp is not clipped
  return {
    center: [d[0] + (h[0] - d[0]) * t, d[1] + (h[1] - d[1]) * t] as LonLat,
    zoom: narrow ? 13.1 : 14.3, pitch: 60, bearing: -20,
  };
};

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
  const markersRef = useRef<{ marker: maplibregl.Marker; el: HTMLDivElement }[]>([]);
  const doneRef = useRef<GeoJSON.Feature[]>([]);
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
    const cam = START_CAMERA();
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      ...cam,
      minZoom: 12.5,
      maxZoom: 18,
      maxPitch: 75,
      maxBounds: [[-122.36, 37.45], [-122.2, 37.55]],
      dragPan: true,
      dragRotate: true,
      touchPitch: true,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    } as maplibregl.MapOptions);
    mapRef.current = map;
    (window as unknown as { __map: maplibregl.Map }).__map = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    // Liberty references a few sprite icons that its sprite sheet lacks; supply blanks to keep the console clean.
    map.on('styleimagemissing', (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    map.on('style.load', () => {
      addTerrain(map);
      addTrailLayers(map, ROUTES);
    });

    const popup = new maplibregl.Popup({ offset: [0, -96], closeButton: true, className: 'sign-popup', maxWidth: '240px' });
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
        popup.setLngLat(s.lonLat).setDOMContent(box).addTo(map);
      };
      el.addEventListener('click', (e) => { e.stopPropagation(); show(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(s.lonLat).addTo(map);
      el.setAttribute('aria-label', `${s.theme} - ${s.name}`); // Marker sets a generic label; override it
      return { marker, el };
    });
    applyStates();
    // keep nearer (lower on screen) signs in front so clustered stops overlap sensibly
    const sortSigns = () => {
      markersRef.current.forEach(({ marker, el }) => {
        const p = map.project(marker.getLngLat());
        el.style.zIndex = String(Math.round(p.y) + 1000);
      });
    };
    map.on('render', sortSigns);
    // signs/explorer shrink a little when zoomed out so clustered stops stay readable
    const scaleSigns = () => {
      const k = Math.min(1.1, Math.max(0.66, 0.66 + (map.getZoom() - 13.3) * 0.2));
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
      explorerRef.current?.stop();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(applyStates, [states]);

  useImperativeHandle(ref, () => ({
    async walk(from, to) {
      const map = mapRef.current, ex = explorerRef.current;
      if (!map || !ex) return;
      const leg = legBetween(STOPS[from].id, STOPS[to].id);
      if (!leg) return;
      const cum = cumulative(leg.coords);
      const finish = () => { doneRef.current = [...doneRef.current, legFeature(leg)]; setDone(); };
      await ex.walk(leg.coords, (p, travelled) => {
        map.jumpTo({ center: p });
        // draw the walked part of this leg solid
        let k = cum.findIndex((c) => c > travelled);
        if (k < 0) k = cum.length;
        const part = leg.coords.slice(0, Math.max(1, k));
        part.push(p);
        setDone({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: part } });
      });
      finish();
    },
    reset(index) {
      const map = mapRef.current, ex = explorerRef.current;
      if (!map || !ex) return;
      ex.stop();
      ex.setPosition(STOPS[index].lonLat);
      doneRef.current = [];
      setDone();
      const cam = START_CAMERA();
      map.jumpTo({ ...cam });
    },
  }), []);

  return <div ref={container} className="map" />;
});
