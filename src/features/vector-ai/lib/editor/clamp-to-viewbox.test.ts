import { describe, expect, it } from "vitest";

import {
  clampInRange,
  clampPointToViewBox,
  clampRectPreviewToViewBox,
  clampShapeToViewBox,
} from "@/features/vector-ai/lib/editor/clamp-to-viewbox";
import {
  makeCircleShape,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test-fixtures";

const VB = { x: 0, y: 0, w: 100, h: 100 };

describe("clampInRange", () => {
  it("borne une valeur dans l'intervalle", () => {
    expect(clampInRange(50, 0, 100)).toBe(50);
    expect(clampInRange(-10, 0, 100)).toBe(0);
    expect(clampInRange(120, 0, 100)).toBe(100);
  });
});

describe("clampPointToViewBox", () => {
  it("borne un point au viewBox", () => {
    expect(clampPointToViewBox({ x: -5, y: 150 }, VB)).toEqual({ x: 0, y: 100 });
  });
});

describe("clampRectPreviewToViewBox", () => {
  it("intersecte le preview avec le viewBox", () => {
    expect(
      clampRectPreviewToViewBox({ x: 80, y: 10, w: 40, h: 30 }, VB),
    ).toEqual({ x: 80, y: 10, w: 20, h: 30 });
  });

  it("retourne w/h nuls si le preview est entièrement hors viewBox", () => {
    expect(
      clampRectPreviewToViewBox({ x: 120, y: 120, w: 10, h: 10 }, VB),
    ).toEqual({ x: 120, y: 120, w: 0, h: 0 });
  });
});

describe("clampShapeToViewBox", () => {
  it("empêche un rectangle de dépasser le viewBox", () => {
    const rect = makeRectShape({
      transform: { x: 80, y: 70 },
      w: 30,
      h: 40,
    });
    expect(clampShapeToViewBox(rect, VB)).toEqual(
      expect.objectContaining({
        transform: { x: 70, y: 60 },
      }),
    );
  });

  it("empêche un cercle de dépasser le viewBox", () => {
    const circle = makeCircleShape({
      transform: { x: 95, y: 95 },
      r: 10,
    });
    expect(clampShapeToViewBox(circle, VB)).toEqual(
      expect.objectContaining({
        transform: { x: 90, y: 90 },
      }),
    );
  });

  it("translate une ligne pour la garder dans le viewBox", () => {
    const line = makeLineShape({
      transform: { x: 90, y: 10 },
      x2: 110,
      y2: 20,
    });
    expect(clampShapeToViewBox(line, VB)).toEqual(
      expect.objectContaining({
        transform: { x: 80, y: 10 },
        x2: 100,
        y2: 20,
      }),
    );
  });
});
