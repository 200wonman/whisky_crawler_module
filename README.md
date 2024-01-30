## **What to crawling?**

프로젝트에 사용할 위스키 정보를 해외의 위스키 전문 판매 사이트에서 
데이터를 크롤링 하기위한 모듈.

## How to use

1. 크롤링 사이트 : [https://www.whiskybase.com](https://www.whiskybase.com/whiskies/whisky/174056/yamazaki-10-year-old)
2. 위스키 상세페이의 URL을 “whisky_url_input.json” 파일에 넣는다.
ex) "[https://www.whiskybase.com/whiskies/whisky/174056/yamazaki-10-year-old](https://www.whiskybase.com/whiskies/whisky/174056/yamazaki-10-year-old)"
3. 상세 페이지에 아래 표의 *항목은 반드시 데이터가 있어야한다. 
- 동일한 상품이 여러개 노출되어있으며, 페이지마다 정보가 상이할 수 있다.
    
    
    | *Category | 싱글몰트, 버번,블랜디드 등 |
    | --- | --- |
    | *Distillery | 증류소 |
    | *Bottler | 증류소 보틀링, 독립병인지 |
    | Bottling serie | ? |
    | *Stated Age | 숙성년수 |
    | *Casktype | 숙성 캐스크 타입(없는 경우도 많음-업장비밀) |
    | *Strength | 알콜도수 |
    | *Size | 용량 (보통 버번은 750, 스카치는 700) |
    | Label | ? ... 라벨 제작..?뭐 몰겠네(뭔지 모르겠는데 없는 경우가 많은듯) |
    | *img | 보틀 이미지 |
    | Market | 필요없음 |
    | Add on | 필요없음 |
4. 터미널에서 “node crawler.js” 명령어를 입력한다.
5. 터미널에 “success url_output.csv”라는 문구가 보이면 크롤링 완료
6. “whisky_url_output.csv” 파일에 크롤링 된 데이터가 저장되어있다.
