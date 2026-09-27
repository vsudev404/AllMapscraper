# Apify base image that already has Node.js, Playwright and Chromium installed
FROM apify/actor-node-playwright-chrome:20 AS base

COPY --chown=myuser package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional \
    && echo "Installed npm packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version

COPY --chown=myuser . ./

CMD ["npm", "start", "--silent"]
