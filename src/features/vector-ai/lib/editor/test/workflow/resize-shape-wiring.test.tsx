/**
 * @vitest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import {
  makeCircleShape,
  makeEditorWithRect,
  makeEditorWithTwoRects,
  makeLineShape,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test/fixtures";
import { renderResizeWorkflow } from "@/features/vector-ai/lib/editor/test/resize-workflow-harness";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";

const SNAP_TOLERANCE = 8;

function editorWithSelectedRect() {
  const state = makeEditorWithRect("rect-1");
  state.selection = { ids: ["rect-1"] };
  state.doc.shapes = [
    makeRectShape({
      id: "rect-1",
      transform: { x: 10, y: 20 },
      w: 100,
      h: 50,
    }),
  ];
  return state;
}

function editorWithSelectedCircle() {
  const state = makeEditorWithRect();
  state.selection = { ids: ["circle-1"] };
  state.doc.shapes = [
    makeCircleShape({
      id: "circle-1",
      transform: { x: 50, y: 50 },
      r: 20,
    }),
  ];
  return state;
}

function editorWithSelectedLine() {
  const state = makeEditorWithRect();
  state.selection = { ids: ["line-1"] };
  state.doc.shapes = [
    makeLineShape({
      id: "line-1",
      transform: { x: 0, y: 0 },
      x2: 100,
      y2: 50,
    }),
  ];
  return state;
}

describe("workflow: câblage redimensionnement", () => {
  const workflows: Array<{ unmount: () => void }> = [];

  beforeAll(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    while (workflows.length > 0) {
      workflows.pop()?.unmount();
    }
  });

  function mountResizeWorkflow(
    ...args: Parameters<typeof renderResizeWorkflow>
  ) {
    const workflow = renderResizeWorkflow(...args);
    workflows.push(workflow);
    return workflow;
  }

  describe("overlays DOM", () => {
    it("affiche la zone de resize au contour pour un rectangle seul sélectionné", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [
          makeRectShape({
            id: "rect-1",
            transform: { x: 10, y: 20 },
            w: 100,
            h: 50,
          }),
        ],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          selectedIds={["rect-1"]}
          onShapePointerDown={() => {}}
          snapToleranceWorld={SNAP_TOLERANCE}
        />,
      );

      expect(markup).toContain("data-rect-resize-hit");
    });

    it("n'affiche pas la zone de resize rectangle en multi-sélection", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [
          makeRectShape({ id: "rect-a" }),
          makeRectShape({
            id: "rect-b",
            transform: { x: 120, y: 20 },
          }),
        ],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          selectedIds={["rect-a", "rect-b"]}
          onShapePointerDown={() => {}}
          snapToleranceWorld={SNAP_TOLERANCE}
        />,
      );

      expect(markup).not.toContain("data-rect-resize-hit");
    });

    it("affiche les poignées d'extrémité pour une ligne seule sélectionnée", () => {
      const doc = {
        ...createEmptyDoc(),
        shapes: [
          makeLineShape({
            id: "line-1",
            transform: { x: 0, y: 0 },
            x2: 100,
            y2: 50,
          }),
        ],
      };

      const markup = renderToStaticMarkup(
        <VectorCanvas
          doc={doc}
          selectedIds={["line-1"]}
          onLineEndPointerDown={() => {}}
        />,
      );

      expect(markup).toContain('data-line-handle="start"');
      expect(markup).toContain('data-line-handle="end"');
    });
  });

  describe("rectangle", () => {
    it("redimensionne via le contour overlay jusqu'au doc", () => {
      const workflow = mountResizeWorkflow(editorWithSelectedRect());
      const rect = workflow.getState().doc.shapes[0]!;
      if (rect.type !== "rect") throw new Error("fixture rect attendue");

      const hit = workflow.queryRectResizeHit();
      expect(hit).not.toBeNull();

      const down = { x: rect.transform.x + rect.w, y: rect.transform.y + rect.h };
      workflow.drag(hit!, down, { x: 130, y: 90 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "rect",
          transform: { x: 10, y: 20 },
          w: 120,
          h: 70,
        }),
      );
    });

    it("déplace via le corps jusqu'au doc", () => {
      const workflow = mountResizeWorkflow(editorWithSelectedRect());
      const rect = workflow.getState().doc.shapes[0]!;
      if (rect.type !== "rect") throw new Error("fixture rect attendue");

      const body = workflow.queryContentRect();
      expect(body).not.toBeNull();

      const down = {
        x: rect.transform.x + rect.w / 2,
        y: rect.transform.y + rect.h / 2,
      };
      workflow.drag(body!, down, { x: down.x + 10, y: down.y + 5 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "rect",
          transform: { x: 20, y: 25 },
        }),
      );
    });

    it("ne modifie pas le doc pour un rectangle verrouillé", () => {
      const initial = editorWithSelectedRect();
      initial.doc.shapes = [
        makeRectShape({
          id: "rect-1",
          locked: true,
          transform: { x: 10, y: 20 },
          w: 100,
          h: 50,
        }),
      ];
      const workflow = mountResizeWorkflow(initial);
      const rect = workflow.getState().doc.shapes[0]!;
      if (rect.type !== "rect") throw new Error("fixture rect attendue");

      const hit = workflow.queryRectResizeHit();
      expect(hit).not.toBeNull();

      const down = { x: rect.transform.x + rect.w, y: rect.transform.y + rect.h };
      workflow.drag(hit!, down, { x: 130, y: 90 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        initial.doc.shapes[0],
      );
    });

    it("ignore le contour hors mode sélection", () => {
      const initial = editorWithSelectedRect();
      initial.tool = "rect";
      const workflow = mountResizeWorkflow(initial);
      const rect = workflow.getState().doc.shapes[0]!;
      if (rect.type !== "rect") throw new Error("fixture rect attendue");

      const hit = workflow.queryRectResizeHit();
      expect(hit).not.toBeNull();

      const down = { x: rect.transform.x + rect.w, y: rect.transform.y + rect.h };
      workflow.drag(hit!, down, { x: 130, y: 90 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        initial.doc.shapes[0],
      );
    });
  });

  describe("cercle", () => {
    it("redimensionne via un clic sur le contour jusqu'au doc", () => {
      const workflow = mountResizeWorkflow(editorWithSelectedCircle());
      const circle = workflow.getState().doc.shapes[0]!;
      if (circle.type !== "circle") throw new Error("fixture circle attendue");

      const body = workflow.queryContentCircle();
      expect(body).not.toBeNull();

      const down = { x: circle.transform.x + circle.r, y: circle.transform.y };
      workflow.drag(body!, down, { x: 80, y: 50 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "circle",
          transform: { x: 50, y: 50 },
          r: 30,
        }),
      );
    });

    it("déplace via l'intérieur jusqu'au doc", () => {
      const workflow = mountResizeWorkflow(editorWithSelectedCircle());

      const body = workflow.queryContentCircle();
      expect(body).not.toBeNull();

      workflow.drag(body!, { x: 50, y: 50 }, { x: 60, y: 55 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "circle",
          transform: { x: 60, y: 55 },
          r: 20,
        }),
      );
    });

    it("déplace au contour en multi-sélection au lieu de redimensionner", () => {
      const initial = makeEditorWithTwoRects(["circle-1", "rect-2"]);
      initial.doc.shapes = [
        makeCircleShape({
          id: "circle-1",
          transform: { x: 50, y: 50 },
          r: 20,
        }),
        makeRectShape({
          id: "rect-2",
          transform: { x: 200, y: 30 },
          w: 80,
          h: 40,
        }),
      ];
      const workflow = mountResizeWorkflow(initial);

      const body = workflow.queryContentCircle();
      expect(body).not.toBeNull();

      workflow.drag(body!, { x: 70, y: 50 }, { x: 80, y: 50 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "circle",
          transform: { x: 60, y: 50 },
          r: 20,
        }),
      );
    });
  });

  describe("ligne", () => {
    it("déplace une extrémité via la poignée jusqu'au doc", () => {
      const workflow = mountResizeWorkflow(editorWithSelectedLine());

      const handle = workflow.queryLineHandle("end");
      expect(handle).not.toBeNull();

      workflow.drag(handle!, { x: 100, y: 50 }, { x: 120, y: 80 });

      expect(workflow.interaction.session.kind).toBe("idle");
      expect(workflow.getState().doc.shapes[0]).toEqual(
        expect.objectContaining({
          type: "line",
          transform: { x: 0, y: 0 },
          x2: 120,
          y2: 80,
        }),
      );
    });
  });
});
