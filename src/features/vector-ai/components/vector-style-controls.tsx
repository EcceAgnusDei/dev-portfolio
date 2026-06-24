"use client";

import { type ChangeEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  colorToInputValue,
  parseColorInput,
} from "@/features/vector-ai/lib/document/color";
import type { StyleControlVisibility } from "@/features/vector-ai/lib/editor/core/draft-style";
import { VECTOR_AI_MAX_STROKE_WIDTH } from "@/features/vector-ai/lib/vector-ai-config";
import { cn } from "@/lib/utils";

export type VectorStyleControlsProps = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  visibility: StyleControlVisibility;
  disabled?: boolean;
  onFillChange: (fill: string) => void;
  onStrokeChange: (stroke: string) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  className?: string;
};

type StyleColorFieldProps = {
  label: string;
  color: string;
  disabled: boolean;
  allowNone: boolean;
  noneLabel: string;
  colorAriaLabel: string;
  onChange: (color: string) => void;
};

function StyleColorField({
  label,
  color,
  disabled,
  allowNone,
  noneLabel,
  colorAriaLabel,
  onChange,
}: StyleColorFieldProps) {
  const isNone = color === "none";
  const [rememberedHex, setRememberedHex] = useState(() =>
    colorToInputValue(color),
  );
  const [prevColor, setPrevColor] = useState(color);

  if (color !== prevColor) {
    setPrevColor(color);
    if (color !== "none") {
      setRememberedHex(colorToInputValue(color));
    }
  }

  const pickerValue = isNone ? rememberedHex : colorToInputValue(color);

  function handleColorChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const next = parseColorInput(event.target.value);
    setRememberedHex(next);
    onChange(next);
  }

  function handleNoneClick() {
    if (disabled) return;
    onChange(isNone ? rememberedHex : "none");
  }

  return (
    <div
      className={cn(
        "flex min-w-[6.5rem] flex-col gap-1 text-sm",
        disabled && "opacity-50",
      )}
    >
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={pickerValue}
          onChange={handleColorChange}
          disabled={disabled}
          aria-label={colorAriaLabel}
          className={cn(
            "h-8 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-background p-0.5 disabled:cursor-not-allowed",
            isNone && "opacity-40",
          )}
        />
        {allowNone ? (
          <Button
            type="button"
            variant={isNone ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            disabled={disabled}
            onClick={handleNoneClick}
            aria-pressed={isNone}
          >
            {noneLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function VectorStyleControls({
  fill,
  stroke,
  strokeWidth,
  visibility,
  disabled = false,
  onFillChange,
  onStrokeChange,
  onStrokeWidthChange,
  className,
}: VectorStyleControlsProps) {
  const allowNone = visibility.fill && visibility.stroke;
  const showStrokeWidth = visibility.strokeWidth && stroke !== "none";

  function handleStrokeWidthChange(event: ChangeEvent<HTMLInputElement>) {
    if (disabled || !showStrokeWidth) return;
    const parsed = Number(event.target.value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    onStrokeWidthChange(Math.min(VECTOR_AI_MAX_STROKE_WIDTH, parsed));
  }

  if (!visibility.fill && !visibility.stroke) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>
      {visibility.fill ? (
        <StyleColorField
          label="Remplissage"
          color={fill}
          disabled={disabled}
          allowNone={allowNone}
          noneLabel="Aucun"
          colorAriaLabel="Couleur de remplissage"
          onChange={onFillChange}
        />
      ) : null}
      {visibility.stroke ? (
        <StyleColorField
          label="Contour"
          color={stroke}
          disabled={disabled}
          allowNone={allowNone}
          noneLabel="Aucun"
          colorAriaLabel="Couleur de contour"
          onChange={onStrokeChange}
        />
      ) : null}
      {showStrokeWidth ? (
        <label
          className={cn(
            "flex min-w-[4.5rem] flex-col gap-1 text-sm",
            disabled && "opacity-50",
          )}
        >
          <span className="text-muted-foreground text-xs">Épaisseur</span>
          <input
            type="number"
            min={1}
            max={VECTOR_AI_MAX_STROKE_WIDTH}
            value={strokeWidth}
            onChange={handleStrokeWidthChange}
            disabled={disabled}
            aria-label="Épaisseur du contour"
            className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
      ) : null}
    </div>
  );
}
