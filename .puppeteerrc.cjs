const {join} = require('path');

// If we're running on Vercel, the cache directory is at /vercel/.cache/puppeteer
// Otherwise, it's at ~/.cache/puppeteer
const cacheDirectory = process.env.VERCEL
  ? join('/vercel', '.cache', 'puppeteer')
  : join(process.env.HOME, '.cache', 'puppeteer');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer.
  cacheDirectory,
};