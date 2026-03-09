const { ipcMain } = require('electron');
const pageParser = require('../services/pageParser');

function registerParserIpc() {
  ipcMain.handle('parser:parsePage', async (_, url, viewport) => {
    if (!url || typeof url !== 'string') throw new Error('URL is required');
    const elements = await pageParser.parsePage(url, viewport || null);
    return elements;
  });
}

module.exports = registerParserIpc;
