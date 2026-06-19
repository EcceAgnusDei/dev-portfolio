const SHAPE_HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

const COLOR_INPUT_FALLBACK = "#000000";

export function isShapeColor(value: string): boolean {
  return value === "none" || SHAPE_HEX_COLOR_RE.test(value);
}

export function colorToInputValue(color: string): string {
  if (color !== "none" && isShapeColor(color)) {
    return color;
  }
  return COLOR_INPUT_FALLBACK;
}

export function parseColorInput(hex: string): string {
  const normalized = hex.trim().toLowerCase();
  if (!SHAPE_HEX_COLOR_RE.test(normalized)) {
    throw new Error("Couleur hexadécimale invalide.");
  }
  return normalized;
}
