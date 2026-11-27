/** Sound hook. Milestone 4 fills this in (Howler); until then every call is a harmless no-op. */
export type SfxName = 'tap' | 'correct' | 'wrong' | 'hint' | 'unlock' | 'coin' | 'star' | 'fanfare' | 'step';

export function sfx(name: SfxName): void {
  void name;
}
