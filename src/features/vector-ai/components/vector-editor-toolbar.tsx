"use client";

import { Menu } from "@base-ui/react/menu";
import { type ChangeEvent, type FocusEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { VectorStyleControls } from "@/features/vector-ai/components/vector-style-controls";
import type { StyleControlState } from "@/features/vector-ai/lib/editor/core/editor-queries";
import type { StylePatch } from "@/features/vector-ai/lib/editor/dispatch/style-patch-actions";
import type {
  ZOrderAvailability,
  ZOrderCommand,
} from "@/features/vector-ai/lib/editor/dispatch/reorder-shapes";
import type { EditorTool } from "@/features/vector-ai/lib/editor/core/state";
import { parseTextFontSizeInput } from "@/features/vector-ai/lib/editor/dispatch/commit-text-content";
import type { VectorDrawingListItem } from "@/features/vector-ai/lib/vector-drawing-storage";
import { formatDisplayZoomPercent } from "@/features/vector-ai/lib/view/display-zoom";
import {
  VECTOR_AI_MAX_FONT_SIZE,
  VECTOR_AI_MAX_VIEWBOX_DIMENSION,
} from "@/features/vector-ai/lib/vector-ai-config";
import { cn } from "@/lib/utils";

const TOOLBAR_SHELL_CLASS = "mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3";

const Z_ORDER_MENU_ITEMS: {
  command: ZOrderCommand;
  label: string;
}[] = [
  { command: "front", label: "Premier plan" },
  { command: "forward", label: "Avancer" },
  { command: "backward", label: "Reculer" },
  { command: "back", label: "Arrière-plan" },
];

type VectorViewBoxDimensionsMenuProps = {
  widthDraft: string;
  heightDraft: string;
  disabled?: boolean;
  onWidthDraftChange: (value: string) => void;
  onHeightDraftChange: (value: string) => void;
  onOk: () => void;
  onOpenChange?: (open: boolean, opening?: boolean) => void;
};

type MenuOpenChangeDetails = {
  reason: string;
  event: Event;
  cancel: () => void;
  allowPropagation: () => void;
};

function isViewBoxHandlePointerTarget(event: Event): boolean {
  if (!(event.target instanceof Element)) return false;
  return event.target.closest("[data-viewbox-handle]") !== null;
}

function VectorViewBoxDimensionsMenu({
  widthDraft,
  heightDraft,
  disabled = false,
  onWidthDraftChange,
  onHeightDraftChange,
  onOk,
  onOpenChange,
}: VectorViewBoxDimensionsMenuProps) {
  const [open, setOpen] = useState(false);

  function handleOpenChange(
    nextOpen: boolean,
    eventDetails: MenuOpenChangeDetails,
  ) {
    if (
      !nextOpen &&
      eventDetails.reason === "outside-press" &&
      isViewBoxHandlePointerTarget(eventDetails.event)
    ) {
      eventDetails.cancel();
      eventDetails.allowPropagation();
      return;
    }

    const opening = nextOpen && !open;
    setOpen(nextOpen);
    onOpenChange?.(nextOpen, opening);
  }

  function handleOk() {
    onOk();
  }

  return (
    <Menu.Root open={open} onOpenChange={handleOpenChange} modal={false}>
      <Menu.Trigger
        disabled={disabled}
        render={<Button variant={open ? "default" : "outline"} size="sm" />}
      >
        Dimensions
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="start">
          <Menu.Popup
            className={cn(
              "z-50 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
              "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            )}
          >
            <div
              className="flex flex-wrap items-end gap-2"
              onKeyDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <label className="flex min-w-[5.5rem] flex-col gap-1 text-sm">
                <span className="text-muted-foreground text-xs">Largeur</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={widthDraft}
                  onChange={(event) => onWidthDraftChange(event.target.value)}
                  disabled={disabled}
                  min={1}
                  max={VECTOR_AI_MAX_VIEWBOX_DIMENSION}
                  aria-label="Largeur du plan"
                  className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
              <span className="pb-2 text-sm text-muted-foreground" aria-hidden>
                ×
              </span>
              <label className="flex min-w-[5.5rem] flex-col gap-1 text-sm">
                <span className="text-muted-foreground text-xs">Hauteur</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightDraft}
                  onChange={(event) => onHeightDraftChange(event.target.value)}
                  disabled={disabled}
                  min={1}
                  max={VECTOR_AI_MAX_VIEWBOX_DIMENSION}
                  aria-label="Hauteur du plan"
                  className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={handleOk}
              >
                OK
              </Button>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export const VECTOR_EDITOR_TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Sélection" },
  { id: "rect", label: "Rectangle" },
  { id: "circle", label: "Cercle" },
  { id: "line", label: "Ligne" },
  { id: "cubic", label: "Courbe" },
  { id: "text", label: "Texte" },
];

export type VectorEditorPrimaryToolbarProps = {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  fontSizeDraft: string;
  fontSizeFallback: number;
  fontSizeEnabled: boolean;
  onFontSizeDraftChange: (value: string) => void;
  onFontSizeBlur?: (
    fontSize: number,
    relatedTarget: EventTarget | null,
  ) => void;
  canDelete: boolean;
  onDelete: () => void;
  canReorder: boolean;
  zOrderAvailability: ZOrderAvailability;
  onZOrderCommand: (command: ZOrderCommand) => void;
  styleControl: StyleControlState;
  styleControlsEnabled: boolean;
  onStylePatch: (patch: StylePatch) => void;
  className?: string;
};

export type VectorEditorBottomToolbarProps = {
  onExportSvg: () => void;
  onDownloadSvg: () => void;
  savedDrawings: VectorDrawingListItem[];
  activeDrawingId: string | null;
  onActiveDrawingChange: (id: string | null) => void;
  drawingName: string;
  onDrawingNameChange: (value: string) => void;
  onSaveDrawing: () => void;
  saveDrawingDisabled?: boolean;
  viewBoxWidthDraft: string;
  viewBoxHeightDraft: string;
  onViewBoxWidthDraftChange: (value: string) => void;
  onViewBoxHeightDraftChange: (value: string) => void;
  onViewBoxOk: () => void;
  onViewBoxDimensionsOpenChange?: (open: boolean, opening?: boolean) => void;
  viewBoxControlsDisabled?: boolean;
  displayZoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  displayZoomControlsDisabled?: boolean;
  canClear?: boolean;
  onClear?: () => void;
  clearDisabled?: boolean;
  className?: string;
};

export type VectorEditorToolbarProps = VectorEditorPrimaryToolbarProps &
  VectorEditorBottomToolbarProps;

export function VectorEditorPrimaryToolbar({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  fontSizeDraft,
  fontSizeFallback,
  fontSizeEnabled,
  onFontSizeDraftChange,
  onFontSizeBlur,
  canDelete,
  onDelete,
  canReorder,
  zOrderAvailability,
  onZOrderCommand,
  styleControl,
  styleControlsEnabled,
  onStylePatch,
  className,
}: VectorEditorPrimaryToolbarProps) {
  function handleFontSizeChange(event: ChangeEvent<HTMLInputElement>) {
    if (!fontSizeEnabled) return;
    onFontSizeDraftChange(event.target.value);
  }

  function handleFontSizeBlur(event: FocusEvent<HTMLInputElement>) {
    if (!fontSizeEnabled) return;
    const parsed = parseTextFontSizeInput(fontSizeDraft, fontSizeFallback);
    onFontSizeDraftChange(String(parsed));
    onFontSizeBlur?.(parsed, event.relatedTarget);
  }

  return (
    <div className={cn(TOOLBAR_SHELL_CLASS, className)}>
      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Outils</legend>
        <div className="flex min-w-0 w-full flex-wrap items-center justify-center gap-2">
          {VECTOR_EDITOR_TOOLS.map((tool) => (
            <Button
              key={tool.id}
              type="button"
              variant={activeTool === tool.id ? "default" : "outline"}
              size="sm"
              onClick={() => onToolChange(tool.id)}
            >
              {tool.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canUndo}
            onClick={onUndo}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRedo}
            onClick={onRedo}
          >
            Rétablir
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Propriétés</legend>
        <div className="flex min-w-0 flex-wrap items-end justify-center gap-3">
          <VectorStyleControls
            fill={styleControl.values.fill}
            stroke={styleControl.values.stroke}
            strokeWidth={styleControl.values.strokeWidth}
            visibility={styleControl.visibility}
            disabled={!styleControlsEnabled}
            onFillChange={(fill) => onStylePatch({ fill })}
            onStrokeChange={(stroke) => onStylePatch({ stroke })}
            onStrokeWidthChange={(strokeWidth) => onStylePatch({ strokeWidth })}
          />
          <label
            data-vector-text-edit-ui
            className={cn(
              "flex min-w-[5.5rem] flex-col gap-1 text-sm",
              !fontSizeEnabled && "opacity-50",
            )}
          >
            <span className="text-muted-foreground text-xs">Taille</span>
            <input
              type="text"
              inputMode="decimal"
              value={fontSizeDraft ?? ""}
              onChange={handleFontSizeChange}
              onBlur={handleFontSizeBlur}
              disabled={!fontSizeEnabled}
              min={3}
              max={VECTOR_AI_MAX_FONT_SIZE}
              aria-label="Taille de police"
              className="h-8 rounded-md border border-border bg-background px-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDelete}
            onClick={onDelete}
          >
            Supprimer
          </Button>
          <Menu.Root modal={false}>
            <Menu.Trigger
              disabled={!canReorder}
              render={<Button variant="outline" size="sm" />}
            >
              Ordre
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={4} align="start">
                <Menu.Popup
                  className={cn(
                    "z-50 min-w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
                    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                    "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                  )}
                >
                  {Z_ORDER_MENU_ITEMS.map((item) => (
                    <Menu.Item
                      key={item.command}
                      closeOnClick={false}
                      disabled={!zOrderAvailability[item.command]}
                      onClick={() => onZOrderCommand(item.command)}
                      className={cn(
                        "cursor-default rounded-md px-2 py-1.5 text-sm outline-none select-none",
                        "data-highlighted:bg-muted data-highlighted:text-foreground",
                        "data-disabled:pointer-events-none data-disabled:opacity-50",
                      )}
                    >
                      {item.label}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </fieldset>
    </div>
  );
}

export function VectorEditorBottomToolbar({
  onExportSvg,
  onDownloadSvg,
  savedDrawings,
  activeDrawingId,
  onActiveDrawingChange,
  drawingName = "",
  onDrawingNameChange,
  onSaveDrawing,
  saveDrawingDisabled = false,
  viewBoxWidthDraft,
  viewBoxHeightDraft,
  onViewBoxWidthDraftChange,
  onViewBoxHeightDraftChange,
  onViewBoxOk,
  onViewBoxDimensionsOpenChange,
  viewBoxControlsDisabled = false,
  displayZoom,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  displayZoomControlsDisabled = false,
  canClear = false,
  onClear,
  clearDisabled = false,
  className,
}: VectorEditorBottomToolbarProps) {
  return (
    <div className={cn(TOOLBAR_SHELL_CLASS, className)}>
      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Document</legend>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label="Zoom d'affichage"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={displayZoomControlsDisabled || !canZoomOut}
              onClick={onZoomOut}
              aria-label="Zoom arrière"
            >
              −
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={displayZoomControlsDisabled || displayZoom === 1}
              onClick={onZoomReset}
              aria-label="Zoom à 100 %"
            >
              {formatDisplayZoomPercent(displayZoom)}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={displayZoomControlsDisabled || !canZoomIn}
              onClick={onZoomIn}
              aria-label="Zoom avant"
            >
              +
            </Button>
          </div>
          <VectorViewBoxDimensionsMenu
            widthDraft={viewBoxWidthDraft}
            heightDraft={viewBoxHeightDraft}
            disabled={viewBoxControlsDisabled}
            onWidthDraftChange={onViewBoxWidthDraftChange}
            onHeightDraftChange={onViewBoxHeightDraftChange}
            onOk={onViewBoxOk}
            onOpenChange={onViewBoxDimensionsOpenChange}
          />
          {onClear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={clearDisabled || !canClear}
              onClick={onClear}
            >
              Effacer
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportSvg}
          >
            Copier SVG
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadSvg}
          >
            Télécharger SVG
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 w-full flex-col gap-2 border-0 p-0">
        <legend className="text-center text-sm font-medium">Vos dessins</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="sr-only">Choisir un dessin</span>
            <select
              value={activeDrawingId ?? ""}
              onChange={(e) =>
                onActiveDrawingChange(e.target.value ? e.target.value : null)
              }
              disabled={saveDrawingDisabled}
              aria-label="Choisir un dessin enregistré"
              className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Brouillon (non enregistré)</option>
              {savedDrawings.map((drawing) => (
                <option key={drawing.id} value={drawing.id}>
                  {drawing.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="text-xs text-muted-foreground">Nom</span>
            <input
              type="text"
              value={drawingName ?? ""}
              onChange={(e) => onDrawingNameChange(e.target.value)}
              placeholder="Nom du dessin"
              maxLength={100}
              disabled={saveDrawingDisabled}
              aria-label="Nom du dessin"
              className="h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSaveDrawing}
              disabled={saveDrawingDisabled}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

export function VectorEditorToolbar(props: VectorEditorToolbarProps) {
  const {
    activeTool,
    onToolChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    fontSizeDraft,
    fontSizeFallback,
    fontSizeEnabled,
    onFontSizeDraftChange,
    onFontSizeBlur,
    canDelete,
    onDelete,
    canReorder,
    zOrderAvailability,
    onZOrderCommand,
    styleControl,
    styleControlsEnabled,
    onStylePatch,
    onExportSvg,
    onDownloadSvg,
    savedDrawings,
    activeDrawingId,
    onActiveDrawingChange,
    drawingName,
    onDrawingNameChange,
    onSaveDrawing,
    saveDrawingDisabled,
    viewBoxWidthDraft,
    viewBoxHeightDraft,
    onViewBoxWidthDraftChange,
    onViewBoxHeightDraftChange,
    onViewBoxOk,
    onViewBoxDimensionsOpenChange,
    viewBoxControlsDisabled,
    displayZoom,
    canZoomIn,
    canZoomOut,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    displayZoomControlsDisabled,
    canClear,
    onClear,
    clearDisabled,
    className,
  } = props;

  return (
    <>
      <VectorEditorPrimaryToolbar
        activeTool={activeTool}
        onToolChange={onToolChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        fontSizeDraft={fontSizeDraft}
        fontSizeFallback={fontSizeFallback}
        fontSizeEnabled={fontSizeEnabled}
        onFontSizeDraftChange={onFontSizeDraftChange}
        onFontSizeBlur={onFontSizeBlur}
        canDelete={canDelete}
        onDelete={onDelete}
        canReorder={canReorder}
        zOrderAvailability={zOrderAvailability}
        onZOrderCommand={onZOrderCommand}
        styleControl={styleControl}
        styleControlsEnabled={styleControlsEnabled}
        onStylePatch={onStylePatch}
      />
      <VectorEditorBottomToolbar
        onExportSvg={onExportSvg}
        onDownloadSvg={onDownloadSvg}
        savedDrawings={savedDrawings}
        activeDrawingId={activeDrawingId}
        onActiveDrawingChange={onActiveDrawingChange}
        drawingName={drawingName}
        onDrawingNameChange={onDrawingNameChange}
        onSaveDrawing={onSaveDrawing}
        saveDrawingDisabled={saveDrawingDisabled}
        viewBoxWidthDraft={viewBoxWidthDraft}
        viewBoxHeightDraft={viewBoxHeightDraft}
        onViewBoxWidthDraftChange={onViewBoxWidthDraftChange}
        onViewBoxHeightDraftChange={onViewBoxHeightDraftChange}
        onViewBoxOk={onViewBoxOk}
        onViewBoxDimensionsOpenChange={onViewBoxDimensionsOpenChange}
        viewBoxControlsDisabled={viewBoxControlsDisabled}
        displayZoom={displayZoom}
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onZoomReset={onZoomReset}
        displayZoomControlsDisabled={displayZoomControlsDisabled}
        canClear={canClear}
        onClear={onClear}
        clearDisabled={clearDisabled}
        className={className}
      />
    </>
  );
}
