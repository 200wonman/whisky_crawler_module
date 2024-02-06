const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const crawlWhiskyBase = async () => {
  const url = 'https://www.whiskybase.com/whiskies/brands';
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const whiskyLinks = [];

    $('tbody > tr').each((i, element) => {
      const rating = $(element).find('td').eq(4).text().trim();
      const votes = $(element).find('td').eq(3).text().trim();
    
      console.log(rating,);
      console.log(votes);
      if (rating && parseFloat(rating) >= 80 && votes && parseInt(votes) >= 500) {
        const href = $(element).find('td.clickable a').attr('href');
        if (href) {
          whiskyLinks.push(href);
        }
      }
    });

    return whiskyLinks;
  } catch (error) {
    console.error('Error crawling the website:', error);
    return [];
  }
};

crawlWhiskyBase().then(whiskyLinks => {
  // 추출된 링크를 distiller_list.json 파일에 저장
  fs.writeFile('distiller_list.json', JSON.stringify(whiskyLinks, null, 2), (err) => {
    if (err) {
      console.error('Error writing distiller_list.json:', err);
    } else {
      console.log('Successfully wrote distiller_list.json');
    }
  });
});
