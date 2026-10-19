import { test, expect, waitForRenders, axeViolations } from './fixtures';
import { FRACTALS } from '../src/config/fractalConfig';

test('the gallery renders every fractal', async ({ page }) => {
  await page.goto('#/');
  await waitForRenders(page, FRACTALS.length);
  // Each link is named after its fractal, not by the render time alone
  for (const f of FRACTALS) {
    await expect(page.getByRole('link', { name: new RegExp(`^${f.title} Rendered in`) })).toBeVisible();
  }
});

test('every page has its own title', async ({ page }) => {
  const pages: [string, string][] = [
    ['#/', 'Gallery | Fractals'],
    ...FRACTALS.map((f): [string, string] => [`#/${f.path}`, `${f.title} | Fractals`]),
    ['#/terms', 'Terms of Service | Fractals'],
    ['#/privacy', 'Privacy Policy | Fractals'],
  ];
  for (const [hash, title] of pages) {
    await page.goto(hash);
    await expect(page).toHaveTitle(title);
  }
});

test('a link opens the next page at its top, and Back returns to the position', async ({ page }) => {
  await page.goto('#/terms');
  // With the web font in, as its swap reflows the text and moves the scroll position
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  const bottom = await page.evaluate(() => window.scrollY);
  expect(bottom).toBeGreaterThan(0);
  // The footer link, clicked as a script so the test does not scroll it into view first
  await page.getByRole('link', { name: 'Privacy |' }).evaluate((a: HTMLElement) => a.click());
  await expect(page).toHaveURL(/#\/privacy$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/#\/terms$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(bottom);
});

test('the menu opens over the page when it is scrolled down', async ({ page }) => {
  await page.goto('#/');
  await waitForRenders(page, FRACTALS.length);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.getByRole('button', { name: 'Menu' }).click();
  const menu = page.getByRole('navigation', { name: 'Fractals' });
  await expect(page.getByRole('link', { name: 'Celtic Mandelbrot', exact: true })).toBeInViewport();
  const box = await menu.boundingBox();
  expect(box?.y).toBe(0);
  // A menu link opens its page at the top and closes the menu
  await page.getByRole('link', { name: 'Burning Ship', exact: true }).click();
  await expect(page).toHaveURL(/#\/burning-ship$/);
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('the menu slides in whole and, tapped or clicked, rings none of its links', async ({ page }) => {
  await page.goto('#/');
  const link = page.getByRole('link', { name: 'Mandelbrot Set', exact: true });
  await page.getByRole('button', { name: 'Menu' }).click();
  // While it slides, the link has the size, and so the lines, it ends with (to the pixel: the
  // slide leaves fractions)
  const size = async () => {
    const { width, height } = (await link.boundingBox())!;
    return { width: Math.round(width), height: Math.round(height) };
  };
  const sliding = await size();
  const menu = page.getByRole('navigation', { name: 'Fractals' });
  await menu.evaluate((nav) => Promise.all(nav.getAnimations().map((a) => a.finished)));
  expect(await size()).toEqual(sliding);
  // The menu itself has the focus, so Tab goes on to its links
  await expect(menu).toBeFocused();
  await expect(page.getByRole('link', { name: 'Gallery', exact: true })).not.toBeFocused();
});

test.describe('keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'a desktop keyboard');

  test('the menu opens with the keyboard and closes with Escape', async ({ page }) => {
    await page.goto('#/');
    const button = page.getByRole('button', { name: 'Menu' });
    // The closed menu's links are not tab stops: the brand, then the menu button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Fractals', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('link', { name: 'Gallery', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Julia Set', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(button).toBeFocused();
      await expect(page.getByRole('navigation', { name: 'Fractals' })).toBeHidden();
    }
  });

  test('no accessibility violations', async ({ page }) => {
    await page.goto('#/');
    await waitForRenders(page, FRACTALS.length);
    expect(await axeViolations(page)).toEqual([]);
    await page.goto('#/julia');
    await waitForRenders(page, 1);
    expect(await axeViolations(page)).toEqual([]);
  });
});
