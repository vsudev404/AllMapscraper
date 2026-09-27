import { Actor } from 'apify';
import { log } from 'crawlee';
import { scrapeGoogleMaps } from './scrapers/googleMaps.js';
import { scrapeBingMaps } from './scrapers/bingMaps.js';

await Actor.init();

try {
    const input = await Actor.getInput();

    if (!input || !Array.isArray(input.searchQueries) || input.searchQueries.length === 0) {
        throw new Error('Input is missing "searchQueries" (array of strings). Provide at least one search query.');
    }

    const {
        provider = 'google',
        searchQueries,
        maxResultsPerQuery = 60,
        scrapeDetails = true,
        language = 'en',
        proxyConfiguration: proxyInput,
        maxConcurrency = 2,
    } = input;

    const proxyConfiguration = await Actor.createProxyConfiguration(
        proxyInput || { groups: ['RESIDENTIAL'] },
    );

    const runOptions = {
        searchQueries,
        maxResultsPerQuery,
        scrapeDetails,
        language,
        proxyConfiguration,
        maxConcurrency,
    };

    const jobs = [];
    if (provider === 'google' || provider === 'both') {
        log.info('Starting Google Maps scrape...');
        jobs.push(scrapeGoogleMaps(runOptions));
    }
    if (provider === 'bing' || provider === 'both') {
        log.info('Starting Bing Maps scrape...');
        jobs.push(scrapeBingMaps(runOptions));
    }

    if (jobs.length === 0) {
        throw new Error(`Unknown provider "${provider}". Use "google", "bing" or "both".`);
    }

    for (const job of jobs) {
        await job;
    }

    log.info('All Maps Data Scraper finished successfully.');
} catch (error) {
    log.error(`Actor failed: ${error.message}`);
    throw error;
} finally {
    await Actor.exit();
}
