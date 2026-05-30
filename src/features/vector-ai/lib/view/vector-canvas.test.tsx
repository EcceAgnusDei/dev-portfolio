import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import {
  makeCircleShape,
  makeLineShape,
  makeRectShape,
  makeSampleDoc,
} from "@/features/vector-ai/lib/editor/test-fixtures";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";

describe("VectorCanvas", () => {
  it("rend le viewBox et les calques", () => {
    const markup = renderToStaticMarkup(
      <VectorCanvas doc={makeSampleDoc()} aria-label="Test canvas" />,
    );

    expect(markup).toMatch(/^<svg\b/);
    expect(markup).toContain('viewBox="0 0 800 600"');
    expect(markup).toContain('aria-label="Test canvas"');
    expect(markup).toContain('data-layer="content"');
    expect(markup).toContain('data-layer="overlay"');
  });

  it("rend toutes les formes du document", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [
        makeRectShape({
          id: "rect-a",
          transform: { x: 10, y: 20 },
          w: 100,
          h: 50,
          style: { fill: "#111111", stroke: "none" },
        }),
        makeRectShape({
          id: "rect-b",
          transform: { x: 200, y: 30 },
          w: 80,
          h: 40,
          style: { fill: "#222222", stroke: "none" },
        }),
        makeCircleShape({
          id: "circle-a",
          transform: { x: 150, y: 150 },
          r: 30,
        }),
        makeCircleShape({
          id: "circle-b",
          transform: { x: 400, y: 250 },
          r: 20,
          style: { fill: "#333333", stroke: "none" },
        }),
        makeLineShape({
          id: "line-a",
          transform: { x: 0, y: 0 },
          x2: 50,
          y2: 50,
        }),
        makeLineShape({
          id: "line-b",
          transform: { x: 80, y: 280 },
          x2: 320,
          y2: 320,
        }),
      ],
    };

    const markup = renderToStaticMarkup(<VectorCanvas doc={doc} />);

    expect(doc.shapes).toHaveLength(6);
    expect(markup.match(/<rect\b/g)?.length).toBe(3);
    expect(markup.match(/<circle\b/g)?.length).toBe(2);
    expect(markup.match(/<line\b/g)?.length).toBe(2);

    expect(markup).toContain('x="10"');
    expect(markup).toContain('width="100"');
    expect(markup).toContain('fill="#111111"');
    expect(markup).toContain('x="200"');
    expect(markup).toContain('width="80"');
    expect(markup).toContain('fill="#222222"');

    expect(markup).toContain('cx="150"');
    expect(markup).toContain('r="30"');
    expect(markup).toContain('cx="400"');
    expect(markup).toContain('r="20"');

    expect(markup).toContain('x2="50"');
    expect(markup).toContain('y2="50"');
    expect(markup).toContain('x2="320"');
    expect(markup).toContain('y2="320"');
  });

  it("marque la forme sélectionnée", () => {
    const markup = renderToStaticMarkup(
      <VectorCanvas doc={makeSampleDoc()} selectedIds={["rect-1"]} />,
    );

    expect(markup).toContain('fill="#111111"');
    expect(markup).toContain('stroke="var(--primary)"');
  });
});
