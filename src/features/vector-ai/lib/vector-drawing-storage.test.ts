/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import {
  getVectorDrawing,
  getVectorDrawingsStoreSnapshot,
  listVectorDrawings,
  saveVectorDrawing,
  snapshotDocAsVectorDrawing,
  subscribeVectorDrawingsStore,
} from "@/features/vector-ai/lib/vector-drawing-storage";
import { makeDocWithRect, makeRectShape } from "@/features/vector-ai/lib/editor/test/fixtures";

const LOCAL_STORAGE_KEY = "dev-portfolio:vector-ai-drawings";

describe("vector-drawing-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retourne une liste vide quand le store est absent", () => {
    expect(listVectorDrawings()).toEqual([]);
    expect(getVectorDrawingsStoreSnapshot()).toEqual([]);
    expect(getVectorDrawing("missing")).toBeNull();
  });

  it("ignore un JSON corrompu", () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "{not-json");

    expect(listVectorDrawings()).toEqual([]);
    expect(getVectorDrawing("id-a")).toBeNull();
  });

  it("enregistre puis relit un dessin", () => {
    const doc = makeDocWithRect("rect-1");
    const drawing = snapshotDocAsVectorDrawing(doc, "id-a", "Mon dessin");

    expect(saveVectorDrawing(drawing)).toBeNull();
    expect(getVectorDrawing("id-a")).toEqual(drawing);
    expect(listVectorDrawings()).toEqual([
      { id: "id-a", name: "Mon dessin", updatedAt: drawing.updatedAt },
    ]);
  });

  it("écrase un dessin existant avec le même id", () => {
    const initial = snapshotDocAsVectorDrawing(
      makeDocWithRect("rect-1"),
      "id-a",
      "Version 1",
    );
    saveVectorDrawing(initial);

    const updatedDoc = makeDocWithRect("rect-1");
    updatedDoc.shapes[0] = makeRectShape({
      id: "rect-1",
      transform: { x: 80, y: 90 },
    });
    const updated = snapshotDocAsVectorDrawing(updatedDoc, "id-a", "Version 1");

    expect(saveVectorDrawing(updated)).toBeNull();

    const stored = getVectorDrawing("id-a");
    expect(stored?.doc.shapes[0]).toEqual(
      expect.objectContaining({ transform: { x: 80, y: 90 } }),
    );
    expect(listVectorDrawings()).toHaveLength(1);
  });

  it("trim le nom à l'enregistrement", () => {
    const drawing = snapshotDocAsVectorDrawing(
      makeDocWithRect("rect-1"),
      "id-a",
      "  Mon dessin  ",
    );

    expect(drawing.name).toBe("Mon dessin");
    expect(saveVectorDrawing(drawing)).toBeNull();
    expect(getVectorDrawing("id-a")?.name).toBe("Mon dessin");
  });

  it("refuse un dessin invalide", () => {
    const invalid = snapshotDocAsVectorDrawing(
      { ...createEmptyDoc(), version: 99 as 1 },
      "id-a",
      "Invalide",
    );

    expect(saveVectorDrawing(invalid)).toBe("Données de dessin invalides.");
    expect(getVectorDrawing("id-a")).toBeNull();
  });

  it("refuse un nom trop long", () => {
    const drawing = snapshotDocAsVectorDrawing(
      makeDocWithRect("rect-1"),
      "id-a",
      "a".repeat(101),
    );

    expect(saveVectorDrawing(drawing)).toBe("Données de dessin invalides.");
  });

  it("trie les dessins par updatedAt décroissant", () => {
    const older = snapshotDocAsVectorDrawing(
      makeDocWithRect("rect-1"),
      "older",
      "Ancien",
    );
    older.updatedAt = 100;
    const newer = snapshotDocAsVectorDrawing(
      makeDocWithRect("rect-2"),
      "newer",
      "Récent",
    );
    newer.updatedAt = 200;

    saveVectorDrawing(older);
    saveVectorDrawing(newer);

    expect(listVectorDrawings().map((item) => item.id)).toEqual(["newer", "older"]);
  });

  it("notifie les abonnés après enregistrement", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeVectorDrawingsStore(listener);

    saveVectorDrawing(
      snapshotDocAsVectorDrawing(makeDocWithRect("rect-1"), "id-a", "Test"),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("retourne une erreur si le stockage local est indisponible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const error = saveVectorDrawing(
      snapshotDocAsVectorDrawing(makeDocWithRect("rect-1"), "id-a", "Test"),
    );

    expect(error).toBe(
      "Impossible d'enregistrer : stockage local plein ou indisponible.",
    );
  });
});
