const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Headless false to "view"
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'homepage-screenshot.png', fullPage: true });
  console.log('Screenshot saved as homepage-screenshot.png');
  await browser.close();
})();