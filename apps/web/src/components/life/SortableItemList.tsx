"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { cn } from "@/lib/cn";
import { lifeApi } from "./api";
import { LifeButton } from "./ui";

type SortableItem = { id: string; title: string };

type DragState = {
  id: string;
  activeIndex: number;
  overIndex: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

export function SortableItemList<T extends SortableItem>({
  items,
  label,
  className,
  rowClassName,
  rowGap = 0,
  handlePosition = "trailing",
  renderItem,
  onSaved,
}: {
  items: T[];
  label: string;
  className?: string;
  rowClassName?: string;
  rowGap?: number;
  handlePosition?: "trailing" | "inline";
  renderItem: (item: T, preview: boolean, dragHandle?: ReactNode) => ReactNode;
  onSaved?: () => void;
}) {
  const sourceIds = items.map((item) => item.id);
  const sourceSignature = sourceIds.join(":");
  const [orderedIds, setOrderedIds] = useState(sourceIds);
  const [savedIds, setSavedIds] = useState(sourceIds);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const orderIsValid = orderedIds.length === items.length && orderedIds.every((id) => itemById.has(id));
  const visibleIds = orderIsValid ? orderedIds : sourceIds;
  const visibleItems = visibleIds.map((id) => itemById.get(id)).filter((item): item is T => Boolean(item));
  const hasUnsavedOrder = visibleIds.some((id, index) => id !== savedIds[index]);

  useEffect(() => {
    setOrderedIds(sourceIds);
    setSavedIds(sourceIds);
    // The signature intentionally tracks order and membership, not item field updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSignature]);

  function startDrag(e: PointerEvent<HTMLButtonElement>, itemId: string) {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    const row = e.currentTarget.closest<HTMLElement>("[data-sortable-row]");
    const activeIndex = visibleIds.indexOf(itemId);
    if (!row || activeIndex < 0) return;
    const rect = row.getBoundingClientRect();
    const next: DragState = {
      id: itemId,
      activeIndex,
      overIndex: activeIndex,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = next;
    setDragging(next);
  }

  function dragItem(e: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current) return;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-sortable-item-id]");
    const targetIndex = target?.dataset.sortableItemId
      ? visibleIds.indexOf(target.dataset.sortableItemId)
      : current.overIndex;
    const next = {
      ...current,
      overIndex: targetIndex < 0 ? current.overIndex : targetIndex,
      x: e.clientX - current.offsetX,
      y: e.clientY - current.offsetY,
    };
    dragRef.current = next;
    setDragging(next);
  }

  function finishDrag(e: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(null);
    if (!current || current.activeIndex === current.overIndex) return;
    setOrderedIds((previous) => {
      const next = [...previous];
      const [moved] = next.splice(current.activeIndex, 1);
      if (!moved) return previous;
      next.splice(current.overIndex, 0, moved);
      return next;
    });
  }

  function cancelDrag(e: PointerEvent<HTMLButtonElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(null);
  }

  function losePointerCapture() {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(null);
  }

  function moveWithKeyboard(e: KeyboardEvent<HTMLButtonElement>, itemId: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    setOrderedIds((previous) => {
      const from = previous.indexOf(itemId);
      const to = e.key === "ArrowUp" ? from - 1 : from + 1;
      if (from < 0 || to < 0 || to >= previous.length) return previous;
      const next = [...previous];
      [next[from], next[to]] = [next[to]!, next[from]!];
      return next;
    });
  }

  async function saveOrder() {
    if (!hasUnsavedOrder) return;
    setSaving(true);
    try {
      await lifeApi.reorderItems(visibleIds);
      setSavedIds(visibleIds);
      onSaved?.();
      toast.success(`${label} order saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save ${label.toLowerCase()} order`);
    } finally {
      setSaving(false);
    }
  }

  function renderDragHandle(item: T, preview = false) {
    if (items.length <= 1) return null;
    const className = handlePosition === "inline"
      ? "flex shrink-0 touch-none items-center rounded-md p-1.5 text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]"
      : "mr-0.5 flex shrink-0 touch-none self-center rounded-lg p-2 text-[--color-text-muted] hover:bg-[--color-surface] hover:text-[--color-text-primary] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-accent]";
    if (preview) {
      return (
        <div className={className}>
          <GripVertical className="size-4" aria-hidden="true" />
        </div>
      );
    }
    return (
      <button
        type="button"
        aria-label={`Drag ${item.title} to change its order`}
        title="Drag to reorder; use arrow keys for keyboard reordering"
        className={className}
        onPointerDown={(e) => startDrag(e, item.id)}
        onPointerMove={dragItem}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={losePointerCapture}
        onKeyDown={(e) => moveWithKeyboard(e, item.id)}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      {hasUnsavedOrder ? (
        <div className="mb-2 flex justify-end">
          <LifeButton onClick={saveOrder} disabled={saving}>
            {saving ? "Saving…" : "Save order"}
          </LifeButton>
        </div>
      ) : null}
      <ul className={className}>
        {visibleItems.map((item, index) => {
          const shiftsUp = dragging && dragging.activeIndex < dragging.overIndex && index > dragging.activeIndex && index <= dragging.overIndex;
          const shiftsDown = dragging && dragging.overIndex < dragging.activeIndex && index >= dragging.overIndex && index < dragging.activeIndex;
          const isDragged = dragging?.id === item.id;
          return (
            <li
              key={item.id}
              data-sortable-item-id={item.id}
              data-sortable-row
              className={cn("relative flex min-w-0 transition-transform duration-200 ease-out", rowClassName)}
              style={{
                transform: shiftsUp ? `translateY(-${dragging.height + rowGap}px)` : shiftsDown ? `translateY(${dragging.height + rowGap}px)` : undefined,
                opacity: isDragged ? 0 : 1,
              }}
            >
              <div className="contents">
                <div className="min-w-0 flex-1">
                  {renderItem(item, false, handlePosition === "inline" ? renderDragHandle(item) : undefined)}
                </div>
                {handlePosition === "trailing" ? renderDragHandle(item) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {dragging && itemById.get(dragging.id) ? createPortal(
        <div
          aria-hidden="true"
          className={cn("apple-glass pointer-events-none fixed left-0 top-0 z-[300] flex overflow-hidden rounded-xl border opacity-95 shadow-2xl", rowClassName)}
          style={{ width: dragging.width, transform: `translate3d(${dragging.x}px, ${dragging.y}px, 0)` }}
        >
          <div className="min-w-0 flex-1 pl-3">
            {renderItem(
              itemById.get(dragging.id)!,
              true,
              handlePosition === "inline" ? renderDragHandle(itemById.get(dragging.id)!, true) : undefined,
            )}
          </div>
          {handlePosition === "trailing" ? renderDragHandle(itemById.get(dragging.id)!, true) : null}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
