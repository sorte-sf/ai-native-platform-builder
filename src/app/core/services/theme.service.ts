import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';
export type ThemeSkin = 'default' | 'two' | 'three' | 'four' | 'five' | 'six';

const validModes: ThemeMode[] = ['dark', 'light'];
const validSkins: ThemeSkin[] = ['default', 'two', 'three', 'four', 'five', 'six'];

function readStorageValue<T extends string>(key: string, values: readonly T[], fallback: T) {
  const value = localStorage.getItem(key) as T | null;
  return value && values.includes(value) ? value : fallback;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private readonly document = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>(readStorageValue('hotel.theme', validModes, 'light'));
  readonly skin = signal<ThemeSkin>(readStorageValue('hotel.themeSkin', validSkins, 'six'));

  readonly skins: { key: ThemeSkin; swatches: string[] }[] = [
    { key: 'default', swatches: ['#59d12d', '#87d766', '#e7e9ec', '#24940a'] },
    { key: 'two', swatches: ['#3498db', '#5dade2', '#e7e9ec', '#2874a6'] },
    { key: 'three', swatches: ['#9b59b6', '#b784cf', '#e7e9ec', '#7d3c98'] },
    { key: 'four', swatches: ['#2ec4c7', '#59cdd0', '#e7e9ec', '#219a9b'] },
    { key: 'five', swatches: ['#ef4438', '#ec7063', '#e7e9ec', '#c0392b'] },
    { key: 'six', swatches: ['#f7b500', '#ffd15c', '#e7e9ec', '#b88700'] }
  ];

  constructor() {

    effect(() => {
      const mode = this.mode();
      localStorage.setItem('hotel.theme', mode);
      this.document.documentElement.classList.toggle('dark', mode === 'dark');
      this.document.body.classList.toggle('hotel-dark', mode === 'dark');
    });

    effect(() => {
      const skin = this.skin();
      localStorage.setItem('hotel.themeSkin', skin);
      for (const value of validSkins) {
        this.document.body.classList.toggle(`hotel-skin-${value}`, value === skin);
      }
    });

  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  applyServerPreferences(skin: string | null | undefined, mode: string | null | undefined) {
    if (validSkins.includes(skin as ThemeSkin)) this.skin.set(skin as ThemeSkin);
    if (validModes.includes(mode as ThemeMode)) this.mode.set(mode as ThemeMode);
  }

  setSkin(skin: ThemeSkin) {
    this.skin.set(skin);
  }

  toggle() {
    this.mode.update(mode => mode === 'dark' ? 'light' : 'dark');
  }
}
