export type LabelPresetId = "pimaco-6181" | "pimaco-6280" | "a4-single";

export type LabelPreset = {
  id: LabelPresetId;
  name: string;
  description: string;
  cols: number;
  rows: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
};

export const PRESETS: Record<LabelPresetId, LabelPreset> = {
  "pimaco-6181": {
    id: "pimaco-6181",
    name: "Pimaco 6181 — 10 por folha",
    description: "Grid 2×5 (99×57 mm). Padrão Avery/Pimaco para correios.",
    cols: 2,
    rows: 5,
    marginX: 5,
    marginY: 13.5,
    gapX: 2,
    gapY: 0,
  },
  "pimaco-6280": {
    id: "pimaco-6280",
    name: "Pimaco 6280 — 30 por folha",
    description: "Grid 3×10 (66×28 mm). Ideal para etiquetas compactas.",
    cols: 3,
    rows: 10,
    marginX: 5,
    marginY: 12,
    gapX: 3,
    gapY: 0,
  },
  "a4-single": {
    id: "a4-single",
    name: "A4 — 1 etiqueta por folha",
    description: "Etiqueta ocupando a folha inteira. Para envios grandes.",
    cols: 1,
    rows: 1,
    marginX: 15,
    marginY: 20,
    gapX: 0,
    gapY: 0,
  },
};

export type LabelSettings = {
  preset: LabelPresetId;
  fontScale: number; // 0.8 .. 1.4
  showBorder: boolean;
  showOrderNumber: boolean;
  showRecipientName: boolean;
  showAddress: boolean;
  showCityState: boolean;
  showZip: boolean;
};

export const DEFAULT_SETTINGS: LabelSettings = {
  preset: "pimaco-6181",
  fontScale: 1,
  showBorder: true,
  showOrderNumber: true,
  showRecipientName: true,
  showAddress: true,
  showCityState: true,
  showZip: true,
};

const KEY = "etiquetas-pro:label-settings";

export function loadSettings(): LabelSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: LabelSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}
