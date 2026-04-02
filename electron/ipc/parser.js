const { ipcMain } = require('electron');
const pageParser = require('../services/pageParser');
const { assertHttpsWebUrl } = require('../utils/requireHttpsUrl');

function registerParserIpc() {
  ipcMain.handle('parser:parsePage', async (_, url, viewport) => {
    if (!url || typeof url !== 'string') throw new Error('URL is required');
    assertHttpsWebUrl(url, { allowEmpty: false, fieldName: 'Page URL' });
    const elements = await pageParser.parsePage(url, viewport || null);
    return elements;
  });
}

module.exports = registerParserIpc;
