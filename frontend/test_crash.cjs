const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  // We need to login first or we can just try to hit the route and see if it crashes React
  await page.goto('http://localhost:5173/title-deeds/new');
  
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  console.log("CONTENT LENGTH:", content.length);
  if(content.includes("403 - Access Denied")) {
    console.log("SHOWS 403");
  } else if(content.includes("Module")) {
    console.log("SHOWS MODULE PLACEHOLDER");
  } else {
    console.log("SHOWS SOMETHING ELSE");
  }
  
  await browser.close();
})();
