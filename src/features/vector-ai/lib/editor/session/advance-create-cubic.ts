import type { ViewBox } from "@/features/vector-ai/lib/document/types";
import type { DraftStyle } from "@/features/vector-ai/lib/editor/core/draft-style";
import type { WorldPoint } from "@/features/vector-ai/lib/editor/geometry/world-point";
import {
  commitCreateCubicFromWorld,
  shouldIgnoreCubicClick,
} from "@/features/vector-ai/lib/editor/dispatch/create-cubic";
import type { EditorAction } from "@/features/vector-ai/lib/editor/core/state";
import type { PointerSession } from "@/features/vector-ai/lib/editor/session/types";
import { IDLE_POINTER_SESSION } from "@/features/vector-ai/lib/editor/session/types";

export type AdvanceCreateCubicResult = {
  session: PointerSession;
  actions: EditorAction[];
};

export function advanceCreateCubicSession(
  session: Extract<PointerSession, { kind: "create-cubic" }>,
  world: WorldPoint,
  viewBox: ViewBox,
  draftStyle: DraftStyle,
): AdvanceCreateCubicResult {
  if (shouldIgnoreCubicClick(session.step, session.placed, world)) {
    return { session, actions: [] };
  }

  if (session.step === 2) {
    return {
      session: {
        ...session,
        step: 3,
        placed: { ...session.placed, c1: world },
        hover: null,
      },
      actions: [],
    };
  }

  if (session.step === 3) {
    return {
      session: {
        ...session,
        step: 4,
        placed: { ...session.placed, c2: world },
        hover: null,
      },
      actions: [],
    };
  }

  if (session.step === 4) {
    const complete = { ...session.placed, p3: world };
    const actions = commitCreateCubicFromWorld(complete, viewBox, draftStyle);
    if (actions.length === 0) {
      return { session, actions: [] };
    }
    return { session: IDLE_POINTER_SESSION, actions };
  }

  return { session, actions: [] };
}
