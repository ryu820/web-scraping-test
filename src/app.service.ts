import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
// import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import { S3 } from 'aws-sdk';
import { async } from 'rxjs';

@Injectable()
export class AppService {
  private s3: S3;
  constructor() {
    // AWS 인증 정보 설정
    this.s3 = new S3({
      accessKeyId: '',
      secretAccessKey: '',
      region: null, // AWS S3 버킷이 위치한 리전
    });
  }
  getHello(): string {
    return 'Hello World!';
  }

  async getDataViaPuppeteer() {
    const URL =
      'https://search.shopping.naver.com/best/home?categoryCategoryId=ALL&categoryDemo=F03&categoryRootCategoryId=ALL&chartDemo=A00&chartRank=1&period=P1D&windowCategoryId=20000060&windowDemo=F03&windowRootCategoryId=20000060';
    //브라우저 인스턴스를 생성
    const browser = await puppeteer.launch({
      headless: 'new', //브라우저를 헤드리스(headless) 모드로 실행하지 않고 실제 브라우저 창을 표시
    });
    const page = await browser.newPage(); //새 페이지를 생성
    //해당 URL로 이동
    await page.goto(URL, {
      waitUntil: 'networkidle2', //네트워크 활동이 없을 때까지 페이지 로딩을 기다리도록 설정
    });
    //페이지 내에서 JavaScript 코드를 실행
    const results = await page.evaluate(() => {
      const propertyList = [];

      document
        .querySelectorAll('.imageProduct_item__KZB_F')
        .forEach(async (z) => {
          const tempImgList = [];
          //이미지뽑아오기
          z.querySelectorAll('.imageProduct_thumbnail__Szi5F').forEach(
            async (x) => {
              const imgElement = x.querySelector('span img');
              if (imgElement instanceof HTMLImageElement && imgElement.src) {
                const img = imgElement.src;
                const data = img.split(',')[1];
                // const fileData = Buffer.from(data, 'base64');
                tempImgList.push(data);
              }
            },
          );
          // const bucketName = 'giftwave-s3-bucket';

          // const uuid = uuidv4();
          // const uploadParams = {
          //   Bucket: bucketName,
          //   Key: `${uuid}`,
          //   Body: tempImgList[0],
          // };
          // const uploadResult = await this.s3.upload(uploadParams).promise();
          //랭크뽑아오기
          const element = z
            .querySelector('.imageProduct_rank__lEppJ')
            .textContent.trim();
          const data = {
            rank: element,
            title: z.querySelector('.imageProduct_title__Wdeb1')?.textContent,
            price: z.querySelector('.imageProduct_price__W6pU1 > strong')
              ?.textContent,
            img: tempImgList[0],
          };

          propertyList.push(data);
        });

      return propertyList;
    });

    console.log('getDataViaPuppeteer results :', results);
    //브라우저 인스턴스를 닫아
    await browser.close();
    const resultlist = results.splice(0, 10);
    console.log(resultlist);
    const lastlist = await Promise.all(
      resultlist.map(async (item) => {
        const fileData = Buffer.from(item.img, 'base64');
        const bucketName = 'giftwave-s3-bucket';

        const uuid = uuidv4();
        const uploadParams = {
          Bucket: bucketName,
          Key: `${uuid}`,
          Body: fileData,
        };
        const uploadResult = await this.s3.upload(uploadParams).promise();
        return {
          rank: item.rank,
          title: item.title,
          price: item.price,
          img: uploadResult.Location,
        };
      }),
    );
    console.log(lastlist);
    return lastlist;
  }
}
