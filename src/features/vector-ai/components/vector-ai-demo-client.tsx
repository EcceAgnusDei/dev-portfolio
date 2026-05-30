"use client";

import { useReducer } from "react";

import { Button } from "@/components/ui/button";
import { createShapeId } from "@/features/vector-ai/lib/document/schema";
import { editorReducer } from "@/features/vector-ai/lib/editor/reducer";
import { canRedo, canUndo } from "@/features/vector-ai/lib/editor/selectors";
import {
  makeEditorWithSampleDoc,
  makeRectShape,
} from "@/features/vector-ai/lib/editor/test-fixtures";
import { VectorCanvas } from "@/features/vector-ai/lib/view/vector-canvas";

export function VectorAiDemoClient() {
  const [state, dispatch] = useReducer(editorReducer, null, makeEditorWithSampleDoc);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUndo(state)}
          onClick={() => dispatch({ type: "UNDO" })}
        >
          Annuler
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canRedo(state)}
          onClick={() => dispatch({ type: "REDO" })}
        >
          Rétablir
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            dispatch({
              type: "SHAPE_ADD",
              shape: makeRectShape({
                id: createShapeId(),
                transform: {
                  x: 100 + Math.random() * 200,
                  y: 100 + Math.random() * 150,
                },
              }),
            })
          }
        >
          Ajouter un rectangle
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "SELECTION_SET", ids: ["rect-1"] })}
        >
          Sélectionner rect-1
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "SELECTION_SET", ids: [] })}
        >
          Désélectionner
        </Button>
      </div>
      <div className="aspect-[4/3] w-full max-w-3xl">
        <VectorCanvas doc={state.doc} selectedIds={state.selection.ids} />
      </div>
    </div>
  );
}
