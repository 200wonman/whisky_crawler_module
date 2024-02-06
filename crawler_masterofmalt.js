const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const ginBrandUrls = require('./ginbrand_list.json'); 

const crawlGinPage = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
      }
    });
    const html = response.data;
    const $ = cheerio.load(html);
    const ginData = [];

    $('.Productstyled__StyledProductImageAnchor-sc-1u7jkhl-1.kehXyw').each((i, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullUrl = `https://www.masterofmalt.com${href}`;
        ginData.push(fullUrl);
      }
    });

    return ginData;
  } catch (error) {
    console.error('Error in URL:', url, error);
  }
};

Promise.all(ginBrandUrls.map(url => crawlGinPage(url)))
  .then(allGinData => {
    const combinedGinList = allGinData.flat();
    fs.writeFileSync('master_of_malt_list.json', JSON.stringify(combinedGinList, null, 2));
    console.log('Data has been saved to master_of_malt_list.json');
  })
  .catch(error => {
    console.error('Error in crawling:', error);
  });
