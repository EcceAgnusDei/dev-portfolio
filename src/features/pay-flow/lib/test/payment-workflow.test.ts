import { beforeEach, describe, expect, it } from "vitest";

import {
  ResolveCartError,
  resolveCartLines,
} from "@/features/pay-flow/lib/catalog";
import { getOrderStatus } from "@/features/pay-flow/lib/get-order-status";
import {
  clearOrderStore,
  createPendingOrder,
  getOrder,
  markOrderExpired,
  markOrderPaid,
} from "@/features/pay-flow/lib/order-store";

describe("workflow: paiement Pay Flow", () => {
  beforeEach(() => {
    clearOrderStore();
  });

  describe("1. Résolution du panier", () => {
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
      expect(() =>
        resolveCartLines({ productId: "buste-socrate", qty: 1 }),
      ).toThrow(ResolveCartError);
    });
  });

  describe("2. Commande pending", () => {
    it("crée une commande pending à partir d'un panier résolu", () => {
      const cart = resolveCartLines([
        { productId: "buste-socrate", qty: 1 },
      ]);

      const order = createPendingOrder({
        sessionId: "cs_test_pending_1",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });

      expect(order.status).toBe("pending");
      expect(order.sessionId).toBe("cs_test_pending_1");
      expect(order.totalCents).toBe(8900);
      expect(order.lines).toEqual(cart.lines);
      expect(order.paidAt).toBeUndefined();
      expect(getOrder("cs_test_pending_1")).toEqual(order);
    });
  });

  describe("3. Transitions de statut (paid / expired)", () => {
    it("passe pending → paid et pose paidAt", () => {
      const cart = resolveCartLines([
        { productId: "buste-aristote", qty: 2 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_paid_1",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });

      const paid = markOrderPaid("cs_test_paid_1");

      expect(paid?.status).toBe("paid");
      expect(paid?.paidAt).toEqual(expect.any(Number));
      expect(getOrder("cs_test_paid_1")?.status).toBe("paid");
    });

    it("est idempotent si la commande est déjà paid", () => {
      const cart = resolveCartLines([
        { productId: "buste-seneque", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_paid_2",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });
      const first = markOrderPaid("cs_test_paid_2");
      const second = markOrderPaid("cs_test_paid_2");

      expect(second).toEqual(first);
    });

    it("passe pending → expired", () => {
      const cart = resolveCartLines([
        { productId: "buste-socrate", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_expired_1",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });

      const expired = markOrderExpired("cs_test_expired_1");

      expect(expired?.status).toBe("expired");
      expect(expired?.paidAt).toBeUndefined();
    });

    it("ne rétrograde pas une commande déjà paid vers expired", () => {
      const cart = resolveCartLines([
        { productId: "buste-socrate", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_paid_keep",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });
      markOrderPaid("cs_test_paid_keep");

      const afterExpire = markOrderExpired("cs_test_paid_keep");

      expect(afterExpire?.status).toBe("paid");
      expect(afterExpire?.paidAt).toEqual(expect.any(Number));
    });

    it("retourne undefined pour une session inconnue", () => {
      expect(markOrderPaid("cs_unknown")).toBeUndefined();
      expect(markOrderExpired("cs_unknown")).toBeUndefined();
    });
  });

  describe("4. Lecture du statut de commande", () => {
    it("renvoie not_found pour une session inconnue", () => {
      expect(getOrderStatus("cs_missing")).toEqual({ status: "not_found" });
    });

    it("renvoie pending avec lignes et total", () => {
      const cart = resolveCartLines([
        { productId: "buste-socrate", qty: 1 },
        { productId: "buste-seneque", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_status_pending",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });

      expect(getOrderStatus("cs_test_status_pending")).toEqual({
        status: "pending",
        sessionId: "cs_test_status_pending",
        totalCents: cart.totalCents,
        lines: cart.lines,
      });
    });

    it("renvoie paid avec paidAt", () => {
      const cart = resolveCartLines([
        { productId: "buste-aristote", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_status_paid",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });
      markOrderPaid("cs_test_status_paid");

      const status = getOrderStatus("cs_test_status_paid");
      expect(status.status).toBe("paid");
      if (status.status === "paid") {
        expect(status.totalCents).toBe(7900);
        expect(status.paidAt).toEqual(expect.any(Number));
        expect(status.lines).toEqual(cart.lines);
      }
    });

    it("renvoie expired sans paidAt", () => {
      const cart = resolveCartLines([
        { productId: "buste-seneque", qty: 1 },
      ]);
      createPendingOrder({
        sessionId: "cs_test_status_expired",
        lines: cart.lines,
        totalCents: cart.totalCents,
      });
      markOrderExpired("cs_test_status_expired");

      expect(getOrderStatus("cs_test_status_expired")).toEqual({
        status: "expired",
        sessionId: "cs_test_status_expired",
        totalCents: 6900,
        lines: cart.lines,
      });
    });
  });
});
