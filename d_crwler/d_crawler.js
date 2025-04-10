// 필요한 모듈 불러오기
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { Parser } = require('json2csv');

// 크롤링할 ID 범위와 설정값
const startId = 4444;
const endId = 4444;
const batchSize = 3; // 병렬 요청 수
const csvChunkSize = 500; // CSV 파일당 데이터 개수
const maxRetries = 3; // 요청 재시도 횟수

// User-Agent 리스트 (랜덤 선택)
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
];

// 랜덤 딜레이 생성 함수 (13초~15초)
const getRandomDelay = (min = 13000, max = 15000) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 페이지에서 필요한 텍스트 정보 추출
const extractDataFromPage = ($, url) => {
  const nameEn = $('div.dailyshot-4bl7jf').text().trim();
  const nameKo = $('h1.dailyshot-hiscr6').text().trim();

  let type = '', abv = '', aroma = '', taste = '', finish = '', country = '', region = '';

  $('div.dailyshot-2ufkj3 h2').each((_, el) => {
    const sectionTitle = $(el).text().trim();
    const section = $(el).parent();

    if (sectionTitle === 'Information') {
      section.find('div.dailyshot-1lweaqt').each((_, group) => {
        const label = $(group).find('h3').text().trim();
        const value = $(group).find('div.dailyshot-zdzdc3').text().trim();

        if (label === '종류') type = value;
        if (label === '도수') abv = value;
        if (label === '국가') country = value;
        if (label === '지역') region = value;
      });
    }

    if (sectionTitle === 'Tasting Notes') {
      section.find('div.dailyshot-1lweaqt').each((_, group) => {
        const label = $(group).find('h3').text().trim();
        const value = $(group).find('div.dailyshot-zdzdc3').text().trim();

        if (label === 'Aroma') aroma = value;
        if (label === 'Taste') taste = value;
        if (label === 'Finish') finish = value;
      });
    }
  });

  const comment = $('h2:contains("Dailyshot\'s Comment")')
    .next()
    .find('p')
    .text()
    .trim();

  if (!nameEn && !nameKo) return null;

  return { url, nameEn, nameKo, type, abv, aroma, taste, finish, comment, country, region };
};

// 500개씩 나눠서 CSV 파일로 저장
const saveCsvChunks = (data, chunkSize) => {
  const parser = new Parser();

  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const csv = parser.parse(chunk);
    const filename = `dailyshot_items_${i / chunkSize + 1}.csv`;
    fs.writeFileSync(filename, csv, 'utf8');
    console.log(`💾 ${filename} 저장됨`);
  }
};

// 로그 저장
const appendLog = (filename, message) => {
  fs.appendFileSync(filename, message + '\n');
};

// 메인 크롤링 함수
const crawl = async () => {
  const results = [];
  const ids = [];
  for (let id = startId; id <= endId; id++) ids.push(id);

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    const batchPromises = batch.map(async (id) => {
      const url = `https://dailyshot.co/m/item/${id}`;
      const headers = {
        'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
        'Referer': 'https://dailyshot.co/',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      };

      let attempt = 0;
      let success = false;

      while (attempt < maxRetries && !success) {
        try {
          const res = await axios.get(url, { headers });
          const $ = cheerio.load(res.data);
          const data = extractDataFromPage($, url);

          if (data) {
            results.push(data);
            appendLog('request_log.txt', `✅ ${id} ${url}`);
            console.log(`✅ ${id} 데이터 있음`);
          } else {
            appendLog('request_log.txt', `⚠️ ${id} 데이터 없음`);
            console.log(`⚠️ ${id} 데이터 없음`);
          }

          success = true;
        } catch (err) {
          attempt++;
          appendLog('error_log.txt', `❌ ${id} (${attempt}회차) 오류: ${err.message}`);
          console.log(`❌ ${id} 요청 실패 (${attempt}회차):`, err.message);

          if (attempt < maxRetries) {
            console.log('⏳ 재시도 전 36초 대기 중...');
            await delay(36000);
          }
        }
      }
    });

    await Promise.all(batchPromises);

    const delayMs = getRandomDelay();
    console.log(`⏳ ${delayMs}ms 대기 중...`);
    await delay(delayMs);
  }

  if (results.length > 0) {
    saveCsvChunks(results, csvChunkSize);
    console.log('✅ 모든 CSV 저장 완료!');
  } else {
    console.log('❗ 저장할 데이터가 없습니다.');
  }
};

crawl();
