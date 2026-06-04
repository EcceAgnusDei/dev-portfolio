/**
 * @vitest-environment jsdom
 */
import {
  act,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import {
  canvasBackgroundTarget,
  makePointerEvent,
  renderInteractionHook,
} from "@/features/vector-ai/lib/editor/test/pointer-harness";
import { makeEditorWithRect } from "@/features/vector-ai/lib/editor/test/fixtures";

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

type DispatchMock = ReturnType<typeof vi.fn<(action: EditorAction) => void>>;

describe("useVectorInteraction (smoke React)", () => {
  let dispatch: DispatchMock;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    dispatch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("commit au pointerup après déplacement", () => {
    const state = makeEditorWithRect("rect-1");
    const { interaction, unmount } = renderInteractionHook(state, dispatch);

    act(() => {
      interaction.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 10, clientY: 20 }),
      );
    });
    act(() => {
      interaction.onSvgPointerMove(
        makePointerEvent({ clientX: 15, clientY: 25 }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      interaction.onSvgPointerUp(
        makePointerEvent({ clientX: 15, clientY: 25 }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "rect-1",
      patch: { transform: { x: 15, y: 25 } },
    });
    expect(interaction.session.kind).toBe("idle");
    unmount();
  });

  it("capture le pointeur SVG au début d'un drag", () => {
    const state = makeEditorWithRect("rect-1");
    const { interaction, svgRef, unmount } = renderInteractionHook(state, dispatch);

    act(() => {
      interaction.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    expect(svgRef.current?.setPointerCapture).toHaveBeenCalledWith(1);
    unmount();
  });

  it("annule la session sans commit au pointercancel", () => {
    const state = makeEditorWithRect("rect-1");
    const { interaction, unmount } = renderInteractionHook(state, dispatch);

    act(() => {
      interaction.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 10, clientY: 20 }),
      );
    });
    act(() => {
      interaction.onSvgPointerCancel(
        makePointerEvent({ clientX: 10, clientY: 20 }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SHAPE_UPDATE" }),
    );
    expect(interaction.session.kind).toBe("idle");
    unmount();
  });

  it("ignore le pointerdown fond si la cible n'est pas le fond canvas", () => {
    const state = makeEditorWithRect("rect-1");
    state.tool = "rect";
    const { interaction, unmount } = renderInteractionHook(state, dispatch);

    act(() => {
      interaction.onSvgPointerDown(
        makePointerEvent({
          clientX: 10,
          clientY: 20,
          target: document.createElement("g"),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(interaction.session.kind).toBe("idle");
    expect(dispatch).not.toHaveBeenCalled();
    unmount();
  });

  it("crée un rectangle via le câblage React (smoke)", () => {
    const state = makeEditorWithRect();
    state.tool = "rect";
    const { interaction, unmount } = renderInteractionHook(state, dispatch);

    act(() => {
      interaction.onSvgPointerDown(
        makePointerEvent({
          clientX: 10,
          clientY: 20,
          target: canvasBackgroundTarget(),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      interaction.onSvgPointerMove(
        makePointerEvent({ clientX: 50, clientY: 60 }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      interaction.onSvgPointerUp(
        makePointerEvent({ clientX: 50, clientY: 60 }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SHAPE_ADD" }),
    );
    unmount();
  });
});
