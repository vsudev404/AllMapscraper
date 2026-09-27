import { PlaywrightCrawler, Dataset, log } from 'crawlee';
import { parseRatingAndReviews, sleep, buildRecord } from '../utils.js';

const RESULT_LIST_SELECTOR = '#b_content #b_results, .listContainer, #local_results';
const RESULT_CARD_SELECTOR = '.overlay-taskpane-entity, .entity-item, li.b_algo, div.listCard';

async function autoScroll(page, targetCount) {
    let previousCount = 0;
    let stagnantRounds = 0;

    while (stagnantRounds < 4) {
        const currentCount = await page.locator(RESULT_CARD_SELECTOR).count();
        if (currentCount >= targetCount) break;

        await page.evaluate(() => {
            const container = document.querySelector('.listContainer, #local_results, #b_results');
            if (container) container.scrollTop = container.scrollHeight;
            window.scrollTo(0, document.body.scrollHeight);
        });

        await sleep(1200);
        if (currentCount === previousCount) stagnantRounds += 1;
        else stagnantRounds = 0;
        previousCount = currentCount;
    }
}

async function extractCards(page) {
    return page.evaluate((cardSelector) => {
        return Array.from(document.querySelectorAll(cardSelector)).map((card) => {
            const title = card.querySelector('.b_entityTitle, .listTitle, h2, .name')?.textContent?.trim() || null;
            const address = card.querySelector('.b_address, .address, .listAddress')?.textContent?.trim() || null;
            const phone = card.querySelector('.b_phone, .phone, .listPhone')?.textContent?.trim() || null;
            const category = card.querySelector('.b_category, .category')?.textContent?.trim() || null;
            const ratingText = card.querySelector('.b_rating, .rating, .csrc')?.textContent?.trim() || null;
            const website = card.querySelector('a.website, a[href^="http"]:not([href*="bing.com"])')?.href || null;
            const lat = card.getAttribute('data-lat') || card.dataset?.lat || null;
            const lon = card.getAttribute('data-lon') || card.dataset?.lon || null;
            return { title, address, phone, category, ratingText, website, lat, lon };
        });
    }, RESULT_CARD_SELECTOR);
}

export async function scrapeBingMaps({ searchQueries, maxResultsPerQuery, language, proxyConfiguration, maxConcurrency }) {
    const requests = searchQueries.map((query) => ({
        url: `https://www.bing.com/maps?q=${encodeURIComponent(query)}&setlang=${encodeURIComponent(language || 'en')}`,
        userData: { searchQuery: query },
    }));

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxConcurrency,
        requestHandlerTimeoutSecs: 150,
        navigationTimeoutSecs: 60,
        async requestHandler({ page, request, log }) {
            const { searchQuery } = request.userData;
            log.info(`Bing Maps: searching "${searchQuery}"`);

            await page.waitForSelector(RESULT_LIST_SELECTOR, { timeout: 20000 }).catch(() => {
                log.warning(`Bing Maps: no results panel found for "${searchQuery}".`);
            });

            await autoScroll(page, maxResultsPerQuery);
            const cards = (await extractCards(page)).slice(0, maxResultsPerQuery);
            log.info(`Bing Maps: found ${cards.length} listings for "${searchQuery}"`);

            for (const card of cards) {
                if (!card.title) continue;
                const { rating, reviewsCount } = parseRatingAndReviews(
                    card.ratingText?.match(/[\d.]+/)?.[0],
                    card.ratingText?.match(/([\d,]+)\s*review/i)?.[1],
                );

                await Dataset.pushData(buildRecord({
                    provider: 'bing', searchQuery,
                    title: card.title, category: card.category,
                    address: card.address, phone: card.phone,
                    website: card.website, rating, reviewsCount,
                    latitude: card.lat ? Number(card.lat) : null,
                    longitude: card.lon ? Number(card.lon) : null,
                    mapUrl: page.url(),
                }));
            }
        },
        async failedRequestHandler({ request }, error) {
            log.error(`Bing Maps: request ${request.url} failed: ${error.message}`);
        },
    });

    await crawler.run(requests);
}
