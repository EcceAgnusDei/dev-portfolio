import { createEmptyDoc } from "@/features/vector-ai/lib/document/schema";
import type {
  PathSegmentLocal,
  VectorDoc,
} from "@/features/vector-ai/lib/document/types";
export type EditorTool =
  | "select"
  | "rect"
  | "circle"
  | "line"
  | "cubic"
  | "text";

export type EditorHistory = {
  past: VectorDoc[];
  future: VectorDoc[];
};

export type EditorState = {
  doc: VectorDoc;
  selection: { ids: string[] };
  tool: EditorTool;
  history: EditorHistory;
};

export type ShapePatch = {
  transform?: Partial<VectorDoc["shapes"][number]["transform"]>;
  style?: Partial<VectorDoc["shapes"][number]["style"]>;
  locked?: boolean;
  name?: string;
  w?: number;
  h?: number;
  rx?: number;
  r?: number;
  x2?: number;
  y2?: number;
  segments?: PathSegmentLocal[];
  content?: string;
  fontSize?: number;
  fontFamily?: string;
};

export type EditorAction =
  | { type: "DOC_SET"; doc: VectorDoc; recordHistory?: boolean }
  | {
      type: "SHAPE_ADD";
      shape: VectorDoc["shapes"][number];
      recordHistory?: boolean;
    }
  | {
      type: "SHAPE_UPDATE";
      id: string;
      patch: ShapePatch;
      recordHistory?: boolean;
    }
  | { type: "SHAPE_DELETE"; id: string; recordHistory?: boolean }
  | {
      type: "VIEWBOX_SET";
      viewBox: VectorDoc["viewBox"];
      recordHistory?: boolean;
    }
  | { type: "SELECTION_SET"; ids: string[] }
  | { type: "TOOL_SET"; tool: EditorTool }
  | { type: "UNDO" }
  | { type: "REDO" };

export function createInitialEditorState(doc?: VectorDoc): EditorState {
  return {
    doc: doc ?? createEmptyDoc(),
    selection: { ids: [] },
    tool: "select",
    history: { past: [], future: [] },
  };
}
