import { useEffect, useRef, type RefObject } from 'react';
import { wheelZoomFactor } from '../utils/viewMath';

// The wheel counts as stopped after this long without an event
export const WHEEL_IDLE_MS = 150;
// Two taps make a double tap when their presses are at most this far apart in time and in CSS px
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_DISTANCE = 30;
// A press that moves this many CSS px or more from where it started is a drag, not a tap
export const TAP_SLOP = 6;
// One finger held this long without moving TAP_SLOP grabs the view, instead of scrolling the page
export const HOLD_MS = 400;

export interface GestureHandlers {
  // CSS px: the image moves the same way as the pointer
  onPan: (dx: number, dy: number) => void;
  // Keeps the point (sx, sy) of the canvas, in CSS px, fixed
  onZoom: (sx: number, sy: number, factor: number) => void;
  // Every pointer released, a double tap, or the wheel stopped for WHEEL_IDLE_MS
  onGestureEnd: () => void;
  // One finger moved on the canvas without holding first: the page scrolls
  onOneFingerScroll: () => void;
  // One finger held still grabbed the view (true), until it is lifted (false)
  onHold: (holding: boolean) => void;
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

function pinchOf(pointers: Map<string, Pointer>): Pinch {
  const [a, b] = [...pointers.values()];
  return { distance: Math.hypot(b.x - a.x, b.y - a.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Turns the mouse, touch and wheel events of the canvas into pans and zooms. The mouse drags,
// and a double click zooms in 2x at that point. One finger scrolls the page as anywhere else,
// unless it is held still for HOLD_MS first: then it drags the view. Two fingers move the view
// and pinch it (zooming about their midpoint and moving with it), and a double tap zooms in 2x.
// Touch Events, not Pointer Events, carry the fingers, since only a touchmove can be cancelled,
// keeping the page still under the fingers that move the view; pens on touch screens send them
// too, and work as fingers.
export function useCanvasGestures(canvasRef: RefObject<HTMLCanvasElement | null>, handlers: GestureHandlers): void {
  // The listeners stay registered across renders and call the latest handlers
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // The mouse button or the fingers down on the canvas, as "mouse" and "touch<identifier>"
    const pointers = new Map<string, Pointer>();
    // The pinch of the last event while two or more pointers are down
    let pinch: Pinch | null = null;
    // Whether a second pointer was down at some point since the first one was pressed
    let multiTouch = false;
    // Whether one finger has moved, and so scrolls the page, since the first was pressed:
    // the fingers are the page's until they are all lifted
    let scrolling = false;
    // Whether one finger held still has grabbed the view, and the timer that will grab it
    let holding = false;
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const cancelHold = () => {
      if (holdTimer !== null) clearTimeout(holdTimer);
      holdTimer = null;
    };
    // The press of the last tap, waiting for a second one
    let lastTap: { time: number; x: number; y: number } | null = null;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;

    const position = (e: { clientX: number; clientY: number }) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const press = (id: string, e: { clientX: number; clientY: number }, time: number) => {
      const { x, y } = position(e);
      pointers.set(id, { x, y, startX: x, startY: y, downTime: time, moved: false });
      if (pointers.size >= 2) {
        multiTouch = true;
        pinch = pinchOf(pointers);
      }
    };

    // Moves a pointer; one pointer alone pans the view only if onePans
    const move = (id: string, e: { clientX: number; clientY: number }, onePans: boolean) => {
      const p = pointers.get(id);
      if (!p) return;
      const { x, y } = position(e);
      const dx = x - p.x;
      const dy = y - p.y;
      p.x = x;
      p.y = y;
      if (Math.hypot(x - p.startX, y - p.startY) >= TAP_SLOP) p.moved = true;
      if (pointers.size === 1) {
        if (onePans && (dx !== 0 || dy !== 0)) handlersRef.current.onPan(dx, dy);
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

    // Lifts a pointer; only a real pointerup or touchend (released) can be a tap. A pointer
    // already removed is ignored, so a pointerup and its lostpointercapture end it once
    const release = (id: string, released: boolean) => {
      const p = pointers.get(id);
      if (!p) return;
      pointers.delete(id);
      // Back from two pointers to one: the one left drags on from where it is now, not from
      // where the pinch started, so the view does not jump (each pointer keeps its last position)
      pinch = pointers.size >= 2 ? pinchOf(pointers) : null;
      if (pointers.size > 0) return;

      const isTap = released && !multiTouch && !holding && !p.moved
        && Math.hypot(p.x - p.startX, p.y - p.startY) < TAP_SLOP;
      multiTouch = false;
      scrolling = false;
      cancelHold();
      if (holding) {
        holding = false;
        handlersRef.current.onHold(false);
      }
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

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      // Capture can fail (the pointer is already gone); the press still counts without it
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignored
      }
      press('mouse', e, e.timeStamp);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      // A mouse moving with its button up was released where no pointerup reached the canvas:
      // end the press instead of panning on hover
      if ((e.buttons & 1) === 0) {
        onPointerEnd(e);
        return;
      }
      move('mouse', e, true);
    };

    // pointerup and pointercancel, and the ends inferred from lostpointercapture or a move with
    // the button up (pointerup may never arrive)
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      try {
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignored
      }
      release('mouse', e.type === 'pointerup');
    };

    // A finger pressed while one already scrolls the page is left to the page
    const onTouchStart = (e: TouchEvent) => {
      if (scrolling) return;
      for (const t of e.changedTouches) press(`touch${t.identifier}`, t, e.timeStamp);
      if (multiTouch) {
        cancelHold();
        // Two fingers neither scroll nor zoom the page
        if (e.cancelable) e.preventDefault();
      } else if (pointers.size === 1 && !holding) {
        holdTimer = setTimeout(() => {
          holdTimer = null;
          holding = true;
          handlersRef.current.onHold(true);
        }, HOLD_MS);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (scrolling) return;
      // The page began to scroll before the finger was held long enough (the browser started
      // sooner than TAP_SLOP): it keeps the finger, and the view lets go
      if (holding && !multiTouch && !e.cancelable) {
        holding = false;
        handlersRef.current.onHold(false);
        scrolling = true;
        return;
      }
      // Once two fingers were down, the one left after lifting the other moves the view on
      const grabbed = multiTouch || holding;
      for (const t of e.changedTouches) move(`touch${t.identifier}`, t, grabbed);
      if (grabbed) {
        if (e.cancelable) e.preventDefault();
      } else if ([...pointers.values()].some((p) => p.moved)) {
        cancelHold();
        scrolling = true;
        handlersRef.current.onOneFingerScroll();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of e.changedTouches) release(`touch${t.identifier}`, e.type === 'touchend');
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = position(e);
      handlersRef.current.onZoom(x, y, wheelZoomFactor(e.deltaY, e.deltaMode, canvas.clientHeight, e.ctrlKey));
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
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('lostpointercapture', onPointerEnd);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
      canvas.removeEventListener('wheel', onWheel);
      if (wheelTimer !== null) clearTimeout(wheelTimer);
      cancelHold();
    };
  }, [canvasRef]);
}
