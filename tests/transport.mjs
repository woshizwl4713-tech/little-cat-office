import {isolatedOffice} from './isolated-office.mjs';
const isolated=await isolatedOffice();
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 0.05 min = 3s: short enough to test preservation beyond expiry, long enough that a
  // just-served Playwright mock is not immediately treated as stale in the page.
  await page.route('**/config.json', (route) =>
    route.fulfill({
      json: {
        statusUrl: '/custom-status',
        pollIntervalMs: 100,
        offlineAfterMinutes: 0.05,
      },
    }),
  );

  const stateRef = {value: 'meeting', fail: false};
  await page.route('**/custom-status*', (route) => {
    if (stateRef.fail) return route.abort();
    return route.fulfill({
      json: {
        agents: [
          {
            id: 'transport',
            name: '测试伙伴',
            state: stateRef.value,
            task: stateRef.value === 'meeting' ? '讨论' : '恢复工作',
            updatedAt: new Date().toISOString(),
          },
        ],
        activity: [],
      },
    });
  });

  await page.goto(isolated.url + '/app/');

  await page.waitForFunction(
    () => window.officeDebug?.getCats()?.some((c) => c.id === 'transport' && c.meeting === true),
    null,
    {timeout: 60000},
  );

  stateRef.fail = true;
  await page.waitForTimeout(5000);
  assert.equal(await page.evaluate(() => officeDebug.getCats().find(c => c.id === 'transport').meeting), true);
  assert.match(await page.locator('#connection').textContent(), /服务没在运行/);

  stateRef.fail = false;
  stateRef.value = 'working';
  await page.waitForFunction(
    () => officeDebug.getCats().find((c) => c.id === 'transport')?.status === 'working',
    null,
    {timeout: 60000},
  );

  assert.deepEqual(errors, []);
  console.log('Pull, preserved state during failure, and recovery passed');
} finally {
  await browser.close();await isolated.stop();
}
