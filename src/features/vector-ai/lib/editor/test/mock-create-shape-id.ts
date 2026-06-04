import { vi } from "vitest";

vi.mock("@/features/vector-ai/lib/document/schema", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/vector-ai/lib/document/schema")
    >();
  return {
    ...actual,
    createShapeId: () => "new-shape-id",
  };
});
