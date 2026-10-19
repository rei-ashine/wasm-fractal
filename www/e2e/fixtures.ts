import { test as base, expect, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const bootstrapCss = require.resolve('bootstrap/dist/css/bootstrap.min.css');
const mathjaxDir = path.dirname(require.resolve('mathjax/es5/tex-mml-chtml.js'));
const axeScript = require.resolve('axe-core/axe.min.js');

// Every test page loads Bootstrap and MathJax from the npm packages of the versions the site
// pins on the CDN, so the tests do not depend on the CDN, and never loads Google Tag Manager,
// so they do not count as visits. Any uncaught page error fails the test.
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.route(/googletagmanager\.com/, (route) => route.abort());
    await page.route(/cdn\.jsdelivr\.net\/npm\/bootstrap@5\.0\.2\/dist\/css\/bootstrap\.min\.css$/, (route) =>
      route.fulfill({ path: bootstrapCss, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' } }));
    await page.route(/cdn\.jsdelivr\.net\/npm\/mathjax@3\.2\.2\/es5\/(.+)$/, (route) => {
      const file = new URL(route.request().url()).pathname.replace('/npm/mathjax@3.2.2/es5/', '');
      return route.fulfill({ path: path.join(mathjaxDir, file), headers: { 'access-control-allow-origin': '*' } });
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(page);
    expect(errors, 'page errors').toEqual([]);
  },
});

export { expect };

// Waits until every fractal canvas on the page has finished rendering
export async function waitForRenders(page: Page, count: number) {
  await expect(page.getByText(/^Rendered in \d+ ms$/)).toHaveCount(count, { timeout: 60_000 });
}

// The simulator's render status, once it has finished
export async function waitForSimulator(page: Page) {
  await expect(page.locator('.fractal-simulator .simulator-status')).toHaveText(/^Rendered in \d+ ms$/, { timeout: 60_000 });
}

// The axe accessibility violations of the page, as "rule: element" lines
export async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: axeScript });
  return page.evaluate(async () => {
    const { violations } = await (window as any).axe.run(document);
    return violations.flatMap((v: any) => v.nodes.map((n: any) => `${v.id}: ${n.target.join(' ')}`));
  });
}
