import { useEffect } from 'react';

const SITE = 'Fractals';

// Sets the tab title to "{page} | Fractals", so each page has its own in tabs, the history and
// screen readers; the site name alone when there is no page title
export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} | ${SITE}` : SITE;
  }, [page]);
}
