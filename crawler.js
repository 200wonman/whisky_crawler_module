const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');


// 크롤링 할 url
const urls = require('./whisky_url.json');

// URL별로 크롤링하는 함수
const crawlPage = (url) => {
  return axios.get(url)
    .then(response => {
      const $ = cheerio.load(response.data);
      const dlData = {};

      // titleText 추출
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      const titleText = lastPart; // 가장 마지막 부분을 titleText로 저장
      dlData['titleText'] = titleText;
    
      // 내용 추출
      $('dl').each((i, elem) => {
        $(elem).find('dt').each((index, dt) => {
          const term = $(dt).text().trim();
          const definition = $(dt).next('dd').text().trim();
          dlData[term] = definition;
        });
      });

      // 이미지 크롤링
      const imageURL = $('div#carousel-whisky a.photo img').attr('src');
      if (imageURL && imageURL.includes('https://static.whiskybase.com/storage/whiskies/default/big.png')) {
        dlData['Image URL'] = 'null';
      } else {
        dlData['Image URL'] = imageURL;
      }

      // TASTINGTAGS 크롤링
      const tastingTags = [];
      $('ul.tastingtags li div.tag-name').each((i, div) => {
        const tagName = $(div).text().trim();
        tastingTags.push(tagName);
      });
      dlData['TASTINGTAGS'] = tastingTags;

      return dlData;
    })
    .catch(error => {
      console.error(error);
    });
};

// 모든 URL에 대해 크롤링하고 Promise 반환
const crawlPromises = urls.map(url => crawlPage(url));

// 모든 크롤링 작업이 완료된 후 데이터 처리
Promise.all(crawlPromises).then(allData => {
  // 모든 페이지의 데이터를 하나의 CSV 문자열로 결합
  const csvData = allData.map((dlData, index) => {
    return Object.keys(dlData)
      .map(key => {
        const value = Array.isArray(dlData[key]) ? dlData[key].join(", ") : dlData[key];
        return `"${key}","${value}"`;
      })
      .join('\n');
  }).join('\n\n');

  // 하나의 CSV 파일에 저장
  fs.writeFile('url_output.csv', csvData, (err) => {
    if (err) {
      console.error('Error url_output.csv', err);
    } else {
      console.log('success url_output.csv');
    }
  });
}).catch(error => {
  console.error('err catch:', error);
});
