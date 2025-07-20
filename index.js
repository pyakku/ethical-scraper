import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';
import { URL } from 'url';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8080;

const visited = new Set();
const scrapedData = {};

async function isAllowed(url) {
  try {
    const { origin } = new URL(url);
    const robotsUrl = `${origin}/robots.txt`;
    const res = await axios.get(robotsUrl);
    const robots = robotsParser(robotsUrl, res.data);
    return robots.isAllowed(url, 'ethical-scraper');
  } catch {
    return true;
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapePage(url, baseDomain) {
  if (visited.has(url)) return;
  visited.add(url);

  if (!(await isAllowed(url))) return;

  try {
    const res = await axios.get(url, { maxRedirects: 5 });
    const $ = load(res.data);

    $('script, style, noscript, img').remove();

    const text = $('body')
      .find('*')
      .contents()
      .filter(function () {
        return this.type === 'text' && $(this).text().trim().length > 0;
      })
      .map(function () {
        return $(this).text().trim();
      })
      .get()
      .join('\n');

    scrapedData[url] = {
      title: $('title').text(),
      text
    };

    // Collect internal links
    const links = $("a[href]")
      .map((_, a) => new URL($(a).attr("href"), url).href)
      .get()
      .filter((link) => {
        const parsed = new URL(link);
        return (
          parsed.origin === baseDomain &&
          !visited.has(parsed.href) &&
          !parsed.hash && // Skip anchor links
          !parsed.pathname.endsWith('.pdf') // Skip non-HTML docs
        );
      });

    for (const link of links) {
      await delay(500); // Wait 0.5s between requests
      await scrapePage(link, baseDomain);
    }
  } catch (err) {
    scrapedData[url] = { error: err.message };
  }
}

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  visited.clear();
  Object.keys(scrapedData).forEach(k => delete scrapedData[k]);

  try {
    const baseDomain = new URL(url).origin;
    await scrapePage(url, baseDomain);
    res.json(scrapedData);
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ethical Scraper running on port ${PORT}`);
});
