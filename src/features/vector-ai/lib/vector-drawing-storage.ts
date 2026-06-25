import { z } from "zod";

import { vectorDocSchema } from "@/features/vector-ai/lib/document/schema";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";

const LOCAL_STORAGE_KEY = "dev-portfolio:vector-ai-drawings";
const DRAWINGS_STORE_EVENT = "dev-portfolio:vector-ai-drawings-store-change";
const MAX_DRAWING_NAME_LENGTH = 100;

const vectorDrawingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_DRAWING_NAME_LENGTH),
  updatedAt: z.number(),
  doc: vectorDocSchema,
});

const drawingStoreSchema = z.record(z.string(), vectorDrawingSchema);

export type VectorDrawing = {
  id: string;
  name: string;
  updatedAt: number;
  doc: VectorDoc;
};

export type VectorDrawingListItem = Pick<
  VectorDrawing,
  "id" | "name" | "updatedAt"
>;

function readStore(): Record<string, VectorDrawing> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  const result = drawingStoreSchema.safeParse(parsed);
  return result.success ? (result.data as Record<string, VectorDrawing>) : {};
}

function notifyDrawingsStoreChange(): void {
  if (typeof window === "undefined") return;
  cachedClientStoreRaw = null;
  window.dispatchEvent(new Event(DRAWINGS_STORE_EVENT));
}

function writeStore(drawings: Record<string, VectorDrawing>): string | null {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(drawings));
    notifyDrawingsStoreChange();
    return null;
  } catch {
    return "Impossible d'enregistrer : stockage local plein ou indisponible.";
  }
}

export function listVectorDrawings(): VectorDrawingListItem[] {
  const store = readStore();
  return Object.values(store)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function subscribeVectorDrawingsStore(
  onStoreChange: () => void,
): () => void {
  window.addEventListener(DRAWINGS_STORE_EVENT, onStoreChange);
  return () => window.removeEventListener(DRAWINGS_STORE_EVENT, onStoreChange);
}

const EMPTY_VECTOR_DRAWINGS_LIST: VectorDrawingListItem[] = [];

let cachedClientSnapshot = EMPTY_VECTOR_DRAWINGS_LIST;
let cachedClientStoreRaw: string | null = null;

export function getVectorDrawingsStoreSnapshot(): VectorDrawingListItem[] {
  if (typeof window === "undefined") {
    return EMPTY_VECTOR_DRAWINGS_LIST;
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw === cachedClientStoreRaw) {
    return cachedClientSnapshot;
  }

  cachedClientStoreRaw = raw;
  cachedClientSnapshot =
    raw === null ? EMPTY_VECTOR_DRAWINGS_LIST : listVectorDrawings();
  return cachedClientSnapshot;
}

export function getVectorDrawingsStoreServerSnapshot(): VectorDrawingListItem[] {
  return EMPTY_VECTOR_DRAWINGS_LIST;
}

export function getVectorDrawing(id: string): VectorDrawing | null {
  return readStore()[id] ?? null;
}

export function saveVectorDrawing(drawing: VectorDrawing): string | null {
  const parsed = vectorDrawingSchema.safeParse(drawing);
  if (!parsed.success) {
    return "Données de dessin invalides.";
  }
  const store = readStore();
  return writeStore({
    ...store,
    [parsed.data.id]: parsed.data as VectorDrawing,
  });
}

export function snapshotDocAsVectorDrawing(
  doc: VectorDoc,
  id: string,
  name: string,
): VectorDrawing {
  return {
    id,
    name: name.trim(),
    updatedAt: Date.now(),
    doc,
  };
}
