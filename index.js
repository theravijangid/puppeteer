const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

app.get("/search", async (req, res) => {
  const keyword = req.query.keyword;
  
  if (!keyword) {
    return res.status(404).json({
      success: false,
      error: "Please search for a keyword",
    });
  }

  try {
    const browser = await puppeteer.launch({args: ['--enable-logging'],});
    
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    await page.goto(`https://www.amazon.in/s?k=${encodeURIComponent(keyword)}`);

    const products = await page.evaluate(async () => {
      const productElements = document.querySelectorAll("div.s-asin");
      const results = [];

      for (let i = 0; i < 4 && i < productElements.length; i++) {
        const element = productElements[i];

        const name = element.querySelector("span.a-color-base ")?.innerText || "Not Found";
        const description = element.querySelector("span.a-text-normal")?.innerText || "Not Found";
        const rating = element.querySelector("span.a-icon-alt")?.innerText || "Not Found";
        const reviews = element.querySelector("span.a-size-base")?.innerText || "Not Found";
        const price = element.querySelector("span.a-offscreen")?.innerText || "Not Found";

        const reviewsLink = element.querySelector("a.a-link-normal")?.getAttribute("href");
        console.log("reviews Link : ", reviewsLink);

        if(!reviewsLink) {
            return "Review Link Not Found"
        }

        let topReviews = [];
        if (reviewsLink) {
            try {
              console.log("Fetching reviews : :", reviewsLink);
              await page.goto(`https://www.amazon.in${reviewsLink}`);
          
              const reviewsList = await page.evaluate(() => {
                const reviews = [];
                const reviewsElements = document.querySelectorAll("span"); //div.a-expander-content  span.a-size-base
          
                for (let i = 0; i < 10 ; i++) {
                  reviews.push(reviewsElements[i]?.innerText || "Not Found");
                }
                return reviews;
              });
              console.log("Fetched reviews:", reviewsList);
              topReviews = reviewsList;
            } catch (error) {
              console.error("Error fetching reviews:", error);
              console.error(error.stack);
              response = {
                success:false,
                error: "failed to retieve"
              };
            }
            
          }
          
        results.push({ name, description, rating, reviews, price, topReviews });
      }

      return results;
    });

    await browser.close();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve data",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
