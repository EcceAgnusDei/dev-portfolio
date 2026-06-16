"use client";

import { type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { VECTOR_AI_PROMPT_MAX_LENGTH } from "@/features/vector-ai/lib/ai/config";
import { cn } from "@/lib/utils";

export type VectorAiPromptPanelProps = {
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onSubmitAi: () => void;
  aiPending: boolean;
  className?: string;
};

export function VectorAiPromptPanel({
  aiPrompt,
  onAiPromptChange,
  onSubmitAi,
  aiPending,
  className,
}: VectorAiPromptPanelProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (aiPending || !aiPrompt.trim()) return;
    onSubmitAi();
  }

  return (
    <fieldset
      className={cn(
        "mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-2 border-0 p-0",
        className,
      )}
    >
      <legend className="text-center text-sm font-medium">Commande IA</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-center">
        <textarea
          value={aiPrompt}
          onChange={(event) => onAiPromptChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Décrivez la modification à apporter au dessin…"
          aria-label="Commande pour modifier le dessin avec l'IA"
          rows={2}
          maxLength={VECTOR_AI_PROMPT_MAX_LENGTH}
          disabled={aiPending}
          className="min-h-16 w-full min-w-0 flex-1 resize-y rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:max-w-xl"
        />
        <Button
          type="button"
          className="shrink-0"
          onClick={onSubmitAi}
          disabled={aiPending || !aiPrompt.trim()}
        >
          {aiPending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
    </fieldset>
  );
}
