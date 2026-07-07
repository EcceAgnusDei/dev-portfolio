"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

type UseTwoFingerCanvasScrollParams = {
  scrollContainerRef: RefObject<HTMLElement | null>;
  onTwoFingerStart?: () => void;
};

export function useTwoFingerCanvasScroll({
  scrollContainerRef,
  onTwoFingerStart,
}: UseTwoFingerCanvasScrollParams) {
  const [isTwoFingerScrolling, setIsTwoFingerScrolling] = useState(false);
  const onTwoFingerStartRef = useRef(onTwoFingerStart);

  useLayoutEffect(() => {
    onTwoFingerStartRef.current = onTwoFingerStart;
  }, [onTwoFingerStart]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const update = (event: TouchEvent) => {
      const twoFingers = event.touches.length >= 2;
      setIsTwoFingerScrolling((prev) => {
        if (twoFingers && !prev) {
          onTwoFingerStartRef.current?.();
        }
        return twoFingers;
      });
    };

    container.addEventListener("touchstart", update, {
      capture: true,
      passive: true,
    });
    container.addEventListener("touchend", update, {
      capture: true,
      passive: true,
    });
    container.addEventListener("touchcancel", update, {
      capture: true,
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", update, { capture: true });
      container.removeEventListener("touchend", update, { capture: true });
      container.removeEventListener("touchcancel", update, { capture: true });
    };
  }, [scrollContainerRef]);

  return { isTwoFingerScrolling };
}
