import { test, expect, waitForSimulator, waitForRenders, type Page } from './fixtures';
import { FRACTALS } from '../src/config/fractalConfig';

const zoomLabel = (page: Page) => page.locator('.fractal-simulator .simulator-zoom');
const input = (page: Page, label: string) => page.getByRole('textbox', { name: label, exact: true });

// Types a value and leaves the input, which applies it, as on a phone keypad without Enter
async function typeAndLeave(page: Page, label: string, value: string) {
  await input(page, label).fill(value);
  await page.getByRole('heading', { level: 1 }).click();
}

test('the inputs open the numeric keypad', async ({ page }) => {
  await page.goto('#/julia');
  for (const label of ['Center Re', 'Center Im', 'Zoom', 'c Re', 'c Im']) {
    await expect(input(page, label)).toHaveAttribute('inputmode', 'decimal');
  }
  await expect(input(page, 'Max iterations')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.getByRole('button', { name: 'Go' })).toHaveCount(0);
});

test('values apply when an input is left or on Enter', async ({ page }) => {
  await page.goto('#/mandelbrot');
  await waitForSimulator(page);
  await input(page, 'Zoom').fill('8');
  await expect(zoomLabel(page)).toHaveText('×1');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(zoomLabel(page)).toHaveText('×8');
  await input(page, 'Zoom').fill('16');
  await input(page, 'Zoom').press('Enter');
  await expect(zoomLabel(page)).toHaveText('×16');
  // A value that cannot be read is marked and kept
  await typeAndLeave(page, 'Zoom', 'abc');
  await expect(input(page, 'Zoom')).toHaveAttribute('aria-invalid', 'true');
  await expect(input(page, 'Zoom')).toHaveValue('abc');
});

test('± flips the sign', async ({ page }) => {
  await page.goto('#/mandelbrot');
  await waitForSimulator(page);
  // Without focus in its input it applies at once
  await page.getByRole('button', { name: 'Flip the sign of Center Re' }).click();
  await expect(input(page, 'Center Re')).toHaveValue('0.5000');
  // While typing it keeps the focus and the draft, applied when the input is left
  await input(page, 'Center Im').fill('0.25');
  await page.getByRole('button', { name: 'Flip the sign of Center Im' }).click();
  await expect(input(page, 'Center Im')).toBeFocused();
  await expect(input(page, 'Center Im')).toHaveValue('-0.25');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(input(page, 'Center Im')).toHaveValue(/^-0\.2500/);
});

