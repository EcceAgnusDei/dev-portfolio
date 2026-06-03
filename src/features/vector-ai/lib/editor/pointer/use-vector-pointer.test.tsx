/**
 * @vitest-environment jsdom
 */
import {
  act,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createRoot } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  EditorAction,
  EditorState,
} from "@/features/vector-ai/lib/editor/state";
import { useVectorPointer } from "@/features/vector-ai/lib/editor/pointer/use-vector-pointer";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test-fixtures";

vi.mock("@/features/vector-ai/lib/editor/pointer/screen-to-world", () => ({
  screenToWorld: vi.fn(
    (_svg: SVGSVGElement, clientX: number, clientY: number) => ({
      x: clientX,
      y: clientY,
    }),
  ),
}));

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

function renderHook<T>(useHook: () => T): {
  result: { current: T };
  rerender: () => void;
  unmount: () => void;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: null as T | null };

  function HookHost() {
    result.current = useHook();
    return null;
  }

  act(() => {
    root.render(<HookHost />);
  });

  return {
    get result() {
      if (result.current === null) {
        throw new Error("Hook non initialisé.");
      }
      return { current: result.current };
    },
    rerender() {
      act(() => {
        root.render(<HookHost />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}

function makePointerEvent(options: {
  pointerId?: number;
  clientX: number;
  clientY: number;
  target?: Element;
}): ReactPointerEvent {
  const target = options.target ?? document.createElement("div");
  return {
    pointerId: options.pointerId ?? 1,
    clientX: options.clientX,
    clientY: options.clientY,
    target,
    stopPropagation: vi.fn(),
  } as unknown as ReactPointerEvent;
}

function canvasBackgroundTarget(): Element {
  const el = document.createElement("rect");
  el.setAttribute("data-canvas-background", "true");
  return el;
}

function setupSvgRef(): RefObject<SVGSVGElement | null> {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setPointerCapture = vi.fn();
  svg.releasePointerCapture = vi.fn();
  svg.hasPointerCapture = vi.fn(() => true);
  return { current: svg };
}

type DispatchMock = ReturnType<typeof vi.fn<(action: EditorAction) => void>>;

function mountPointer(state: EditorState, dispatch: DispatchMock) {
  const svgRef = setupSvgRef();
  const hook = renderHook(() => useVectorPointer({ state, dispatch, svgRef }));
  return { hook, svgRef };
}

describe("useVectorPointer", () => {
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

  it("désélectionne au clic sur le fond en mode select", () => {
    const state = makeEditorWithRect("rect-1");
    state.selection.ids = ["rect-1"];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onSvgPointerDown(
        makePointerEvent({
          clientX: 5,
          clientY: 5,
          target: canvasBackgroundTarget(),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SELECTION_SET",
      ids: [],
    });
    hook.unmount();
  });

  it("déplace un rectangle et commit au pointerup", () => {
    const state = makeEditorWithRect("rect-1");
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 10, clientY: 20 }),
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SELECTION_SET",
      ids: ["rect-1"],
    });
    expect(hook.result.current.session.kind).toBe("move");

    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 15,
          clientY: 25,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    const moved = hook.result.current.displayDoc.shapes[0];
    expect(moved?.type).toBe("rect");
    if (moved?.type === "rect") {
      expect(moved.transform).toEqual({ x: 15, y: 25 });
    }

    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 15,
          clientY: 25,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "rect-1",
      patch: {
        transform: { x: 15, y: 25 },
      },
    });
    expect(hook.result.current.session.kind).toBe("idle");
    hook.unmount();
  });

  it("commit un déplacement de rectangle borné au viewBox", () => {
    const state = makeEditorWithRect("rect-1");
    state.doc.viewBox = { x: 0, y: 0, w: 100, h: 100 };
    state.doc.shapes = [
      makeRectShape({
        id: "rect-1",
        transform: { x: 10, y: 20 },
        w: 30,
        h: 20,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 200,
          clientY: 200,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 200,
          clientY: 200,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "rect-1",
      patch: {
        transform: { x: 70, y: 80 },
      },
    });
    hook.unmount();
  });

  it("commit un déplacement de ligne borné au viewBox", () => {
    const state = makeEditorWithRect();
    state.doc.viewBox = { x: 0, y: 0, w: 100, h: 100 };
    state.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 90, y: 10 },
        x2: 110,
        y2: 20,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "line-1",
        makePointerEvent({ clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 20,
          clientY: 0,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 20,
          clientY: 0,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "line-1",
      patch: {
        transform: { x: 80, y: 10 },
        x2: 100,
      },
    });
    hook.unmount();
  });

  it("commit un déplacement d'extrémité de ligne borné au viewBox", () => {
    const state = makeEditorWithRect();
    state.doc.viewBox = { x: 0, y: 0, w: 100, h: 100 };
    state.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 50,
        y2: 50,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onLineEndPointerDown(
        "line-1",
        "end",
        makePointerEvent({ clientX: 50, clientY: 50 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 150,
          clientY: 150,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 150,
          clientY: 150,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "line-1",
      patch: {
        x2: 100,
        y2: 100,
      },
    });
    hook.unmount();
  });

  it("commit un déplacement de cercle borné au viewBox", () => {
    const state = makeEditorWithRect();
    state.doc.viewBox = { x: 0, y: 0, w: 100, h: 100 };
    state.doc.shapes = [
      makeCircleShape({
        id: "circle-1",
        transform: { x: 50, y: 50 },
        r: 10,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "circle-1",
        makePointerEvent({ clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 200,
          clientY: 200,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 200,
          clientY: 200,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "circle-1",
      patch: {
        transform: { x: 90, y: 90 },
      },
    });
    hook.unmount();
  });

  it("déplace une ligne en mettant à jour transform et x2/y2", () => {
    const state = makeEditorWithRect("rect-1");
    state.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "line-1",
        makePointerEvent({ clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 5,
          clientY: 10,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 5,
          clientY: 10,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "line-1",
      patch: {
        transform: { x: 5, y: 10 },
        x2: 105,
        y2: 60,
      },
    });
    hook.unmount();
  });

  it("déplace uniquement l'extrémité de départ d'une ligne", () => {
    const state = makeEditorWithRect();
    state.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onLineEndPointerDown(
        "line-1",
        "start",
        makePointerEvent({ clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 20,
          clientY: 30,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 20,
          clientY: 30,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "line-1",
      patch: {
        transform: { x: 20, y: 30 },
      },
    });
    hook.unmount();
  });

  it("déplace uniquement l'extrémité de fin d'une ligne", () => {
    const state = makeEditorWithRect();
    state.doc.shapes = [
      makeLineShape({
        id: "line-1",
        transform: { x: 0, y: 0 },
        x2: 100,
        y2: 50,
      }),
    ];
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onLineEndPointerDown(
        "line-1",
        "end",
        makePointerEvent({ clientX: 100, clientY: 50 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 120,
          clientY: 80,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 120,
          clientY: 80,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_UPDATE",
      id: "line-1",
      patch: {
        x2: 120,
        y2: 80,
      },
    });
    hook.unmount();
  });

  it("crée un rectangle au drag en mode rect", () => {
    const state = makeEditorWithRect();
    state.tool = "rect";
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onSvgPointerDown(
        makePointerEvent({
          clientX: 10,
          clientY: 20,
          target: canvasBackgroundTarget(),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 50,
          clientY: 60,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(hook.result.current.rectPreview).toEqual({
      x: 10,
      y: 20,
      w: 40,
      h: 40,
    });

    act(() => {
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 50,
          clientY: 60,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).toHaveBeenCalledWith({
      type: "SHAPE_ADD",
      shape: expect.objectContaining({
        id: "new-shape-id",
        type: "rect",
        transform: { x: 10, y: 20 },
        w: 40,
        h: 40,
      }),
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "SELECTION_SET",
      ids: ["new-shape-id"],
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "TOOL_SET",
      tool: "select",
    });
    hook.unmount();
  });

  it("borne le rectPreview au viewBox lors de la création", () => {
    const state = makeEditorWithRect();
    state.tool = "rect";
    state.doc.viewBox = { x: 0, y: 0, w: 100, h: 100 };
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onSvgPointerDown(
        makePointerEvent({
          clientX: 80,
          clientY: 80,
          target: canvasBackgroundTarget(),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });
    act(() => {
      hook.result.current.onSvgPointerMove(
        makePointerEvent({
          clientX: 150,
          clientY: 150,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(hook.result.current.rectPreview).toEqual({
      x: 80,
      y: 80,
      w: 20,
      h: 20,
    });
    hook.unmount();
  });

  it("n'ajoute pas un rectangle trop petit", () => {
    const state = makeEditorWithRect();
    state.tool = "rect";
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onSvgPointerDown(
        makePointerEvent({
          clientX: 10,
          clientY: 20,
          target: canvasBackgroundTarget(),
        }) as ReactPointerEvent<SVGSVGElement>,
      );
      hook.result.current.onSvgPointerUp(
        makePointerEvent({
          clientX: 11,
          clientY: 21,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SHAPE_ADD" }),
    );
    hook.unmount();
  });

  it("annule la session sans commit", () => {
    const state = makeEditorWithRect("rect-1");
    const { hook } = mountPointer(state, dispatch);

    act(() => {
      hook.result.current.onShapePointerDown(
        "rect-1",
        makePointerEvent({ clientX: 10, clientY: 20 }),
      );
    });
    act(() => {
      hook.result.current.onSvgPointerCancel(
        makePointerEvent({
          clientX: 10,
          clientY: 20,
        }) as ReactPointerEvent<SVGSVGElement>,
      );
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SHAPE_UPDATE" }),
    );
    expect(hook.result.current.session.kind).toBe("idle");
    hook.unmount();
  });

  it("expose shapePointerEvents auto en select et none en rect", () => {
    const selectState = makeEditorWithRect();
    const selectHook = mountPointer(selectState, dispatch);
    expect(selectHook.hook.result.current.shapePointerEvents).toBe("auto");
    selectHook.hook.unmount();

    const rectState = makeEditorWithRect();
    rectState.tool = "rect";
    const rectHook = mountPointer(rectState, dispatch);
    expect(rectHook.hook.result.current.shapePointerEvents).toBe("none");
    rectHook.hook.unmount();
  });
});
