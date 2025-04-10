const axios = require('axios');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;
const UserAgent = require('user-agents');

const MAX_RETRIES = 5;
const CONCURRENT_REQUESTS = 2;
const RATE_LIMIT_DELAY = 15000;
const BATCH_LIMIT = 500;

let failedIds = [];

const randomDelay = () => new Promise(res => setTimeout(res, Math.random() * (25000 - 10000) + 10000));
const rateLimitDelay = () => new Promise(res => setTimeout(res, RATE_LIMIT_DELAY));

const fetchProductData = async (productId, retry = 0) => {
  const headers = {
    'User-Agent': new UserAgent().toString(),
    'Accept': 'application/json, text/plain, */*'
  };

  try {
    const response = await axios.get(`https://api.dailyshot.co/items/details/?top_product_id=${productId}`, {
      headers,
      timeout: 15000
    });

    return response.data;
  } catch (error) {
    console.warn(`[!] Error for ID ${productId}:`, error.message);
    if (retry < MAX_RETRIES) {
      console.log(`[↻] Retrying ID ${productId} (attempt ${retry + 1})`);
      return await fetchProductData(productId, retry + 1);
    }
    return null;
  }
};

const extractInfo = (json) => {
  if (!json) return null;

  const name = json.name || '';
  const enName = json.en_name || '';
  const category = json.category_name || '';
  const subcategory = json.subcategory_name || '';

  const infoDict = {};
  (json.information || []).forEach(item => {
    infoDict[item.label] = item.value;
  });

  const type = infoDict['종류'] || '';
  const abv = infoDict['도수'] || '';
  const country = infoDict['국가'] || '';
  const region = infoDict['지역'] || '';

  let aroma = '', taste = '', finish = '';
  (json.tasting_notes || []).forEach(note => {
    if (note.label_ko === '향') aroma = note.value;
    if (note.label_ko === '맛') taste = note.value;
    if (note.label_ko === '여운') finish = note.value;
  });

  return [name, enName, category, subcategory, type, abv, country, region, aroma, taste, finish];
};

const saveToCsv = async (data, filename) => {
  const writer = createCsvWriter({
    path: filename,
    header: ['제품명', '영문명', '카테고리', '서브카테고리', '종류', '도수', '국가', '지역', '향', '맛', '여운']
  });
  await writer.writeRecords(data);
};

const saveFailedIdsToCsv = async (ids, filename) => {
  const writer = createCsvWriter({
    path: filename,
    header: ['실패한 ID'],
    append: true
  });
  const records = ids.map(id => [id]);
  await writer.writeRecords(records);
};

const processBatch = async (ids) => {
  const results = [];

  const tasks = ids.map(async (id) => {
    await rateLimitDelay();
    const jsonData = await fetchProductData(id);
    const info = extractInfo(jsonData);
    if (info) {
      results.push(info);
    } else {
      failedIds.push(id);
    }
    await randomDelay();
  });

  await Promise.all(tasks);
  return results;
};

const main = async () => {
  const startId = 3195;
  const endId = 3196;
  let chunk = [];
  let csvIndex = 1;

  for (let i = startId; i < endId; i += CONCURRENT_REQUESTS) {
    const ids = Array.from({ length: CONCURRENT_REQUESTS }, (_, k) => i + k).filter(id => id < endId);
    const result = await processBatch(ids);
    chunk.push(...result);

    if (chunk.length >= BATCH_LIMIT || i + CONCURRENT_REQUESTS >= endId) {
      const filename = `dailyshot_scraped_part_${csvIndex}.csv`;
      await saveToCsv(chunk, filename);
      console.log(`[✓] Saved ${chunk.length} entries to ${filename}`);
      chunk = [];
      csvIndex++;
    }
  }

  if (failedIds.length > 0) {
    await saveFailedIdsToCsv(failedIds, 'failed_ids.csv');
    console.warn(`[!] ${failedIds.length}개의 ID 수집 실패 → failed_ids.csv에 누적 저장됨`);
  }

  console.log('[✓] All Done.');
};

main();
