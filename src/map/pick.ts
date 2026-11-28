import maplibregl from 'maplibre-gl';
import type { LonLat } from '../data/stops';
import { STOPS } from '../data/stops';
import { circleRing } from '../riddles/geo';

export interface PickOptions {
  /** the player tapped the map (a drag to pan or zoom does not count) */
  onPick: (lonLat: LonLat) => void;
  /** dashed circle to draw on the map (the map riddle's hint) */
  hintCircle?: { center: LonLat; radiusM: number };
  /** frame the quest area first (default true); false keeps the camera where the player left it */
  frame?: boolean;
  /** px kept clear around the quest area when the camera frames it (e.g. the riddle banner at the bottom) */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
}
/** Call it to leave pick mode. `mark(ok)` turns the pin green or red after judging. */
export type PickHandle = (() => void) & { mark: (ok: boolean) => void };

const SRC = 'pick-hint';
const LAYERS = ['pick-hint-fill', 'pick-hint-line'];

const BOUNDS: [LonLat, LonLat] = [
  [Math.min(...STOPS.map((s) => s.lonLat[0])), Math.min(...STOPS.map((s) => s.lonLat[1]))],
  [Math.max(...STOPS.map((s) => s.lonLat[0])), Math.max(...STOPS.map((s) => s.lonLat[1]))],
];

function drawHint(map: maplibregl.Map, c: { center: LonLat; radiusM: number }) {
  const data: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(c.center, c.radiusM)] } };
  const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
  if (src) { src.setData(data); return; }
  map.addSource(SRC, { type: 'geojson', data });
  map.addLayer({ id: LAYERS[0], type: 'fill', source: SRC, paint: { 'fill-color': '#2ba8a4', 'fill-opacity': 0.14 } });
  map.addLayer({ id: LAYERS[1], type: 'line', source: SRC, paint: { 'line-color': '#1f8582', 'line-width': 3, 'line-dasharray': [2, 1.5] } });
}
function clearHint(map: maplibregl.Map) {
  try {
    for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SRC)) map.removeSource(SRC);
  } catch { /* map already torn down */ }
}

function pinEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'pick-pin';
  el.innerHTML = '<span class="pick-pin-head"></span><span class="pick-pin-tail"></span>';
  return el;
}

/**
 * Pick mode for map riddles: frame the whole quest area flat from above, listen for a tap (MapLibre only fires
 * `click` for a tap without a drag, so panning and zooming keep working), drop a pin where it landed and report it.
 * The hint circle is a GeoJSON layer pair. The returned function cancels everything.
 */
export function startPick(map: maplibregl.Map, opts: PickOptions): PickHandle {
  let pin: maplibregl.Marker | null = null;
  let pinNode: HTMLDivElement | null = null;
  let live = true;
  const canvas = map.getCanvas();
  const prevCursor = canvas.style.cursor;
  canvas.style.cursor = 'crosshair';

  const reduced = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (opts.frame !== false) {
    map.stop();
    map.fitBounds(BOUNDS, {
      padding: { top: opts.padding?.top ?? 90, bottom: opts.padding?.bottom ?? 190, left: opts.padding?.left ?? 24, right: opts.padding?.right ?? 24 },
      pitch: 0, bearing: 0, maxZoom: 14.6, animate: !reduced, duration: 900,
    });
  }

  const draw = () => { if (live && opts.hintCircle) drawHint(map, opts.hintCircle); };
  if (opts.hintCircle) {
    if (map.isStyleLoaded()) draw(); else map.once('idle', draw);
  }

  const onClick = (e: maplibregl.MapMouseEvent) => {
    if (!live) return;
    const p: LonLat = [e.lngLat.lng, e.lngLat.lat];
    pinNode = pinEl();
    pin?.remove();
    pin = new maplibregl.Marker({ element: pinNode, anchor: 'bottom' }).setLngLat(p).addTo(map);
    opts.onPick(p);
  };
  map.on('click', onClick);

  const cancel = (() => {
    if (!live) return;
    live = false;
    map.off('click', onClick);
    pin?.remove();
    pin = null;
    canvas.style.cursor = prevCursor;
    clearHint(map);
  }) as PickHandle;
  cancel.mark = (ok) => { pinNode?.classList.remove('ok', 'no'); pinNode?.classList.add(ok ? 'ok' : 'no'); };
  return cancel;
}
