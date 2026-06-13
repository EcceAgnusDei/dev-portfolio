"use client";

import { type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import type { TextShape } from "@/features/vector-ai/lib/document/types";
import { parseTextFontSizeInput } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import { VECTOR_AI_MAX_FONT_SIZE } from "@/features/vector-ai/lib/vector-ai-config";

export type SelectedShapeContextPropertiesProps = {
  canDelete: boolean;
  onDelete: () => void;
};

export function SelectedShapeContextProperties({
  canDelete,
  onDelete,
}: SelectedShapeContextPropertiesProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!canDelete}
      onClick={onDelete}
    >
      Supprimer
    </Button>
  );
}

export type TextShapeContextPropertiesProps = {
  shape: TextShape;
  fontSizeDraft: string;
  onFontSizeDraftChange: (value: string) => void;
};

export function TextShapeContextProperties({
  shape,
  fontSizeDraft,
  onFontSizeDraftChange,
}: TextShapeContextPropertiesProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onFontSizeDraftChange(event.target.value);
  }

  function handleBlur() {
    const parsed = parseTextFontSizeInput(fontSizeDraft, shape.fontSize);
    onFontSizeDraftChange(String(parsed));
  }

  return (
    <label
      data-vector-text-edit-ui
      className="flex min-w-[5.5rem] flex-col gap-1 text-sm"
    >
      <span className="text-muted-foreground text-xs">Taille</span>
      <input
        type="text"
        inputMode="decimal"
        value={fontSizeDraft}
        onChange={handleChange}
        onBlur={handleBlur}
        min={3}
        max={VECTOR_AI_MAX_FONT_SIZE}
        aria-label="Taille de police"
        className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none"
      />
    </label>
  );
}
