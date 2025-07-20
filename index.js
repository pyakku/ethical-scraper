import express from 'express';
import axios from 'axios';
import { load } from 'cheerio';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const response = await axios.get(url);
    const $ = load(response.data);

    const title = $('title').text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';

    const headings = {
      h1: [],
      h2: [],
      h3: [],
    };
    $('h1').each((_, el) => headings.h1.push($(el).text()));
    $('h2').each((_, el) => headings.h2.push($(el).text()));
    $('h3').each((_, el) => headings.h3.push($(el).text()));

    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) links.push({ href, text });
    });

    const images = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      if (src) images.push({ src, alt });
    });

    const paragraphs = [];
    $('p').each((_, el) => paragraphs.push($(el).text().trim()));

    res.json({
      title,
      meta: {
        description: metaDescription,
        keywords: metaKeywords,
      },
      headings,
      links,
      images,
      paragraphs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
