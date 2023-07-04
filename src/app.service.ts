import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getDataViaPuppeteer() {
    const URL =
      'https://search.shopping.naver.com/best/home?categoryCategoryId=ALL&categoryDemo=F03&categoryRootCategoryId=ALL&chartDemo=A00&chartRank=1&period=P1D&windowCategoryId=20000060&windowDemo=F03&windowRootCategoryId=20000060';
    //브라우저 인스턴스를 생성
    const browser = await puppeteer.launch({
      headless: false, //브라우저를 헤드리스(headless) 모드로 실행하지 않고 실제 브라우저 창을 표시
    });
    const page = await browser.newPage(); //새 페이지를 생성
    //해당 URL로 이동
    await page.goto(URL, {
      waitUntil: 'networkidle2', //네트워크 활동이 없을 때까지 페이지 로딩을 기다리도록 설정
    });
    //페이지 내에서 JavaScript 코드를 실행
    const results = await page.evaluate(() => {
      const propertyList = [];

      document.querySelectorAll('.imageProduct_item__KZB_F').forEach((z) => {
        const tempImgList = [];

        z.querySelectorAll('.imageProduct_thumbnail__Szi5F').forEach((x) => {
          const imgElement = x.querySelector('span img');
          if (imgElement instanceof HTMLImageElement && imgElement.src) {
            tempImgList.push(imgElement.src);
          }
        });
        const element = z
          .querySelector('.imageProduct_rank__lEppJ')
          .textContent.trim();
        const data = {
          rank: element,
          title: z.querySelector('.imageProduct_title__Wdeb1')?.textContent,
          price: z.querySelector('.imageProduct_price__W6pU1 > strong')
            ?.textContent,
          img: tempImgList,
        };

        propertyList.push(data);
      });

      return propertyList;
    });

    console.log('getDataViaPuppeteer results :', results);
    //브라우저 인스턴스를 닫아
    await browser.close();
    return results;
  }
}
