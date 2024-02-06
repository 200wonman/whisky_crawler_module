console.log('Start.. Please wait..!');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const headers = [
  "Rating", "Style", "Produced In", "ABV", "Price"
];

// review_urls.json에서 URL 목록을 불러오는 부분
const reviewUrls = require('./review_urls.json');

// 지연 함수
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 각 리뷰 페이지를 크롤링하는 함수
const crawlPage = async (url) => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const dlData = {};

    // 페이지에서 데이터 추출 로직
    $('table.unstriped tbody tr').each((i, tr) => {
      const label = $(tr).find('td.rcr-data-label').text().trim();
      const value = $(tr).find('td.rcr-data-value').text().trim();

      // 헤더에 맞게 데이터 추출
      if (headers.includes(label)) {
        dlData[label] = value;
        console.log("value : ", value);
      }
    });

    // 지정된 시간만큼 대기
    await delay(1000 + Math.random() * 2000); // 1~3초 사이의 지연
    console.log("대기중입니다")
    return dlData;
  } catch (error) {
    console.error(error);
  }
};

// 모든 리뷰 URL에 대해 크롤링을 수행하고 결과를 CSV로 저장
const crawlAllPages = async () => {
  const allData = [];

  for (let url of reviewUrls) {
    const data = await crawlPage(url);
    if (data) {
      allData.push(data);
    }
  }

  const csvData = allData.filter(dlData => dlData && typeof dlData === 'object')
    .map(dlData => {
      return headers.map(header => {
        return `"${dlData[header] || ''}"`;
      }).join(',');
    });

  const finalCsv = [headers.join(',')].concat(csvData).join('\n');

  fs.writeFile('review_info.csv', finalCsv, (err) => {
    if (err) {
      console.error('Error writing review_info.csv', err);
    } else {
      console.log('Successfully wrote review_info.csv');
    }
  });
};

crawlAllPages().catch(error => {
  console.error('Error in crawling:', error);
});
