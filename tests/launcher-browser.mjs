import {isolatedOffice} from './isolated-office.mjs';
const isolated=await isolatedOffice();
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/api/**',route=>route.abort());
 await page.goto(isolated.url+'/app/');
 await page.waitForFunction(()=>document.querySelector('#connection').textContent.includes('服务没在运行'));
 assert.match(await page.locator('#connection').textContent(),/双击桌面/);
} finally {await browser.close();await isolated.stop();}
