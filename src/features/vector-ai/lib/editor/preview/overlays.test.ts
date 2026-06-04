import { describe, expect, it } from "vitest";

import { getSessionPreviews } from "@/features/vector-ai/lib/editor/preview/overlays";

describe("getSessionPreviews", () => {
  const viewBox = { x: 0, y: 0, w: 100, h: 100 };

  it("retourne des previews vides en idle ou move", () => {
    expect(getSessionPreviews({ kind: "idle" }, viewBox)).toEqual({
      rect: null,
      circle: null,
      line: null,
    });
    expect(
      getSessionPreviews(
        {
          kind: "move",
          pointerId: 1,
          shapeId: "r",
          startWorld: { x: 0, y: 0 },
          currentWorld: { x: 5, y: 5 },
          startTransform: { x: 0, y: 0 },
        },
        viewBox,
      ),
    ).toEqual({
      rect: null,
      circle: null,
      line: null,
    });
  });
});
