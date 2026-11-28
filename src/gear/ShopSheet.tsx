import { useMemo, useRef, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { explorerSvg } from '../components/explorerSvg';
import { GEAR_SLOTS, SLOT_LABEL, gearBySlot, gearItem } from '../data/gear';
import type { GearItem, GearSlot } from '../data/gear';
import { useGame } from '../state/GameContext';
import type { Profile } from '../state/types';
import { sfx } from '../audio/sfx';
import { buzzTap } from '../audio/haptics';
import { itemSvg } from './art';
import { lookOf } from './look';
import type { Look } from './look';

const CoinIcon = () => (
  <svg className="coin-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#f2b632" stroke="#1B2430" strokeWidth="2" />
    <circle cx="12" cy="12" r="5.2" fill="none" stroke="#1B2430" strokeWidth="1.6" opacity=".55" />
  </svg>
);

const TAB_LABEL: Record<GearSlot, string> = { hat: 'Hats', pack: 'Packs', pet: 'Pets' };

/** Explorer Shop: try gear on, buy it with coins, equip it. Tabs Hats / Packs / Pets. */
export function ShopSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { dispatch } = useGame();
  const [tab, setTab] = useState<GearSlot>('hat');
  /** item being tried on, per slot (preview only) */
  const [trying, setTrying] = useState<Partial<Record<GearSlot, string>>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { owned, equipped } = profile.gear;

  const base = lookOf(profile);
  const preview: Look = { ...base, ...(trying.hat !== undefined && { hat: trying.hat }), ...(trying.pack !== undefined && { pack: trying.pack }), ...(trying.pet !== undefined && { pet: trying.pet }) };
  const previewSvg = useMemo(() => explorerSvg(preview, { pet: true, cls: 'shop-explorer' }), [preview.color, preview.hat, preview.pack, preview.pet]); // eslint-disable-line react-hooks/exhaustive-deps
  const tryingItems = GEAR_SLOTS.map((s) => trying[s]).filter((id): id is string => !!id && !owned.includes(id));
  const tryingNames = tryingItems.map((id) => gearItem(id)?.name).join(', ');

  const select = (it: GearItem) => {
    setTrying((t) => ({ ...t, [it.slot]: it.id }));
    setConfirming(null);
  };
  const buy = (it: GearItem) => {
    dispatch({ type: 'buyItem', id: it.id });
    dispatch({ type: 'equip', slot: it.slot, id: it.id });
    setConfirming(null);
    setTrying((t) => ({ ...t, [it.slot]: undefined }));
    sfx('coins');
    buzzTap();
  };
  const equip = (it: GearItem) => {
    dispatch({ type: 'equip', slot: it.slot, id: it.id });
    setTrying((t) => ({ ...t, [it.slot]: undefined }));
    sfx('tap');
  };
  const unequip = (it: GearItem) => {
    dispatch({ type: 'equip', slot: it.slot, id: null });
    setTrying((t) => ({ ...t, [it.slot]: undefined }));
    sfx('tap');
  };

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = GEAR_SLOTS[(i + d + GEAR_SLOTS.length) % GEAR_SLOTS.length];
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Sheet title="Explorer Shop" heading={false} onClose={onClose} className="shop">
      <div className="shop-top">
        <div className="shop-stage">
          <div className="shop-preview" role="img" aria-label={`${profile.name} wearing ${[preview.hat, preview.pack, preview.pet].filter(Boolean).map((id) => gearItem(id!)?.name).join(', ') || 'the starter outfit'}`} dangerouslySetInnerHTML={{ __html: previewSvg }} />
          <p className="shop-try" aria-live="polite">{tryingNames ? `Trying on: ${tryingNames}` : 'Tap an item to try it on'}</p>
        </div>
        <div className="shop-head">
          <h2 className="sheet-title" aria-hidden="true">Explorer <span>Shop</span></h2>
          <div className="shop-coins" role="status" aria-label={`${profile.coins} coins`}><CoinIcon /><b data-testid="shop-coins">{profile.coins}</b><span>coins</span></div>
          <button type="button" className="btn btn-plain shop-close" onClick={onClose} data-testid="shop-close">Done</button>
        </div>
      </div>

      <div className="shop-tabs" role="tablist" aria-label="Gear type">
        {GEAR_SLOTS.map((s, i) => (
          <button key={s} type="button" role="tab" id={`shop-tab-${s}`} aria-selected={tab === s} aria-controls="shop-panel" tabIndex={tab === s ? 0 : -1}
            ref={(el) => { tabRefs.current[s] = el; }} className={`shop-tab${tab === s ? ' on' : ''}`} data-autofocus={tab === s ? '' : undefined}
            onClick={() => { setTab(s); setConfirming(null); }} onKeyDown={(e) => onTabKey(e, i)}>
            {TAB_LABEL[s]}
          </button>
        ))}
      </div>

      <ul className="shop-grid" id="shop-panel" role="tabpanel" aria-labelledby={`shop-tab-${tab}`} aria-label={SLOT_LABEL[tab]}>
        {gearBySlot(tab).map((it) => {
          const has = owned.includes(it.id);
          const on = equipped[it.slot] === it.id;
          const need = it.price - profile.coins;
          const state = on ? 'equipped' : has ? 'owned' : need > 0 ? `costs ${it.price} coins, you need ${need} more` : `costs ${it.price} coins`;
          return (
            <li key={it.id} className={`shop-card${on ? ' is-on' : ''}${trying[it.slot] === it.id ? ' is-trying' : ''}`} data-testid={`shop-${it.id}`}>
              <button type="button" className="shop-pick" onClick={() => select(it)} aria-pressed={trying[it.slot] === it.id} aria-label={`Try on ${it.name}, ${state}`}>
                <span className="shop-art" dangerouslySetInnerHTML={{ __html: itemSvg(it.id) }} />
                <b>{it.name}</b>
                <span className="shop-price">{has ? (on ? 'Equipped' : 'Owned') : <><CoinIcon />{it.price}</>}</span>
              </button>
              {confirming === it.id ? (
                <div className="shop-confirm" role="group" aria-label={`Buy ${it.name} for ${it.price} coins?`}>
                  <button type="button" className="btn btn-go" data-autofocus onClick={() => buy(it)}>Yes, buy</button>
                  <button type="button" className="btn btn-plain" onClick={() => setConfirming(null)}>No</button>
                </div>
              ) : on ? (
                <button type="button" className="btn btn-plain shop-act" onClick={() => unequip(it)} aria-label={`Unequip ${it.name}`}>Unequip</button>
              ) : has ? (
                <button type="button" className="btn btn-go shop-act" onClick={() => equip(it)} aria-label={`Equip ${it.name}`}>Equip</button>
              ) : need > 0 ? (
                <button type="button" className="btn btn-plain shop-act short" disabled aria-label={`${it.name}: ${need} more coins needed`}>{need} more coins</button>
              ) : (
                <button type="button" className="btn btn-go shop-act" onClick={() => { select(it); setConfirming(it.id); }} aria-label={`Buy ${it.name} for ${it.price} coins`}>Buy</button>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
