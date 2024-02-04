console.log('start..wait plz..!')
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const headers = [
  "path",
  "titleText",
  "Category",
  "Distillery",
  "Bottler",
  "Bottling serie",
  "Stated Age",
  "Casktype",
  "Strength",
  "Size",
  "Label",
  "Image URL",
  "TASTINGTAGS"
];

// 증류소 URL 모음
const firstUrls = require('./distiller_list.json');

// 증류소 URL에서 위스키 URL 목록을 크롤링하는 함수
const crawlDistillerPage = (url) => {
  return axios.get(url)
    .then(response => {
      const $ = cheerio.load(response.data);
      const whiskyData = [];

      $('tbody tr').each((i, tr) => {
        const sizeTd = $(tr).find('td').eq(5).text();
        const removeMl = sizeTd.replace('ml', '').trim();

        // 크기가 500ml 이상일 때만 href 추출
        if (parseInt(removeMl, 10) >= 500) {
          const href = $(tr).find('td.name a.clickable').attr('href');
          if (href) {
            // breadcrumb 텍스트 추출
            const breadcrumbText = $('ul.breadcrumb').text().trim().replace(/\s+/g, ' ').replace(/ /g, '/');
            whiskyData.push({ href, breadcrumb: breadcrumbText });
          }
        }
      });
      
      console.log('plz more wating..')
      return whiskyData;
    })
    .catch(error => {
      console.error(error);
    });
};

const distillerPromises = firstUrls.map(url => crawlDistillerPage(url));

Promise.all(distillerPromises).then(whiskyData => {
  fs.writeFile('whisky_list.json', JSON.stringify(whiskyData.flat(), null, 2), (err) => {
    if (err) {
      console.error('Error writing whisky_list.json', err);
    } else {
      console.log('Success writing whisky_list.json');
      afterFirstCrawling();
    }
  });
}).catch(error => {
  console.error('Error catch:', error);
});

function afterFirstCrawling() {
  const whiskyList = require('./whisky_list.json');

  const crawlPage = (whisky) => {
    return axios.get(whisky.href)
      .then(response => {
        const $ = cheerio.load(response.data);
        const dlData = {};

        const parts = whisky.href.split('/');
        const lastPart = parts[parts.length - 1];
        dlData['titleText'] = lastPart;

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

        return dlData;
      })
      .catch(error => {
        console.error(error);
      });
  };

  const crawlPromises = whiskyList.map(whisky => crawlPage(whisky));

  Promise.all(crawlPromises).then(allData => {
    const validData = allData.filter(dlData => dlData && typeof dlData === 'object');

    const csvData = validData.map(dlData => {
      return headers.map(header => {
        return `"${dlData[header] || ''}"`;
      }).join(',');
    });

    const finalCsv = [headers.join(',')].concat(csvData).join('\n');

    fs.writeFile('whisky_info.csv', finalCsv, (err) => {
      if (err) {
        console.error('Error writing whisky_info.csv', err);
      } else {
        console.log('Successfully wrote whisky_info.csv');
      }
    });
  }).catch(error => {
    console.error('Error in second crawling:', error);
  });
}
