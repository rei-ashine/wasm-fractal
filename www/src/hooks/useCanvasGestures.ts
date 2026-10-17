import { useEffect, useRef, type RefObject } from 'react';
import { wheelZoomFactor } from '../utils/viewMath';

// The wheel counts as stopped after this long without an event
export const WHEEL_IDLE_MS = 150;
// Two taps make a double tap when their presses are at most this far apart in time and in CSS px
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_DISTANCE = 30;
// A press that moves this many CSS px or more from where it started is a drag, not a tap
export const TAP_SLOP = 6;

export interface GestureHandlers {
  // CSS px: the image moves the same way as the pointer
  onPan: (dx: number, dy: number) => void;
  // Keeps the point (sx, sy) of the canvas, in CSS px, fixed
  onZoom: (sx: number, sy: number, factor: number) => void;
  // Every pointer released, a double tap, or the wheel stopped for WHEEL_IDLE_MS
  onGestureEnd: () => void;
}

interface Pointer {
  x: number;
  y: number;
  startX: number;
  startY: number;
  // When it was pressed, and whether it ever went TAP_SLOP or more from the start
  downTime: number;
  moved: boolean;
}

// The distance between the first two pointers and their midpoint
interface Pinch {
  distance: number;
  x: number;
  y: number;
}

function pinchOf(pointers: Map<number, Pointer>): Pinch {
  const [a, b] = [...pointers.values()];
  return { distance: Math.hypot(b.x - a.x, b.y - a.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Turns the pointer and wheel events of the canvas into pans and zooms. Pointer Events cover
// the mouse, touch and pens alike: one pointer drags, two pinch (zooming about their midpoint
// and moving with it), and a double tap or double click zooms in 2x at that point.
export function useCanvasGestures(canvasRef: RefObject<HTMLCanvasElement>, handlers: GestureHandlers): void {
  // The listeners stay registered across renders and call the latest handlers
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointers = new Map<number, Pointer>();
    // The pinch of the last event while two or more pointers are down
    let pinch: Pinch | null = null;
    // Whether a second pointer was down at some point since the first one was pressed
    let multiTouch = false;
    // The press of the last tap, waiting for a second one
    let lastTap: { time: number; x: number; y: number } | null = null;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const position = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Capture can fail (the pointer is already gone); the press still counts without it
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignored
      }
      const { x, y } = position(e);
      pointers.set(e.pointerId, { x, y, startX: x, startY: y, downTime: e.timeStamp, moved: false });
      if (pointers.size >= 2) {
        multiTouch = true;
        pinch = pinchOf(pointers);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      // A mouse moving with its button up was released where no pointerup reached the canvas:
      // end the press instead of panning on hover
      if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
        onPointerEnd(e);
        return;
      }
      const { x, y } = position(e);
      const dx = x - p.x;
      const dy = y - p.y;
      p.x = x;
      p.y = y;
      if (Math.hypot(x - p.startX, y - p.startY) >= TAP_SLOP) p.moved = true;
      if (pointers.size === 1) {
        if (dx !== 0 || dy !== 0) handlersRef.current.onPan(dx, dy);
      } else if (pinch) {
        const next = pinchOf(pointers);
        // Zoom about the old midpoint, then follow the midpoint to where it is now
        if (pinch.distance > 0 && next.distance > 0 && next.distance !== pinch.distance) {
          handlersRef.current.onZoom(pinch.x, pinch.y, next.distance / pinch.distance);
        }
        if (next.x !== pinch.x || next.y !== pinch.y) handlersRef.current.onPan(next.x - pinch.x, next.y - pinch.y);
        pinch = next;
      }
    };

    // pointerup and pointercancel, and the ends inferred from lostpointercapture or a move with
    // the mouse button up (pointerup may never arrive); only a real pointerup can be a tap.
    // A pointer already removed is ignored, so a pointerup and its lostpointercapture end it once
    const onPointerEnd = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      pointers.delete(e.pointerId);
      try {
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignored
      }
      // Back from two pointers to one: the one left drags on from where it is now, not from
      // where the pinch started, so the view does not jump (each pointer keeps its last position)
      pinch = pointers.size >= 2 ? pinchOf(pointers) : null;
      if (pointers.size > 0) return;

      const isTap = e.type === 'pointerup' && !multiTouch && !p.moved
        && Math.hypot(p.x - p.startX, p.y - p.startY) < TAP_SLOP;
      multiTouch = false;
      if (isTap) {
        if (lastTap && p.downTime - lastTap.time <= DOUBLE_TAP_MS
          && Math.hypot(p.startX - lastTap.x, p.startY - lastTap.y) <= DOUBLE_TAP_DISTANCE) {
          lastTap = null;
          handlersRef.current.onZoom(p.x, p.y, 2);
        } else {
          lastTap = { time: p.downTime, x: p.startX, y: p.startY };
        }
      } else {
        lastTap = null;
      }
      handlersRef.current.onGestureEnd();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = position(e);
      handlersRef.current.onZoom(x, y, wheelZoomFactor(e.deltaY, e.deltaMode, canvas.clientHeight));
      if (wheelTimer !== null) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelTimer = null;
        // A drag still going on renders when it is released
        if (pointers.size === 0) handlersRef.current.onGestureEnd();
      }, WHEEL_IDLE_MS);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('lostpointercapture', onPointerEnd);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('lostpointercapture', onPointerEnd);
      canvas.removeEventListener('wheel', onWheel);
      if (wheelTimer !== null) clearTimeout(wheelTimer);
    };
  }, [canvasRef]);
}
