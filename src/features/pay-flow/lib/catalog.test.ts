import { describe, expect, it } from "vitest";

import {
  ResolveCartError,
  resolveCartLines,
} from "@/features/pay-flow/lib/catalog";

describe("resolveCartLines", () => {
  it("résout une ligne valide avec les prix du catalogue", () => {
    const result = resolveCartLines([
      { productId: "buste-socrate", qty: 2 },
    ]);

    expect(result).toEqual({
      lines: [
        {
          productId: "buste-socrate",
          qty: 2,
          name: "Buste de Socrate",
          unitAmountCents: 8900,
          lineTotalCents: 17800,
        },
      ],
      totalCents: 17800,
    });
  });

  it("résout plusieurs produits et additionne le total", () => {
    const result = resolveCartLines([
      { productId: "buste-socrate", qty: 1 },
      { productId: "buste-aristote", qty: 2 },
    ]);

    expect(result.lines).toHaveLength(2);
    expect(result.totalCents).toBe(8900 + 7900 * 2);
  });

  it("fusionne les lignes avec le même productId", () => {
    const result = resolveCartLines([
      { productId: "buste-seneque", qty: 1 },
      { productId: "buste-seneque", qty: 3 },
    ]);

    expect(result.lines).toEqual([
      {
        productId: "buste-seneque",
        qty: 4,
        name: "Buste de Sénèque",
        unitAmountCents: 6900,
        lineTotalCents: 27600,
      },
    ]);
    expect(result.totalCents).toBe(27600);
  });

  it("rejette un panier vide", () => {
    expect(() => resolveCartLines([])).toThrow(ResolveCartError);
    expect(() => resolveCartLines([])).toThrow("Le panier est vide.");
  });

  it("rejette un produit inconnu", () => {
    expect(() =>
      resolveCartLines([{ productId: "buste-inexistant", qty: 1 }]),
    ).toThrow(ResolveCartError);
    expect(() =>
      resolveCartLines([{ productId: "buste-inexistant", qty: 1 }]),
    ).toThrow('Produit inconnu : « buste-inexistant ».');
  });

  it("rejette une quantité nulle ou négative", () => {
    expect(() =>
      resolveCartLines([{ productId: "buste-socrate", qty: 0 }]),
    ).toThrow(ResolveCartError);
    expect(() =>
      resolveCartLines([{ productId: "buste-socrate", qty: -1 }]),
    ).toThrow(ResolveCartError);
  });

  it("rejette une quantité non entière", () => {
    expect(() =>
      resolveCartLines([{ productId: "buste-socrate", qty: 1.5 }]),
    ).toThrow(ResolveCartError);
  });

  it("rejette une quantité supérieure à 99 sur une ligne", () => {
    expect(() =>
      resolveCartLines([{ productId: "buste-socrate", qty: 100 }]),
    ).toThrow(ResolveCartError);
  });

  it("rejette une quantité fusionnée supérieure à 99", () => {
    expect(() =>
      resolveCartLines([
        { productId: "buste-socrate", qty: 50 },
        { productId: "buste-socrate", qty: 50 },
      ]),
    ).toThrow(ResolveCartError);
    expect(() =>
      resolveCartLines([
        { productId: "buste-socrate", qty: 50 },
        { productId: "buste-socrate", qty: 50 },
      ]),
    ).toThrow('La quantité pour « buste-socrate » dépasse la limite (99).');
  });

  it("rejette une entrée qui n'est pas un tableau de lignes", () => {
    expect(() => resolveCartLines(null)).toThrow(ResolveCartError);
    expect(() => resolveCartLines({ productId: "buste-socrate", qty: 1 })).toThrow(
      ResolveCartError,
    );
  });
});
