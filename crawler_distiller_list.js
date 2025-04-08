const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 랜덤 딜레이를 생성하는 함수
const randomDelay = () => new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));

// 요청을 실행하는 함수
const fetchWhiskyLink = async (element) => {
  try {
    await randomDelay(); // 랜덤 딜레이 추가
    const href = element.attr('href');
    if (href) {
      console.log(href);
      return href;
    }
    return null;
  } catch (error) {
    console.error('Error fetching the whisky link:', error);
    return null;
  }
};

const crawlWhiskyBase = async () => {
  const url = 'https://www.whiskybase.com/whiskies/brands';
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const fetchPromises = [];

    $('tbody > tr').each((i, el) => {
      const element = $(el);
      const rating = element.find('td').eq(4).text().trim();
      const votes = element.find('td').eq(3).text().trim();

      if (rating && parseFloat(rating) >= 20 && votes && parseInt(votes) >= 50) {
        const linkElement = element.find('td.clickable a');
        fetchPromises.push(fetchWhiskyLink(linkElement));
      }
    });

    // 모든 작업을 병렬로 실행
    const whiskyLinks = await Promise.all(fetchPromises);
    return whiskyLinks.filter(link => link !== null); // null 값 제거
  } catch (error) {
    console.error('Error crawling the website:', error);
    return [];
  }
};

crawlWhiskyBase().then(whiskyLinks => {
  fs.writeFile('distiller_list.json', JSON.stringify(whiskyLinks, null, 2), (err) => {
    if (err) {
      console.error('Error writing distiller_list.json:', err);
    } else {
      console.log('Successfully wrote distiller_list.json');
    }
  });
});
