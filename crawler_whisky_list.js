const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
console.log('start...');

// 증류소 URL 모음
const firstUrls = require('./distiller_list.json');

// 딜레이를 위한 함수
const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

// axios 요청에 대한 재시도 로직을 포함하는 함수
const axiosGetWithRetry = async (url, retries = 3, retryDelay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(retryDelay); // 재시도 사이의 딜레이
    }
  }
};

const crawlDistillerPage = async (url) => {
  try {
    const response = await axiosGetWithRetry(url);
    const $ = cheerio.load(response.data);
    const whiskyData = [];
    let isCoreRange = false;

    $('tbody tr').each((i, tr) => {
      if ($(tr).hasClass('seperator')) {
        if ($(tr).text().includes('Core Range')) {
          isCoreRange = true;
        } else if ($(tr).text().includes('Distillery Bottling')) {
          isCoreRange = false;
        }
      } else if (isCoreRange) {
        // Core Range 섹션 안의 데이터만 처리
        const firstTd = $(tr).find('td').eq(0);
        const sizeTd = $(tr).find('td').eq(5).text();
        const removeMl = sizeTd.replace('ml', '').trim();
        const ninthTdText = $(tr).find('td').eq(8).text().trim();
        const isFirstTdEmpty = firstTd.hasClass('photo buttons') && firstTd.text().trim() === '';

        if (parseInt(removeMl, 10) >= 500 && ninthTdText !== '' && !isFirstTdEmpty) {
          const href = $(tr).find('td.name a.clickable').attr('href');
          if (href) {
            let breadcrumbText = $('ul.breadcrumb').text().trim().replace(/\s+/g, ' ');
      
            if (breadcrumbText.includes("Scotland")) {
              breadcrumbText = breadcrumbText.replace("Scotland", "Scotland/");
            }
      
            whiskyData.push({ href, breadcrumb: breadcrumbText });
          }
        }
      }
    });

    return whiskyData;
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return []; // 오류 발생 시 빈 배열 반환
  }
};

const crawlAllDistillers = async () => {
  const allWhiskyData = [];
  const limit = 3; // 한 번에 처리할 URL의 수

  for (let i = 0; i < firstUrls.length; i += limit) {
    const batch = firstUrls.slice(i, i + limit);
    await Promise.all(batch.map(url => crawlDistillerPage(url).then(data => allWhiskyData.push(...data))));
    await delay(2000); // 각 배치 처리 후에 2초의 딜레이
  }

  fs.writeFile('whisky_list.json', JSON.stringify(allWhiskyData.flat(), null, 2), (err) => {
    if (err) {
      console.error('Error writing whisky_list.json', err);
    } else {
      console.log('Success writing whisky_list.json');
    }
  });
};

crawlAllDistillers();
