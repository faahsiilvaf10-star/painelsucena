export type FuelLevelInput = string | null | undefined;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const fuelLevelToLabel = (level: FuelLevelInput): string => {
  if (!level) return "";

  const norm = String(level).trim().toLowerCase();
  const labels: Record<string, string> = {
    empty: "VAZIO",
    quarter: "1/4",
    half: "1/2",
    three_quarters: "3/4",
    full: "CHEIO",
    // common free-form inputs
    "1/4": "1/4",
    "1/2": "1/2",
    "3/4": "3/4",
    e: "VAZIO",
    f: "CHEIO",
    cheio: "CHEIO",
    vazio: "VAZIO",
    meio: "1/2",
  };

  return labels[norm] || String(level);
};

export const fuelLevelToPercentage = (level: FuelLevelInput): number => {
  if (!level) return 0;

  const raw = String(level).trim();
  const norm = raw.toLowerCase();

  // numeric inputs
  if (norm.endsWith("%")) {
    const n = Number.parseFloat(norm.replace("%", ""));
    return Number.isFinite(n) ? clamp(n, 0, 100) : 0;
  }

  const n = Number.parseFloat(norm);
  if (Number.isFinite(n) && norm.match(/^\d+(\.\d+)?$/)) {
    // if user stored 0-1, convert to 0-100
    return n <= 1 ? clamp(n * 100, 0, 100) : clamp(n, 0, 100);
  }

  const map: Record<string, number> = {
    empty: 0,
    quarter: 25,
    half: 50,
    three_quarters: 75,
    full: 100,
    "1/4": 25,
    "1/2": 50,
    "3/4": 75,
    e: 0,
    f: 100,
    vazio: 0,
    cheio: 100,
    meio: 50,
  };

  return map[norm] ?? 0;
};

export const buildFuelGaugeSvg = (params: {
  percent: number;
  width?: number;
  height?: number;
  fillColor?: string;
}) => {
  const width = params.width ?? 58;
  const height = params.height ?? 72;

  // Layout values inside viewBox
  const vbW = 58;
  const vbH = 72;
  const tankX = 22;
  const tankY = 6;
  const tankW = 28;
  const tankH = 60;
  const innerPad = 2;
  const innerX = tankX + innerPad;
  const innerY = tankY + innerPad;
  const innerW = tankW - innerPad * 2;
  const innerH = tankH - innerPad * 2;

  const pct = clamp(params.percent, 0, 100);
  const fillH = (innerH * pct) / 100;
  const fillY = innerY + (innerH - fillH);
  const fillColor = params.fillColor ?? "#f59e0b";

  return `
    <svg
      width="${width}"
      height="${height}"
      viewBox="0 0 ${vbW} ${vbH}"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gauge de combustível"
      role="img"
      style="display:block"
    >
      <!-- Markers -->
      <text x="4" y="14" font-size="8" font-family="Arial" fill="#111">F</text>
      <text x="4" y="38" font-size="8" font-family="Arial" fill="#111">½</text>
      <text x="4" y="66" font-size="8" font-family="Arial" fill="#111">E</text>

      <!-- Tank background -->
      <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="2" fill="#f5f5f5" stroke="#111" stroke-width="2" />

      <!-- Fill -->
      <rect x="${innerX}" y="${fillY}" width="${innerW}" height="${fillH}" fill="${fillColor}" />

      <!-- Tank border on top (keeps fill inside visually) -->
      <rect x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="2" fill="none" stroke="#111" stroke-width="2" />
    </svg>
  `;
};
