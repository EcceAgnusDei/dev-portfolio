import { describe, expect, it } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import {
  makeCircleShape,
  makeLineShape,
  makeRectShape,
  makeSampleDoc,
} from "@/features/vector-ai/lib/editor/test-fixtures";
import { serializeToSvg } from "@/features/vector-ai/lib/view/serialize-to-svg";

describe("serializeToSvg", () => {
  it("produit un svg valide avec viewBox et namespace pour un document vide", () => {
    const svg = serializeToSvg(createEmptyDoc());

    expect(svg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">\n</svg>',
    );
    expect(svg).not.toContain("width=");
    expect(svg).not.toContain("height=");
  });

  it("utilise le viewBox du document", () => {
    const doc = {
      ...createEmptyDoc(),
      viewBox: { x: 10, y: 20, w: 400, h: 300 },
    };

    const svg = serializeToSvg(doc);

    expect(svg).toContain('viewBox="10 20 400 300"');
  });

  it("ajoute width et height quand ils sont fournis", () => {
    const svg = serializeToSvg(createEmptyDoc(), {
      width: 800,
      height: 600,
    });

    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="600"');
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 800 600" width="800" height="600">/,
    );
  });

  it("n'ajoute que width ou height si un seul est fourni", () => {
    const withWidth = serializeToSvg(createEmptyDoc(), { width: 640 });
    const withHeight = serializeToSvg(createEmptyDoc(), { height: 480 });

    expect(withWidth).toContain('width="640"');
    expect(withWidth).not.toContain("height=");
    expect(withHeight).toContain('height="480"');
    expect(withHeight).not.toContain("width=");
  });

  it("accepte width à 0", () => {
    const svg = serializeToSvg(createEmptyDoc(), { width: 0 });

    expect(svg).toContain('width="0"');
  });

  it("conserve l'ordre des formes", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [
        makeRectShape({ id: "first" }),
        makeCircleShape({ id: "second" }),
        makeLineShape({ id: "third" }),
      ],
    };

    const svg = serializeToSvg(doc);
    const rectPos = svg.indexOf("<rect");
    const circlePos = svg.indexOf("<circle");
    const linePos = svg.indexOf("<line");

    expect(rectPos).toBeGreaterThan(-1);
    expect(circlePos).toBeGreaterThan(rectPos);
    expect(linePos).toBeGreaterThan(circlePos);
  });

  it("sérialise un rect sans groupe quand il n'y a pas de rotation ni scale", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [makeRectShape()],
    };

    const svg = serializeToSvg(doc);

    expect(svg).toContain('<rect x="10" y="20" width="100" height="50"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain("<g ");
  });

  it("enveloppe un rect transformé dans un groupe", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [
        makeRectShape({
          transform: { x: 50, y: 50, r: 45 },
        }),
      ],
    };

    const svg = serializeToSvg(doc);

    expect(svg).toContain(
      '<g transform="translate(50 50) rotate(45)"><rect x="0" y="0"',
    );
  });

  it("sérialise une line en coordonnées locales dans un groupe transformé", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [
        makeLineShape({
          transform: { x: 80, y: 280, r: 15 },
        }),
      ],
    };

    const svg = serializeToSvg(doc);

    expect(svg).toContain('transform="translate(80 280) rotate(15)"');
    expect(svg).toContain('<line x1="0" y1="0" x2="240" y2="40"');
  });

  it("convertit strokeWidth en attribut kebab-case", () => {
    const doc = {
      ...createEmptyDoc(),
      shapes: [makeCircleShape()],
    };

    const svg = serializeToSvg(doc);

    expect(svg).toContain('stroke-width="2"');
  });

  it("n'inclut pas d'éléments d'interface éditeur", () => {
    const svg = serializeToSvg(makeSampleDoc());

    expect(svg).not.toContain("var(--primary)");
    expect(svg).not.toContain("vector-effect");
    expect(svg).not.toContain('data-layer="');
    expect(svg).not.toContain('fill="var(--background)"');
  });

  it("rend un document avec rect, circle et line", () => {
    const svg = serializeToSvg(makeSampleDoc());

    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain("<rect");
    expect(svg).toContain("<circle");
    expect(svg).toContain("<line");

    expect(svg).toContain('x="50"');
    expect(svg).toContain('y="50"');
    expect(svg).toContain('width="140"');
    expect(svg).toContain('height="90"');
    expect(svg).toContain('fill="#111111"');

    expect(svg).toContain('cx="200"');
    expect(svg).toContain('cy="120"');
    expect(svg).toContain('r="40"');
    expect(svg).toContain('stroke="#000000"');

    expect(svg).toContain('x1="80"');
    expect(svg).toContain('y1="280"');
    expect(svg).toContain('x2="320"');
    expect(svg).toContain('y2="320"');
    expect(svg).toContain('stroke-width="2"');
  });
});
