import 'babel-polyfill';
import dotenv from 'dotenv';
import fs from 'fs';
import jsonexport from 'jsonexport';
import _ from 'lodash';
import puppeteer from 'puppeteer';
dotenv.config();

//execute program
(async () => {
    
    try {

        const launchOptions = {
            headless: false,
            // slowMo: 250,
            defaultViewport: null,
            args: ['--disable-device-discovery-notifications', '--disable-notifications'] //gets rid of the cloud print notification
        };

        let browser = await puppeteer.launch(launchOptions);
        let page = await browser.newPage();

        await page.goto('https://www.facebook.com/marketplace/nyc/property?minPrice=1100&maxPrice=1500', {
            waitUntil: ['domcontentloaded','load']
        });

        await page.type('#email', process.env.USERNAME);
        await page.type('#pass', process.env.PASSWORD);

        await Promise.all([
            page.waitForNavigation({
                waitUntil: ['domcontentloaded','load']
            }),
            page.click('#loginbutton')
        ]);
                
        await page.waitForSelector('[data-testid="marketplace_feed_item"]');
        await autoScroll(page);
        await page.waitFor(2000);
        
        const marketItems = await page.evaluate(()=>{
            let divs = Array.from(document.querySelectorAll('[data-testid="marketplace_feed_item"]'));
            return divs.reduce((arr, div)=>{
                
                const url = `https://www.facebook.com${div.getAttribute('href')}`;
                const price = div.querySelector('div>div:nth-child(1) > div > div').innerText;
                const rentalTypes = div.querySelector('div>div:nth-child(2) > div:first-child').innerText;
                let location = 'hidden';
                let time = '';
                let temporaryTextHolder = null;

                if(div.querySelector('[style="font-size: 12px;"]')){
                    temporaryTextHolder = div.querySelector('[style="font-size: 12px;"]').innerText.split(' · ');
                } else {
                    temporaryTextHolder = div.querySelector('section').innerText.replace(/(\r\n\t|\n|\r\t)/gm,' ').split(' · ');
                }

                if(temporaryTextHolder.length > 1){
                    location = temporaryTextHolder[0];
                    time = temporaryTextHolder[1];
                } else {
                    location = temporaryTextHolder.join(' ');
                }

                //filter it out
                if(!!!rentalTypes.match(/([2345678])\sbed/g)){
                    arr.push({
                        price,
                        rentalTypes,
                        location,
                        time,
                        url
                    });
                }

                return arr;
            }, []);
        });

        
        //make a copy of the original array
        // let newMarketData = marketItems.slice();
        
        for(let i = 0, totalItems = marketItems.length; i < totalItems; i++) {
            let pros = null;
            let cons = null;

            //go to the page to get more details
            await page.goto(marketItems[i].url, {
                awaitUntil: ['domcontentloaded','load']
            });

            try {
                //check if the more button exists
                await page.waitForSelector('[title="More"]');
                await page.click('[title="More"]');
            } catch(err){
                
            }

            let [description, sellerName] = await page.evaluate(()=>{
                let description = null;
                let sellerName = null;

                try {

                   description = document.querySelector('p._4etw').innerText;
                   sellerName = document.querySelector('div._3cgd > div').innerText;

                } catch(err){

                }

                return [description, sellerName];
            });

            try {
                pros = _.uniq(description.match(/(couples welcome|perfect for couples|heat and hot water included|heat included|laundry|electricity included|electric included|gas & electric|gas included|water included|close to subway|all utilities included|October 15th|October 31|Nov 1|November 1)/gi));
                cons = _.uniq(description.match(/(no couples|roommate|subletting|sublet|female only|bedroom for rent|room for rent|New Jersey|NJ|coop|co-op)/gi));
            } catch(err){

            }

    
            Object.assign(marketItems[i], {
                description,
                sellerName,
                pros: pros ? pros.join(', ') : '',
                cons: cons ? cons.join(', ') : ''
            });
        }
        
        console.log(JSON.stringify(marketItems, null, 3));
        //backup as json first
        fs.writeFileSync('rental.json', JSON.stringify(marketItems, null, 3));
        await new Promise((resolve)=>jsonexport(marketItems, (err, csv)=>{
            if(err) return console.log(err);
            fs.writeFileSync('rental.csv', csv, 'utf8');
            resolve();
        }));
        
        await browser.close();

    } catch (err) {
        console.log(err)
    }

})();

//This will deal with facebook long scroll
function autoScroll(page){
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        })
    });
}
