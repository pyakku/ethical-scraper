const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'EthicalScraperBot/1.0 (contact: your-email@example.com)',
      }
    });

    const $ = cheerio.load(html);
    const title = $('title').text();

    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: 'Failed to scrape', details: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}`));
