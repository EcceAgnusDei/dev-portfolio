import { postVectorAiCommand } from "@/features/vector-ai/lib/editor/ai/post-vector-ai-command";
import { resolveAiUserMessage } from "@/features/vector-ai/lib/editor/ai/resolve-ai-user-message";
import type { VectorDoc } from "@/features/vector-ai/lib/document/types";
import { isSameVectorDoc } from "@/features/vector-ai/lib/editor/core/doc-equality";
import type { VectorAiPreviewPng } from "@/features/vector-ai/lib/vector-ai-config";
import {
  rasterizeDocToPng,
  type RasterizeDocResult,
} from "@/features/vector-ai/lib/view/rasterize-doc-to-png";

export type RunVectorAiSubmitResult =
  | {
      ok: true;
      doc: VectorDoc;
      docChanged: boolean;
      userMessage: string;
    }
  | { ok: false; aborted: true }
  | { ok: false; error: string };

export type RunVectorAiSubmitParams = {
  doc: VectorDoc;
  prompt: string;
  signal?: AbortSignal;
  shouldCancel?: () => boolean;
  rasterizeDoc?: (doc: VectorDoc) => Promise<RasterizeDocResult>;
  postCommand?: typeof postVectorAiCommand;
};

export async function runVectorAiSubmit(
  params: RunVectorAiSubmitParams,
): Promise<RunVectorAiSubmitResult> {
  const {
    doc,
    prompt,
    signal,
    shouldCancel,
    rasterizeDoc = rasterizeDocToPng,
    postCommand = postVectorAiCommand,
  } = params;

  let previewPng: VectorAiPreviewPng | undefined;

  if (doc.shapes.length > 0) {
    const preview = await rasterizeDoc(doc);
    if (shouldCancel?.() || signal?.aborted) {
      return { ok: false, aborted: true };
    }
    if (preview.ok) {
      previewPng = {
        base64: preview.base64,
        mimeType: preview.mimeType,
      };
    }
  }

  const result = await postCommand({
    prompt,
    doc,
    previewPng,
    signal,
  });

  if (!result.ok) {
    if ("aborted" in result) {
      return { ok: false, aborted: true };
    }
    return { ok: false, error: result.error };
  }

  const docChanged = !isSameVectorDoc(doc, result.doc);
  const { text } = resolveAiUserMessage({
    message: result.message,
    docChanged,
  });

  return {
    ok: true,
    doc: result.doc,
    docChanged,
    userMessage: text,
  };
}
