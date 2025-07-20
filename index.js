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

    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: 'Scraping failed', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
