const puppeteer = require("puppeteer");
const fs = require("fs/promises");
const xlsx = require("xlsx");
const { resolve } = require("path");
const wb = xlsx.utils.book_new();
const HEADLESS = false;

////////////////////////////////////////////////////////////////////////////////
// search fields which could be used to search for a product
const location = "Miami, Florida"; //you have to type in the complete location name, no shortcuts (FL,NC, etc) are not accepted
const item = "شقة";
const availability = "in"; // in or out
const condition = "new"; // new or used
const daysSinceListed = "30"; //1 or 7 or 30
const minPrice = "0";
const maxPrice = "10000000000000";
/////////////////////////////////////////////////////////////////////////////////

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 500 });
  let url = `https://www.facebook.com/marketplace/${location}/search?availability=${availability}%20stock&daysSinceListed=${daysSinceListed}&itemCondition=${condition}&query=${item}&exact=false`;
  await page.goto(url, {
    waitUntil: "networkidle2",
  });

  console.log("scraping...");

  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      let prev;

      const interval = setInterval(() => {
        const length = document.querySelectorAll(
          'div [class = "rq0escxv j83agx80 cbu4d94t i1fnvgqd muag1w35 pybr56ya f10w8fjw k4urcfbm c7r68pdi suyy3zvx"]'
        ).length;

        if (prev && prev === length) {
          resolve();
          clearInterval(interval);
        }

        window.scrollBy({
          left: 0,
          top: document.documentElement.scrollHeight,
        });
        if (length > 1000) {
          clearInterval(interval);
          resolve();
        }
        prev = length;
      }, 1000);
    });
  });

  let data = await page.evaluate(() => {
    let products = document.querySelectorAll(
      'div [class = "rq0escxv j83agx80 cbu4d94t i1fnvgqd muag1w35 pybr56ya f10w8fjw k4urcfbm c7r68pdi suyy3zvx"]'
    );

    const item = Array.from(products).map((product) => {
      const price = product.firstChild.innerText;
      const location = product.lastChild.innerText;
      const link = product.parentNode.parentElement.href;
      const description = product.querySelector("div:nth-child(2)").innerText;
      const image = product.parentNode.querySelector("img").src;

      return {
        price: price,
        location: location,
        link: link,
        description: description,
        image: image,
      };
    });

    return item;
  });
  const ws = xlsx.utils.json_to_sheet(data);

  xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
  xlsx.writeFile(wb, "marketplace.xlsx");

  await browser.close();
})();
