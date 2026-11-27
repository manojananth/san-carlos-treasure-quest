/**
 * Build-time street routing from OpenFreeMap (OpenMapTiles) vector tiles.
 * Run: npm run routes   (sets NODE_USE_ENV_PROXY=1 so fetch honours the HTTPS proxy)
 * Outputs: src/data/routes.json, src/data/stops.json
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PbfReader } from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type LL = [number, number];
interface StopSeed { id: string; lon: number; lat: number; poi?: RegExp; note: string }

// Approximate seeds (see docs/PLAN.md). `park`/`poi` patterns let us refine to real named features.
const SEEDS: StopSeed[] = [
  { id: 'depot', lon: -122.2621, lat: 37.5075, poi: /museum of san carlos history/i, note: '1888 stone depot (Museum of San Carlos History)' },
  { id: 'laurel', lon: -122.2615, lat: 37.5065, poi: /san carlos avenue & laurel street/i, note: 'Laurel St & San Carlos Ave' },
  { id: 'cityhall', lon: -122.2623, lat: 37.5036, poi: /san carlos branch.*library/i, note: 'Library next to City Hall, Elm St' },
  { id: 'burton', lon: -122.2582, lat: 37.4978, poi: /burton park/i, note: 'E R Burton Park' },
  { id: 'bigcanyon', lon: -122.2798, lat: 37.4866, poi: /^big canyon park$/i, note: 'Big Canyon Park' },
  { id: 'highlands', lon: -122.2747, lat: 37.4956, poi: /^highlands park$/i, note: 'Highlands Park' },
  { id: 'hiller', lon: -122.2529, lat: 37.5127, poi: /hiller/i, note: 'Hiller Aviation Museum' },
];
const LEGS: [string, string][] = [
  ['depot', 'laurel'], ['laurel', 'cityhall'], ['cityhall', 'burton'], ['burton', 'bigcanyon'],
  ['bigcanyon', 'highlands'], ['highlands', 'hiller'], ['depot', 'hiller'],
];
const Z = 14;
const MARGIN = 0.012; // degrees
const KEEP = new Set(['trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service', 'path', 'track']);

function haversine(a: LL, b: LL): number {
  const R = 6371008.8, r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z;
};
function tileToLL(x: number, y: number, z: number, px: number, py: number, extent: number): LL {
  const n = 2 ** z;
  const fx = (x + px / extent) / n, fy = (y + py / extent) / n;
  const lon = fx * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * fy))) * 180) / Math.PI;
  return [lon, lat];
}

async function fetchRetry(url: string, tries = 4): Promise<Response> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return r;
      err = new Error(`${r.status} ${url}`);
    } catch (e) { err = e; }
    await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw err;
}

// ---- graph ----
const GX = 3.4e-5, GY = 2.7e-5; // ~3 m in lon / lat at 37.5N
const nodeIds = new Map<string, number>();
const nodes: LL[] = [];
const adj: { to: number; w: number }[][] = [];
function nodeFor(ll: LL): number {
  const gx = Math.round(ll[0] / GX), gy = Math.round(ll[1] / GY);
  const key = gx + ',' + gy;
  let id = nodeIds.get(key);
  if (id === undefined) {
    id = nodes.length;
    nodeIds.set(key, id);
    nodes.push([gx * GX, gy * GY]);
    adj.push([]);
  }
  return id;
}
function addEdge(a: number, b: number, w: number) {
  if (a === b) return;
  adj[a].push({ to: b, w });
  adj[b].push({ to: a, w });
}

interface Named { name: string; ll: LL; cls: string; layer: string }
const named: Named[] = [];
const streetPts: Named[] = [];

async function main() {
  const tj = await (await fetchRetry('https://tiles.openfreemap.org/planet')).json() as { tiles: string[] };
  const tpl = tj.tiles[0];
  console.log('tile template', tpl);

  const lons = SEEDS.map((s) => s.lon), lats = SEEDS.map((s) => s.lat);
  const minLon = Math.min(...lons) - MARGIN, maxLon = Math.max(...lons) + MARGIN;
  const minLat = Math.min(...lats) - MARGIN, maxLat = Math.max(...lats) + MARGIN;
  const x0 = Math.floor(lon2x(minLon, Z)), x1 = Math.floor(lon2x(maxLon, Z));
  const y0 = Math.floor(lat2y(maxLat, Z)), y1 = Math.floor(lat2y(minLat, Z));
  console.log(`tiles x ${x0}-${x1}, y ${y0}-${y1}`);

  let edges = 0;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const url = tpl.replace('{z}', String(Z)).replace('{x}', String(x)).replace('{y}', String(y));
    const r = await fetchRetry(url);
    if (r.status === 404) { console.log('tile 404', x, y); continue; }
    const tile = new VectorTile(new PbfReader(new Uint8Array(await r.arrayBuffer())));
    const tr = tile.layers['transportation'];
    if (tr) {
      for (let i = 0; i < tr.length; i++) {
        const f = tr.feature(i);
        if (f.type !== 2) continue;
        const cls = String(f.properties.class ?? '');
        if (!KEEP.has(cls)) continue;
        if (f.properties.brunnel === 'tunnel') continue;
        const w = cls === 'service' ? 1.2 : 1.0;
        for (const line of f.loadGeometry()) {
          let prev = -1, prevLL: LL | null = null;
          for (const p of line) {
            const ll = tileToLL(x, y, Z, p.x, p.y, tr.extent);
            const id = nodeFor(ll);
            if (prev >= 0 && prevLL) { addEdge(prev, id, haversine(prevLL, ll) * w); edges++; }
            prev = id; prevLL = ll;
          }
        }
      }
    }
    // named features for refinement
    for (const lname of ['poi', 'park', 'transportation_name']) {
      const L = tile.layers[lname];
      if (!L) continue;
      for (let i = 0; i < L.length; i++) {
        const f = L.feature(i);
        const name = f.properties.name as string | undefined;
        if (!name) continue;
        const g = f.loadGeometry();
        if (!g.length || !g[0].length) continue;
        // use centroid of first ring/line (points: the point)
        const pts = g[0];
        const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const item = { name, ll: tileToLL(x, y, Z, cx, cy, L.extent), cls: String(f.properties.class ?? f.properties.subclass ?? ''), layer: lname };
        if (lname === 'transportation_name') {
          // keep every vertex for nearest-street lookups
          for (const p of g[0]) streetPts.push({ ...item, ll: tileToLL(x, y, Z, p.x, p.y, L.extent) });
        } else named.push(item);
      }
    }
  }
  console.log(`graph: ${nodes.length} nodes, ${edges} edges`);
  if (process.env.DUMP) {
    const seen = new Set<string>();
    for (const n of named) { const k = n.layer + ':' + n.name; if (!seen.has(k) && true) { seen.add(k); console.log('NAMED', n.layer, n.cls, '|', n.name, n.ll.map((v) => v.toFixed(5)).join(',')); } }
    const ss = new Map<string, LL>();
    for (const n of streetPts) if (!ss.has(n.name)) ss.set(n.name, n.ll);
    for (const [k, v] of ss) console.log('STREET', k, v.map((x) => x.toFixed(5)).join(','));
  }

  // ---- heal near-misses: tiles simplify each line independently, so some junctions don't share a vertex ----
  const M_X = 111320 * Math.cos((37.5 * Math.PI) / 180), M_Y = 110574;
  const px = (ll: LL) => [ll[0] * M_X, ll[1] * M_Y];
  function components(): Int32Array {
    const cm = new Int32Array(nodes.length).fill(-1);
    let k = 0;
    for (let s0 = 0; s0 < nodes.length; s0++) {
      if (cm[s0] >= 0) continue;
      const st = [s0]; cm[s0] = k;
      while (st.length) { const u = st.pop()!; for (const e of adj[u]) if (cm[e.to] < 0) { cm[e.to] = k; st.push(e.to); } }
      k++;
    }
    return cm;
  }
  const HEAL_M = 12;
  for (let pass = 0; pass < 3; pass++) {
    const cm = components();
    const sizes = new Map<number, number>();
    for (const c0 of cm) sizes.set(c0, (sizes.get(c0) ?? 0) + 1);
    const CELL = 25;
    const grid = new Map<string, [number, number][]>();
    const cellOf = (x: number, y: number) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
    for (let a = 0; a < nodes.length; a++) for (const e of adj[a]) if (a < e.to) {
      const A = px(nodes[a]), B = px(nodes[e.to]);
      const cx0 = Math.floor(Math.min(A[0], B[0]) / CELL), cx1 = Math.floor(Math.max(A[0], B[0]) / CELL);
      const cy0 = Math.floor(Math.min(A[1], B[1]) / CELL), cy1 = Math.floor(Math.max(A[1], B[1]) / CELL);
      for (let gx = cx0; gx <= cx1; gx++) for (let gy = cy0; gy <= cy1; gy++) {
        const k = gx + ',' + gy; if (!grid.has(k)) grid.set(k, []); grid.get(k)!.push([a, e.to]);
      }
    }
    let healed = 0;
    for (let u = 0; u < nodes.length; u++) {
      const deadEnd = adj[u].length === 1;
      if (!deadEnd) continue;
      const P = px(nodes[u]);
      let bestD = deadEnd ? HEAL_M : 3, bestSeg: [number, number] | null = null, bestT = 0;
      const gx = Math.floor(P[0] / CELL), gy = Math.floor(P[1] / CELL);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const [a, b] of grid.get((gx + dx) + ',' + (gy + dy)) ?? []) {
        if ((deadEnd && cm[a] === cm[u]) || a === u || b === u || adj[u].some((e) => e.to === a || e.to === b)) continue;
        const A = px(nodes[a]), B = px(nodes[b]);
        const vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy || 1e-9;
        const t = Math.max(0, Math.min(1, ((P[0] - A[0]) * vx + (P[1] - A[1]) * vy) / L2));
        const d = Math.hypot(P[0] - (A[0] + t * vx), P[1] - (A[1] + t * vy));
        if (d < bestD) { bestD = d; bestSeg = [a, b]; bestT = t; }
      }
      if (!bestSeg) continue;
      const [a, b] = bestSeg;
      const ea = adj[a].find((e) => e.to === b);
      if (!ea) continue; // already split this pass
      if (bestT < 0.1 || bestT > 0.9) { const tgt = bestT < 0.5 ? a : b; addEdge(u, tgt, bestD); healed++; continue; }
      const wTot = ea.w;
      adj[a] = adj[a].filter((e) => e.to !== b); adj[b] = adj[b].filter((e) => e.to !== a);
      const A = nodes[a], B = nodes[b];
      const mid: LL = [A[0] + bestT * (B[0] - A[0]), A[1] + bestT * (B[1] - A[1])];
      const m = nodes.length; nodes.push(mid); adj.push([]);
      addEdge(a, m, wTot * bestT); addEdge(m, b, wTot * (1 - bestT)); addEdge(u, m, bestD);
      healed++;
    }
    console.log(`heal pass ${pass}: ${healed} dead-ends joined`);
    if (!healed) break;
  }

  // largest connected component
  const comp = new Int32Array(nodes.length).fill(-1);
  let best = -1, bestSize = 0, c = 0;
  for (let s = 0; s < nodes.length; s++) {
    if (comp[s] >= 0) continue;
    let size = 0;
    const stack = [s]; comp[s] = c;
    while (stack.length) {
      const u = stack.pop()!; size++;
      for (const e of adj[u]) if (comp[e.to] < 0) { comp[e.to] = c; stack.push(e.to); }
    }
    if (size > bestSize) { bestSize = size; best = c; }
    c++;
  }
  console.log(`components: ${c}, largest ${bestSize} nodes`);
  const inMain = (i: number) => comp[i] === best;

  // refine stops
  const stops: Record<string, LL> = {};
  for (const s of SEEDS) {
    let ll: LL = [s.lon, s.lat];
    const pat = s.poi;
    let matched = 'none (kept seed)';
    if (pat) {
      const cands = named.filter((n) => pat.test(n.name) && (n.layer === 'poi' || n.layer === 'park')
        && haversine(n.ll, ll) < 1500)
        .sort((a, b) => haversine(a.ll, ll) - haversine(b.ll, ll));
      if (cands.length) { ll = cands[0].ll; matched = `${cands[0].layer}:"${cands[0].name}" (${cands[0].cls}) ${Math.round(haversine(cands[0].ll, [s.lon, s.lat]))} m from seed`; }
      else {
        const near = named.filter((n) => haversine(n.ll, ll) < 400).slice(0, 5).map((n) => n.name);
        matched = `no match for ${pat}; nearby: ${near.join(', ')}`;
      }
    }
    stops[s.id] = ll;
    const st = streetPts.map((p) => ({ p, d: haversine(p.ll, ll) })).sort((a, b) => a.d - b.d)[0];
    const pk = named.filter((n) => n.layer === 'park').map((p) => ({ p, d: haversine(p.ll, ll) })).sort((a, b) => a.d - b.d)[0];
    const po = named.filter((n) => n.layer === 'poi').map((p) => ({ p, d: haversine(p.ll, ll) })).sort((a, b) => a.d - b.d)[0];
    console.log(`[${s.id}] ${s.note}\n   match: ${matched}\n   nearest street: ${st ? `${st.p.name} (${Math.round(st.d)} m)` : '?'}; park: ${pk ? `${pk.p.name} (${Math.round(pk.d)} m)` : '?'}; poi: ${po ? `${po.p.name} (${Math.round(po.d)} m)` : '?'}`);
  }

  // snap stops to graph
  const stopNode: Record<string, number> = {};
  for (const s of SEEDS) {
    let bi = -1, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!inMain(i)) continue;
      const d = haversine(nodes[i], stops[s.id]);
      if (d < bd) { bd = d; bi = i; }
    }
    stopNode[s.id] = bi;
    console.log(`  ${s.id} snapped to node ${bi} (${bd.toFixed(0)} m away)`);
    stops[s.id] = nodes[bi];
  }

  // Dijkstra
  function dijkstra(src: number, dst: number): number[] {
    const dist = new Float64Array(nodes.length).fill(Infinity);
    const prev = new Int32Array(nodes.length).fill(-1);
    const heap: [number, number][] = [[0, src]];
    dist[src] = 0;
    const push = (it: [number, number]) => {
      heap.push(it); let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop()!;
      if (heap.length) {
        heap[0] = last; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [d, u] = pop();
      if (d > dist[u]) continue;
      if (u === dst) break;
      for (const e of adj[u]) {
        const nd = d + e.w;
        if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = u; push([nd, e.to]); }
      }
    }
    if (!isFinite(dist[dst])) throw new Error('no route');
    const path: number[] = [];
    for (let u = dst; u !== -1; u = prev[u]) path.push(u);
    return path.reverse();
  }

  const features = [];
  let failed = false;
  for (const [from, to] of LEGS) {
    const path = dijkstra(stopNode[from], stopNode[to]);
    let pts: LL[] = path.map((i) => nodes[i]);
    // remove tiny out-and-back spurs (snapping artefacts), then drop points <1 m apart
    for (let i = 1; i < pts.length - 1; i++) {
      if (haversine(pts[i - 1], pts[i]) < 8 && haversine(pts[i - 1], pts[i + 1]) < 3 && i + 1 < pts.length - 1) { pts.splice(i, 2); i = Math.max(0, i - 2); }
    }
    const out: LL[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) if (haversine(out[out.length - 1], pts[i]) >= 1) out.push(pts[i]);
    out.push(pts[pts.length - 1]);
    pts = out;
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += haversine(pts[i - 1], pts[i]);
    const straight = haversine(stops[from], stops[to]);
    const ratio = len / straight;
    console.log(`leg ${from} -> ${to}: ${len.toFixed(0)} m (straight ${straight.toFixed(0)} m, x${ratio.toFixed(2)}, ${pts.length} pts)`);
    if (ratio >= 3) { console.error(`FAIL: ${from}->${to} route is ${ratio.toFixed(2)}x straight-line`); failed = true; }
    features.push({
      type: 'Feature', properties: { from, to, lengthM: Math.round(len) },
      geometry: { type: 'LineString', coordinates: pts.map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]) },
    });
  }
  if (failed) process.exit(1);

  writeFileSync(resolve(root, 'src/data/routes.json'), JSON.stringify({ type: 'FeatureCollection', features }));
  const stopsOut: Record<string, LL> = {};
  for (const s of SEEDS) stopsOut[s.id] = [+stops[s.id][0].toFixed(6), +stops[s.id][1].toFixed(6)];
  writeFileSync(resolve(root, 'src/data/stops.json'), JSON.stringify(stopsOut, null, 2) + '\n');
  console.log('wrote src/data/routes.json and src/data/stops.json');
}
void existsSync; void readFileSync;
main().catch((e) => { console.error(e); process.exit(1); });
