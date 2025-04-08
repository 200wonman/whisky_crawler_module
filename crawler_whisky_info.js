const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const async = require('async');
console.log('start...');

const whiskyList = require('./whisky_list.json');

const headers = [
  "path",
  "titleText",
  "Category",
  "Distillery",
  "Bottler",
  "Bottling serie",
  "Stated Age",
  "Cask Type",
  "Strength",
  "Size",
  "Label",
  "Image URL",
  "TASTINGTAGS"
];

const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

const axiosGetWithRetry = async (url, retries = 3, retryDelay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(retryDelay);
    }
  }
};

const crawlPage = async (whisky) => {
  try {
    const randomDelay = Math.floor(Math.random() * (7000 - 4000 + 1) + 4000); // 4000ms부터 7000ms 사이의 랜덤 딜레이
    await delay(randomDelay);

    const response = await axiosGetWithRetry(whisky.href);
    const $ = cheerio.load(response.data);
    const dlData = {};

    // <h1> 태그 안의 <span>과 그 뒤의 텍스트 추출
    const brand = $('h1 a span').text().trim();
    const year = $('h1').contents().filter(function() {
      return this.nodeType === 3; // Node.TEXT_NODE
    }).text().trim();

    dlData['titleText'] = `${brand} ${year}`;

    $('dl').each((i, elem) => {
      $(elem).find('dt').each((index, dt) => {
        const term = $(dt).text().trim();
        const definition = $(dt).next('dd').text().trim();

        dlData[term] = term === 'Size' && parseInt(definition, 10) < 500 ? '' : definition;
      });
    });

    const imageURL = $('div#carousel-whisky a.photo img').attr('src');
    dlData['Image URL'] = imageURL;

    const tastingTags = [];
    $('ul.tastingtags li div.tag-name').each((i, div) => {
      const tagName = $(div).text().trim();
      tastingTags.push(tagName);
    });
    dlData['TASTINGTAGS'] = tastingTags.join("/ ");

    dlData['path'] = whisky.breadcrumb;

    console.log('ing...');

    return dlData;

  } catch (error) {
    console.error(error);
    return null;
  }
};

const crawlAllWhiskies = async () => {
  const allData = [];
  const limit = 5;
  const batchSize = 5000; // 5000개 데이터마다 파일 저장
  let fileCount = 1;

  for (let i = 0; i < whiskyList.length; i += limit) {
    const batch = whiskyList.slice(i, i + limit);
    await async.eachLimit(batch, limit, async (whisky) => {
      const data = await crawlPage(whisky);
      if (data) allData.push(data);
    });

    // 5000개 데이터마다 또는 마지막 데이터에 도달했을 때 CSV 파일 생성
    if (allData.length >= batchSize || i + limit >= whiskyList.length) {
      const validData = allData.slice(0, batchSize);
      const csvLines = validData.map(dlData => headers.map(header => `"${dlData[header] || ''}"`).join(','));
      const finalCsv = [headers.join(',')].concat(csvLines).join('\n');

      fs.writeFile(`whisky_info_${fileCount}.csv`, finalCsv, (err) => {
        if (err) {
          console.error(`Error writing whisky_info_${fileCount}.csv`, err);
        } else {
          console.log(`Successfully wrote whisky_info_${fileCount}.csv`);
        }
      });

      allData.splice(0, batchSize); // 저장된 데이터 제거
      fileCount++;
    }

    await delay(10000);
  }
};

crawlAllWhiskies();
