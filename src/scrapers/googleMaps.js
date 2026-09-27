import { PlaywrightCrawler, Dataset, log } from 'crawlee';
import { cleanText, extractLatLngFromUrl, parseRatingAndReviews, sleep, buildRecord } from '../utils.js';

const RESULTS_FEED_SELECTOR = 'div[role="feed"]';
const RESULT_CARD_SELECTOR = 'div[role="feed"] > div > div[role="article"]';

async function autoScrollResults(page, targetCount, log) {
    let previousCount = 0;
    let stagnantRounds = 0;

    while (stagnantRounds < 4) {
        const currentCount = await page.locator(RESULT_CARD_SELECTOR).count();
        if (currentCount >= targetCount) break;

        await page.evaluate((sel) => {
            const feed = document.querySelector(sel);
            if (feed) feed.scrollTop = feed.scrollHeight;
        }, RESULTS_FEED_SELECTOR);

        await sleep(1500);

        if (currentCount === previousCount) stagnantRounds += 1;
        else stagnantRounds = 0;
        previousCount = currentCount;
        log.debug(`Google Maps: scrolled, ${currentCount} cards loaded so far`);
    }
}

async function extractCardSummaries(page) {
    return page.locator(RESULT_CARD_SELECTOR).evaluateAll((cards) =>
        cards.map((card) => {
            const linkEl = card.querySelector('a[href*="/maps/place/"]');
            const nameEl = card.querySelector('a[href*="/maps/place/"] > div, [role="heading"]');
            const ratingText = card.querySelector('span[role="img"]')?.getAttribute('aria-label') || null;
            return {
                url: linkEl ? linkEl.href : null,
                title: nameEl ? nameEl.textContent : linkEl?.getAttribute('aria-label') || null,
                ratingAriaLabel: ratingText,
            };
        }),
    );
}

async function extractDetailPanel(page) {
    await page.waitForTimeout(1200);
    return page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || null;
        const getAttr = (selector, attr) => document.querySelector(selector)?.getAttribute(attr) || null;
        return {
            title: getText('h1'),
            category: getText('button[jsaction*="category"]'),
            address: getAttr('button[data-item-id="address"]', 'aria-label'),
            phone: getAttr('button[data-item-id^="phone:tel:"]', 'aria-label'),
            website: getAttr('a[data-item-id="authority"]', 'href'),
            ratingAria: getAttr('div[jsaction*="reviewChart"] span[role="img"]', 'aria-label')
                || getAttr('span[role="img"]', 'aria-label'),
            hoursButton: getAttr('button[data-item-id="oh"]', 'aria-label'),
        };
    });
}

export async function scrapeGoogleMaps({ searchQueries, maxResultsPerQuery, scrapeDetails, language, proxyConfiguration, maxConcurrency }) {
    const requests = searchQueries.map((query) => ({
        url: `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=${encodeURIComponent(language || 'en')}`,
        userData: { searchQuery: query },
    }));

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxConcurrency,
        requestHandlerTimeoutSecs: 180,
        navigationTimeoutSecs: 60,
        async requestHandler({ page, request, log }) {
            const { searchQuery } = request.userData;
            log.info(`Google Maps: searching "${searchQuery}"`);

            await page.waitForSelector(RESULTS_FEED_SELECTOR, { timeout: 20000 }).catch(() => {
                log.warning(`Google Maps: no results feed found for "${searchQuery}".`);
            });

            await autoScrollResults(page, maxResultsPerQuery, log);
            const summaries = (await extractCardSummaries(page)).slice(0, maxResultsPerQuery);
            log.info(`Google Maps: found ${summaries.length} listings for "${searchQuery}"`);

            for (const summary of summaries) {
                if (!summary.url) continue;
                let record;

                if (scrapeDetails) {
                    const detailPage = await page.context().newPage();
                    try {
                        await detailPage.goto(summary.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                        const details = await extractDetailPanel(detailPage);
                        const { latitude, longitude } = extractLatLngFromUrl(detailPage.url());
                        const { rating, reviewsCount } = parseRatingAndReviews(
                            details.ratingAria?.match(/[\d.]+/)?.[0],
                            details.ratingAria?.match(/([\d,]+)\s*review/i)?.[1],
                        );
                        record = buildRecord({
                            provider: 'google', searchQuery,
                            title: details.title || summary.title,
                            category: details.category, address: details.address,
                            phone: details.phone, website: details.website,
                            rating, reviewsCount, latitude, longitude,
                            hours: details.hoursButton, mapUrl: summary.url,
                        });
                    } catch (err) {
                        log.warning(`Google Maps: failed to open detail page for "${summary.title}": ${err.message}`);
                        record = buildRecord({ provider: 'google', searchQuery, title: summary.title, mapUrl: summary.url });
                    } finally {
                        await detailPage.close();
                    }
                } else {
                    const { latitude, longitude } = extractLatLngFromUrl(summary.url);
                    const { rating, reviewsCount } = parseRatingAndReviews(
                        summary.ratingAriaLabel?.match(/[\d.]+/)?.[0],
                        summary.ratingAriaLabel?.match(/([\d,]+)\s*review/i)?.[1],
                    );
                    record = buildRecord({
                        provider: 'google', searchQuery, title: summary.title,
                        rating, reviewsCount, latitude, longitude, mapUrl: summary.url,
                    });
                }
                await Dataset.pushData(record);
            }
        },
        async failedRequestHandler({ request }, error) {
            log.error(`Google Maps: request ${request.url} failed: ${error.message}`);
        },
    });

    await crawler.run(requests);
}
