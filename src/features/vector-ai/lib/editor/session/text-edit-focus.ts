export function isTextEditUiFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  return active.closest("[data-vector-text-edit-ui]") !== null;
}

export function isTextEditLayerFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  return active.closest('[data-layer="text-edit"]') !== null;
}

export function isTextEditLayerElement(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[data-layer="text-edit"]') !== null;
}
