import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  makeCircleShape,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import { ShapeView } from "@/features/vector-ai/lib/view/shape-view";

describe("ShapeView", () => {
  it("rend un rect aux coords transform sans groupe", () => {
    const markup = renderToStaticMarkup(<ShapeView shape={makeRectShape()} />);

    expect(markup).toMatch(/^<rect\b/);
    expect(markup).toContain('x="10"');
    expect(markup).toContain('y="20"');
    expect(markup).toContain('width="100"');
    expect(markup).toContain('height="50"');
    expect(markup).toContain('fill="#000000"');
    expect(markup).not.toContain("<g");
  });

  it("enveloppe un rect tourné dans un groupe avec coords locales", () => {
    const markup = renderToStaticMarkup(
      <ShapeView
        shape={makeRectShape({
          transform: { x: 50, y: 50, r: 45 },
        })}
      />,
    );

    expect(markup).toContain('transform="translate(50 50) rotate(45)"');
    expect(markup).toContain('x="0"');
    expect(markup).toContain('y="0"');
  });

  it("rend un circle centré sur transform.x/y", () => {
    const markup = renderToStaticMarkup(
      <ShapeView shape={makeCircleShape()} onPointerDown={() => {}} />,
    );

    expect(markup).toMatch(/^<g\b/);
    expect(markup).toContain('cx="200"');
    expect(markup).toContain('cy="120"');
    expect(markup).toContain('r="50"'); //cercle de hit invisible
    expect(markup).toContain('r="40"');
  });

  it("rend une line avec points absolus", () => {
    const markup = renderToStaticMarkup(
      <ShapeView shape={makeLineShape()} onPointerDown={() => {}} />,
    );

    expect(markup).toMatch(/^<g\b/);
    expect(markup).toContain('x1="80"');
    expect(markup).toContain('y1="280"');
    expect(markup).toContain('x2="320"');
    expect(markup).toContain('y2="320"');
    expect(markup.match(/<line\b/g)?.length).toBe(2); //2 lignes: la visible et la ligne de hit
  });

  it("convertit une line en coords locales dans un groupe transformé", () => {
    const markup = renderToStaticMarkup(
      <ShapeView
        shape={makeLineShape({
          transform: { x: 80, y: 280, r: 15 },
        })}
        onPointerDown={() => {}}
      />,
    );

    expect(markup).toMatch(/^<g\b/);
    expect(markup).toContain('transform="translate(80 280) rotate(15)"');
    expect(markup.match(/<line\b/g)?.length).toBe(2);
    expect(markup).toContain('x1="0"');
    expect(markup).toContain('y1="0"');
    expect(markup).toContain('x2="240"');
    expect(markup).toContain('y2="40"');
  });

  it("conserve le style d'origine sans contour de sélection", () => {
    const markup = renderToStaticMarkup(<ShapeView shape={makeRectShape()} />);

    expect(markup).toContain('fill="#000000"');
    expect(markup).toContain('stroke="none"');
    expect(markup).not.toContain('stroke="var(--primary)"');
  });
});
