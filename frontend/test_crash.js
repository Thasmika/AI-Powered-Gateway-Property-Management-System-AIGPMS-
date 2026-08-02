import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Set viewport for screenshot
  await page.setViewport({ width: 1280, height: 800 });
  
  // Go to page
  console.log("Navigating to title-deeds/new...");
  await page.goto('http://localhost:5173/title-deeds/new');
  await new Promise(r => setTimeout(r, 2000));
  
  // Try to login if redirected
  const currentUrl = page.url();
  console.log("Current URL:", currentUrl);
  if(currentUrl.includes('/login')) {
    console.log("Redirected to login. Trying to login...");
    await page.type('input[type="text"]', 'admin');
    await page.type('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));
    console.log("Post login URL:", page.url());
    // Navigate again
    await page.goto('http://localhost:5173/title-deeds/new');
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("Final URL:", page.url());
  const content = await page.content();
  console.log("CONTENT LENGTH:", content.length);
  if(content.includes("Module Placeholder") || content.includes("Title Deed Entry")) {
    console.log("PLACEHOLDER RENDERED IN HTML!");
  } else {
    console.log("PLACEHOLDER NOT FOUND IN HTML");
  }

  await page.screenshot({ path: 'screenshot.png' });
  console.log("Saved screenshot to screenshot.png");
  
  await browser.close();
})();
