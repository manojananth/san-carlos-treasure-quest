import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const DEM_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
const demSource = () => ({
  type: 'raster-dem' as const,
  tiles: DEM_TILES,
  encoding: 'terrarium' as const,
  tileSize: 256,
  maxzoom: 15,
  attribution: 'Terrain: Mapzen/AWS Terrain Tiles',
});

/** Find the first layer that is a road/building so hillshade can sit beneath it. */
function firstRoadOrBuildingLayer(style: StyleSpecification): string | undefined {
  return style.layers.find((l) => /^(tunnel|road|bridge|building|aeroway|railway)/.test(l.id))?.id;
}
function firstSymbolLayer(style: StyleSpecification): string | undefined {
  return style.layers.find((l) => l.type === 'symbol')?.id;
}

/** Adds terrain, hillshade and (if supported) sky to a freshly loaded Liberty style. */
export function addTerrain(map: maplibregl.Map): void {
  const style = map.getStyle();
  if (!map.getSource('dem-terrain')) map.addSource('dem-terrain', demSource());
  if (!map.getSource('dem-hillshade')) map.addSource('dem-hillshade', demSource());

  if (!map.getLayer('hillshade')) {
    map.addLayer(
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'dem-hillshade',
        paint: {
          'hillshade-exaggeration': 0.5,
          'hillshade-shadow-color': '#7a4a2a',
          'hillshade-highlight-color': '#fff6dc',
          'hillshade-accent-color': '#a8683a',
          'hillshade-illumination-direction': 315,
        },
      },
      firstRoadOrBuildingLayer(style),
    );
  }
  map.setTerrain({ source: 'dem-terrain', exaggeration: 1.5 });

  // setSky arrived in MapLibre GL JS 5; degrade quietly on 4.x.
  try {
    const m = map as unknown as { setSky?: (s: Record<string, unknown>) => void };
    m.setSky?.({
      'sky-color': '#2BA8A4',
      'horizon-color': '#ffffff',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-color': '#e8f6f4',
      'fog-ground-blend': 0.6,
    });
  } catch {
    /* ignore */
  }
}

/** Dashed gold trail with dark casing for every leg + a solid "done" line for the walked part. */
export function addTrailLayers(map: maplibregl.Map, routes: GeoJSON.FeatureCollection): void {
  const before = firstSymbolLayer(map.getStyle());
  if (!map.getSource('routes')) map.addSource('routes', { type: 'geojson', data: routes });
  if (!map.getSource('trail-done')) {
    map.addSource('trail-done', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }
  const width: maplibregl.ExpressionSpecification = ['interpolate', ['exponential', 1.6], ['zoom'], 12, 2.5, 18, 11];
  const casingW: maplibregl.ExpressionSpecification = ['interpolate', ['exponential', 1.6], ['zoom'], 12, 5, 18, 18];
  map.addLayer({ id: 'trail-casing', type: 'line', source: 'routes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1B2430', 'line-width': casingW, 'line-opacity': 0.85 } }, before);
  map.addLayer({ id: 'trail-dash', type: 'line', source: 'routes', layout: { 'line-join': 'round' }, paint: { 'line-color': '#F2B632', 'line-width': width, 'line-dasharray': [1.2, 1.4] } }, before);
  map.addLayer({ id: 'trail-done-casing', type: 'line', source: 'trail-done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1B2430', 'line-width': casingW } }, before);
  map.addLayer({ id: 'trail-done', type: 'line', source: 'trail-done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#F2B632', 'line-width': width } }, before);
}

export { maplibregl };
