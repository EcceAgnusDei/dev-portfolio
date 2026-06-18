import { vi } from "vitest";

const mocks = vi.hoisted(() => {
  let shapeIdCounter = 0;
  return {
    geminiVectorAiOpsMock: vi.fn(),
    checkRateLimitMock: vi.fn<
      [string, number, number],
      { ok: true } | { ok: false; retryAfterSec: number }
    >(() => ({ ok: true })),
    nextShapeId: () => `new-shape-id-${++shapeIdCounter}`,
    resetShapeIdCounter: () => {
      shapeIdCounter = 0;
    },
  };
});

export const geminiVectorAiOpsMock = mocks.geminiVectorAiOpsMock;
export const checkRateLimitMock = mocks.checkRateLimitMock;
export const resetShapeIdCounter = mocks.resetShapeIdCounter;

vi.mock("@/features/vector-ai/lib/document/schema", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/vector-ai/lib/document/schema")
    >();
  return {
    ...actual,
    createShapeId: mocks.nextShapeId,
  };
});

vi.mock("@/features/vector-ai/lib/editor/ai/gemini-vector-ai-llm", () => ({
  geminiVectorAiOps: mocks.geminiVectorAiOpsMock,
}));

vi.mock("@/features/pixel-ai/lib/rate-limit-ip", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/pixel-ai/lib/rate-limit-ip")
    >();
  return {
    ...actual,
    checkRateLimit: mocks.checkRateLimitMock,
  };
});
