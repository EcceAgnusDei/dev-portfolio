import { describe, expect, it } from "vitest";

import { applyShapePatch } from "@/features/vector-ai/lib/editor/core/shape-patch";
import { makeRectShape } from "@/features/vector-ai/lib/editor/test/fixtures";

describe("applyShapePatch", () => {
  it("fusionne transform partiellement", () => {
    const shape = makeRectShape();
    const next = applyShapePatch(shape, { transform: { x: 99 } });
    expect(next.transform).toEqual({ x: 99, y: 20 });
  });

  it("fusionne style partiellement", () => {
    const shape = makeRectShape();
    const next = applyShapePatch(shape, { style: { fill: "#ff0000" } });
    expect(next.style.fill).toBe("#ff0000");
    expect(next.style.stroke).toBe("none");
  });

  it("met à jour les dimensions d'un rectangle", () => {
    const shape = makeRectShape();
    const next = applyShapePatch(shape, { w: 200, h: 80 });
    expect(next.type).toBe("rect");
    if (next.type === "rect") {
      expect(next.w).toBe(200);
      expect(next.h).toBe(80);
    }
  });

  it("conserve id et type", () => {
    const shape = makeRectShape({ id: "keep-me" });
    const next = applyShapePatch(shape, { name: "Label" });
    expect(next.id).toBe("keep-me");
    expect(next.type).toBe("rect");
    expect(next.name).toBe("Label");
  });
});