test('the toolbar keeps its height as the zoom and the render time change', async ({ page, isMobile }) => {
  const toolbar = page.locator('.fractal-simulator .simulator-toolbar');
  // Phones from the narrowest to the widest: the toolbar wrapped differently on each
  for (const width of isMobile ? [320, 390, 430] : [1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('#/burning-ship');
    await waitForSimulator(page);
    const height = async () => (await toolbar.boundingBox())!.height;
    const first = await height();
    for (const zoom of ['128', '1e20']) {
      await typeAndLeave(page, 'Zoom', zoom);
      await waitForSimulator(page);
      expect(await height(), `toolbar at ${width} px and ${await zoomLabel(page).textContent()}`).toBe(first);
    }
    await expect(zoomLabel(page)).toContainText('(max)');
  }
});

test('the simulator is spaced like the formula above it and the gallery below', async ({ page }) => {
  // Below the last gallery card, the GitHub icon
  await page.goto('#/');
  await waitForRenders(page, FRACTALS.length);
  const galleryGap = await page.evaluate(() =>
    document.querySelector('footer img')!.getBoundingClientRect().top
      - [...document.querySelectorAll('main p')].pop()!.getBoundingClientRect().bottom);

  await page.goto('#/julia');
  await waitForSimulator(page);
  await expect(page.locator('main mjx-container').first()).toBeVisible({ timeout: 30_000 });
  const gaps = await page.evaluate(() => {
    const top = (s: string) => document.querySelector(s)!.getBoundingClientRect().top;
    const bottom = (e: Element) => e.getBoundingClientRect().bottom;
    const canvas = document.querySelector('.fractal-simulator canvas')!;
    const formula = [...document.querySelectorAll('main mjx-container[display="true"] mjx-math')].pop()!;
    const lastInput = [...document.querySelectorAll('.fractal-simulator input')].pop()!;
    return {
      formulaToCanvas: top('.fractal-simulator canvas') - bottom(formula),
      canvasToToolbar: top('.fractal-simulator .simulator-toolbar') - bottom(canvas),
      inputsToFooter: top('footer img') - bottom(lastInput),
    };
  });
  expect(Math.abs(gaps.canvasToToolbar - gaps.formulaToCanvas)).toBeLessThanOrEqual(4);
  expect(gaps.inputsToFooter).toBeCloseTo(galleryGap, 0);
});

test('no horizontal scrolling', async ({ page }) => {
  for (const hash of ['#/', '#/julia', '#/terms']) {
    await page.goto(hash);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test.describe('touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'fingers on a phone');

  type Point = { x: number; y: number };
  // Fingers moved in steps from where they are pressed to where they are lifted, as a phone sends them
  async function swipe(page: Page, from: Point[], to: Point[], steps = 10) {
    const cdp = await page.context().newCDPSession(page);
    const at = (t: number) => from.map((p, id) => ({ id, x: p.x + (to[id].x - p.x) * t, y: p.y + (to[id].y - p.y) * t }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / steps) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  // The page scrolled so that the canvas fills the middle of the screen, and its box there
  async function canvasInView(page: Page) {
    await page.goto('#/mandelbrot');
    await waitForSimulator(page);
    const canvas = page.locator('.fractal-simulator canvas');
    await canvas.evaluate((c) => c.scrollIntoView({ block: 'center', behavior: 'instant' }));
    return (await canvas.boundingBox())!;
  }

  test('one finger scrolls the page over the canvas and shows how to move it', async ({ page }) => {
    const box = await canvasInView(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    const x = box.x + box.width / 2;
    await swipe(page, [{ x, y: box.y + box.height - 20 }], [{ x, y: box.y + 20 }]);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollY + 50);
    await expect(page.locator('.fractal-simulator .simulator-hint')).toHaveClass(/\bshow\b/);
    await expect(input(page, 'Center Re')).toHaveValue('-0.5000');
    await expect(input(page, 'Center Im')).toHaveValue('0.0000');
    // It fades once the finger has stopped
    await expect(page.locator('.fractal-simulator .simulator-hint')).not.toHaveClass(/\bshow\b/);
  });

  test('two fingers move and pinch the view, not the page', async ({ page }) => {
    const box = await canvasInView(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Both fingers to the right: the image follows, so the center moves left
    await swipe(page, [{ x: cx - 50, y: cy }, { x: cx + 10, y: cy }], [{ x: cx + 10, y: cy }, { x: cx + 70, y: cy }]);
    await waitForSimulator(page);
    expect(Number(await input(page, 'Center Re').inputValue())).toBeLessThan(-0.6);
    await expect(input(page, 'Center Im')).toHaveValue('0.0000');
    // Apart, then about the same midpoint: zoomed in
    await swipe(page, [{ x: cx - 30, y: cy }, { x: cx + 30, y: cy }], [{ x: cx - 90, y: cy }, { x: cx + 90, y: cy }]);
    await waitForSimulator(page);
    await expect(zoomLabel(page)).not.toHaveText('×1');
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  });

  test('a double tap zooms in 2x', async ({ page }) => {
    const box = await canvasInView(page);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.touchscreen.tap(x, y);
    await page.touchscreen.tap(x, y);
    await expect(zoomLabel(page)).toHaveText('×2');
  });
});

test('the mouse drags the view', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a mouse');
  await page.goto('#/mandelbrot');
  await waitForSimulator(page);
  const box = (await page.locator('.fractal-simulator canvas').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy, { steps: 5 });
  await page.mouse.up();
  await waitForSimulator(page);
  expect(Number(await input(page, 'Center Re').inputValue())).toBeLessThan(-0.6);
});
