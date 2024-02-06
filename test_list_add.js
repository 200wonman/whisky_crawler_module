const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// 특정 카테고리 페이지에서 리뷰 페이지의 URL을 수집하는 함수
const crawlCategoryPages = async (baseUrl, totalPages) => {
  let allReviewUrls = [];

  for (let page = 1; page <= totalPages; page++) {
    const pageUrl = `${baseUrl}?fwp_paged=${page}`;
    console.log(`Crawling: ${pageUrl}`);

    try {
      const response = await axios.get(pageUrl);
      const $ = cheerio.load(response.data);

      // 페이지에서 리뷰 링크 추출 로직
      $('div.cell a').each((i, element) => {
        const reviewUrl = $(element).attr('href');
        // 유효한 리뷰 링크만 포함
        if (reviewUrl && reviewUrl.startsWith('https://vinepair.com/review/') && !reviewUrl.includes('#')) {
          allReviewUrls.push(reviewUrl);
        }
      });
    } catch (error) {
      console.error(`Error crawling page ${page}:`, error);
    }
  }

  return allReviewUrls;
};

// 베이스 URL과 최종 페이지 번호 설정
const baseUrl = 'https://vinepair.com/review/category/spirits';
const totalPages = 49; // 실제 페이지 수에 따라 조정

// 모든 카테고리 페이지를 순회하고 결과 저장
crawlCategoryPages(baseUrl, totalPages).then(allReviewUrls => {
  // 중복 제거 및 필터링
  const uniqueUrls = [...new Set(allReviewUrls)].filter(url => 
    !url.includes("https://vinepair.com/privacy-policy/#ccpa-notice") &&
    !url.includes("https://www.facebook.com/Vinepair/") &&
    !url.includes("https://twitter.com/Vinepair/") &&
    !url.includes("https://www.pinterest.com/vinepair/") &&
    !url.includes("https://www.instagram.com/Vinepair/")
  );

  fs.writeFile('review_urls.json', JSON.stringify(uniqueUrls, null, 2), (err) => {
    if (err) {
      console.error('Error writing review_urls.json', err);
    } else {
      console.log('Successfully wrote review_urls.json');
    }
  });
});
