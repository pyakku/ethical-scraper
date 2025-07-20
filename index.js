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
    return true; // If robots.txt can't be loaded, proceed by default
  }
}

async function scrapePage(url, baseDomain) {
  if (visited.has(url)) return;
  visited.add(url);

  if (!(await isAllowed(url))) return;

  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const title = $('title').text();
    scrapedData[url] = { title };

    const links = $("a[href]")
      .map((_, a) => new URL($(a).attr("href"), url).href)
      .get()
      .filter((link) => link.startsWith(baseDomain));

    for (const link of links) {
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
  scrapedData[url] = {};

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
