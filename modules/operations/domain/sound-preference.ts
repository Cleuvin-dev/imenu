const STORAGE_KEY = "imenu_kds_sound_enabled";

/** Preferência por dispositivo (docs/08 §8): exige gesto para habilitar, persiste localmente. */
export function readSoundPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function writeSoundPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
