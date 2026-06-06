import { describe, expect, it } from "vitest";

import { circlePreviewFromAnchorAndPoint } from "@/features/vector-ai/lib/editor/geometry/circle-from-anchor";
import {
  clampCirclePreviewFromAnchor,
  clampCirclePreviewToViewBox,
  clampInRange,
  clampLinePreviewToViewBox,
  clampPointToViewBox,
  clampRectPreviewToViewBox,
  clampShapeToViewBox,
} from "@/features/vector-ai/lib/editor/geometry/viewbox-clamp";
import {
  makeCircleShape,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";

const VB = { x: 0, y: 0, w: 100, h: 100 };

function circleStaysInViewBox(preview: {
  cx: number;
  cy: number;
  r: number;
}): boolean {
  if (preview.r <= 0) return true;
  return (
    preview.cx - preview.r >= VB.x &&
    preview.cx + preview.r <= VB.x + VB.w &&
    preview.cy - preview.r >= VB.y &&
    preview.cy + preview.r <= VB.y + VB.h
  );
}

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

describe("clampCirclePreviewFromAnchor", () => {
  it("laisse le preview inchangé si le cercle tient dans le viewBox", () => {
    const anchor = { x: 10, y: 20 };
    const current = { x: 50, y: 20 };
    expect(clampCirclePreviewFromAnchor(anchor, current, VB)).toEqual(
      circlePreviewFromAnchorAndPoint(anchor, current),
    );
  });

  it("retourne r=0 si ancrage et curseur sont confondus", () => {
    const anchor = { x: 40, y: 40 };
    expect(clampCirclePreviewFromAnchor(anchor, anchor, VB)).toEqual({
      cx: 40,
      cy: 40,
      r: 0,
      anchorX: 40,
      anchorY: 40,
    });
  });

  it("garde l'ancrage fixe et borne le cercle au viewBox", () => {
    const anchor = { x: 5, y: 5 };
    const current = { x: 95, y: 95 };
    const preview = clampCirclePreviewFromAnchor(anchor, current, VB);

    expect(preview.anchorX).toBe(5);
    expect(preview.anchorY).toBe(5);
    expect(circleStaysInViewBox(preview)).toBe(true);
    expect(preview.r).toBeGreaterThan(0);
    expect(preview.r).toBeLessThan(
      circlePreviewFromAnchorAndPoint(anchor, current).r,
    );
  });
});

describe("clampCirclePreviewToViewBox", () => {
  it("délègue à clampCirclePreviewFromAnchor via le diamètre", () => {
    const anchor = { x: 10, y: 30 };
    const current = { x: 90, y: 30 };
    const fromAnchor = clampCirclePreviewFromAnchor(anchor, current, VB);
    const preview = circlePreviewFromAnchorAndPoint(anchor, current);

    expect(clampCirclePreviewToViewBox(preview, VB)).toEqual(fromAnchor);
  });
});

describe("clampLinePreviewToViewBox", () => {
  it("borne chaque extrémité au viewBox", () => {
    expect(
      clampLinePreviewToViewBox(
        { x1: -10, y1: 20, x2: 150, y2: 60 },
        VB,
      ),
    ).toEqual({ x1: 0, y1: 20, x2: 100, y2: 60 });
  });

  it("laisse la ligne inchangée si elle est déjà dans le viewBox", () => {
    const line = { x1: 10, y1: 20, x2: 80, y2: 60 };
    expect(clampLinePreviewToViewBox(line, VB)).toEqual(line);
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
