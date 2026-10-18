import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// The scroll position of each page visited, by its history entry
const positions = new Map<string, number>();

// A page opened from a link or the menu starts at its top, not at the scroll position of the
// page before it. Back and forward return to where the page was.
const RouteScroll: React.FC = () => {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  // The history entry the window is showing
  const keyRef = useRef(key);

  useEffect(() => {
    // The browser restores the position before the page is rendered, while the page before it,
    // perhaps shorter, is still there; this component restores it after
    history.scrollRestoration = 'manual';
    const save = () => positions.set(keyRef.current, window.scrollY);
    window.addEventListener('scroll', save, { passive: true });
    return () => window.removeEventListener('scroll', save);
  }, []);

  // A layout effect: the page is rendered, but not painted at the old position yet
  useLayoutEffect(() => {
    keyRef.current = key;
    // instant: Bootstrap makes the page scroll smoothly, which would slide the new page from the old position
    window.scrollTo({ left: 0, top: navigationType === 'POP' ? positions.get(key) ?? 0 : 0, behavior: 'instant' });
  }, [key]);

  return null;
};

export default RouteScroll;
