import gsap from 'gsap';
import maplibregl from 'maplibre-gl';
import along from '@turf/along';
import length from '@turf/length';
import { lineString } from '@turf/helpers';
import type { LonLat } from '../data/stops';
import { explorerSvg } from '../components/explorerSvg';
import { lookKey } from '../gear/look';
import type { Look } from '../gear/look';
import { petSvg } from '../gear/art';
import { cumulative } from './geo';

// Keep walking time-accurate even when a frame is slow (map redraws can be heavy on weak GPUs).
gsap.ticker.lagSmoothing(0);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Seconds for a leg: ~walking pace, clamped to 4–10 s so it is watchable. */
export const legDuration = (meters: number) => Math.min(10, Math.max(4, meters / 450));

export class Explorer {
  readonly marker: maplibregl.Marker;
  private el: HTMLDivElement;
  private flip: HTMLDivElement;
  private body: HTMLDivElement;
  private pet: HTMLDivElement;
  private lookKey = '';
  private tween: gsap.core.Tween | null = null;
  private facing = 1;
  /** Resolves the in-flight walk: true when the leg finished, false when it was stopped. */
  private pending: ((ok: boolean) => void) | null = null;

  constructor(private map: maplibregl.Map, start: LonLat) {
    this.el = document.createElement('div');
    this.el.className = 'explorer';
    this.el.style.zIndex = '100000';
    this.flip = document.createElement('div');
    this.flip.className = 'explorer-flip';
    this.pet = document.createElement('div');
    this.pet.className = 'explorer-pet';
    this.pet.hidden = true;
    this.body = document.createElement('div');
    this.body.className = 'explorer-body';
    this.body.innerHTML = explorerSvg({});
    this.flip.append(this.pet, this.body);
    this.el.appendChild(this.flip);
    this.marker = new maplibregl.Marker({ element: this.el, anchor: 'bottom' }).setLngLat(start).addTo(map);
  }

  get lngLat(): LonLat {
    const p = this.marker.getLngLat();
    return [p.lng, p.lat];
  }

  /** Dress the explorer: hat colour, equipped hat and pack, and the trotting pet. */
  setLook(look: Look) {
    const key = lookKey(look);
    if (key === this.lookKey) return;
    this.lookKey = key;
    this.body.innerHTML = explorerSvg(look);
    this.pet.hidden = !look.pet;
    this.pet.innerHTML = look.pet ? petSvg(look.pet, 'pet-svg') : '';
  }

  setPosition(p: LonLat) {
    this.marker.setLngLat(p);
  }

  private face(dir: number) {
    if (dir === this.facing || dir === 0) return;
    this.facing = dir;
    this.flip.style.transform = dir < 0 ? 'scaleX(-1)' : 'scaleX(1)';
  }

  stop() {
    this.tween?.kill();
    this.tween = null;
    this.el.classList.remove('walking');
    const r = this.pending;
    this.pending = null;
    r?.(false);
  }

  /**
   * Walk along a leg. `onFrame(position, travelledMeters)` fires each frame (camera follow, trail drawing).
   * Resolves true when the leg is finished (immediately jumps under reduced motion),
   * or false when the walk was interrupted by stop()/reset.
   */
  walk(coords: LonLat[], onFrame: (p: LonLat, travelledM: number) => void): Promise<boolean> {
    this.stop();
    const line = lineString(coords);
    const totalKm = length(line, { units: 'kilometers' });
    const cum = cumulative(coords);
    const totalM = cum[cum.length - 1];
    const end = coords[coords.length - 1];

    if (prefersReducedMotion()) {
      this.setPosition(end);
      onFrame(end, totalM);
      return Promise.resolve(true);
    }

    this.el.classList.add('walking');
    const state = { t: 0 };
    return new Promise<boolean>((resolve) => {
      this.pending = resolve;
      this.tween = gsap.to(state, {
        t: 1,
        duration: legDuration(totalM),
        ease: 'sine.inOut',
        onUpdate: () => {
          const here = along(line, state.t * totalKm, { units: 'kilometers' }).geometry.coordinates as LonLat;
          const ahead = along(line, Math.min(totalKm, state.t * totalKm + 0.012), { units: 'kilometers' }).geometry
            .coordinates as LonLat;
          const a = this.map.project(here), b = this.map.project(ahead);
          if (Math.abs(b.x - a.x) > 0.5) this.face(b.x > a.x ? 1 : -1);
          this.marker.setLngLat(here);
          onFrame(here, state.t * totalM);
        },
        onComplete: () => {
          this.marker.setLngLat(end);
          onFrame(end, totalM);
          this.pending = null; // clear before stop() so it does not resolve this walk as cancelled
          this.stop();
          resolve(true);
        },
      });
    });
  }
}
