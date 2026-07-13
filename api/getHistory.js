const { initDatabase, getHistory, getDatabaseStatus } = require('../database/db');

module.exports = function registerGetHistoryApi(app) {
  app.get('/api/getHistory', async (req, res) => {
    try {
      await initDatabase();
      const history = await getHistory({
        venueId: req.query?.venueId,
        dateFrom: req.query?.dateFrom,
        dateTo: req.query?.dateTo,
        limit: req.query?.limit,
        offset: req.query?.offset
      });

      return res.json({
        success: true,
        ...history
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'getHistory failed'
      });
    }
  });

  app.get('/api/database/status-v1', async (req, res) => {
    try {
      await initDatabase();
      const status = await getDatabaseStatus();
      return res.json({
        success: true,
        ...status
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'database status failed'
      });
    }
  });
};
