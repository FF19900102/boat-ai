const { initDatabase, getRace } = require('../database/db');

module.exports = function registerGetRaceApi(app) {
  app.get('/api/getRace', async (req, res) => {
    try {
      await initDatabase();

      const filters = {
        id: req.query?.id,
        raceKey: req.query?.raceKey,
        venueId: req.query?.venueId,
        raceNo: req.query?.raceNo,
        date: req.query?.date
      };

      const hasLookup = Boolean(
        String(filters.id || '').trim() ||
          String(filters.raceKey || '').trim() ||
          (String(filters.venueId || '').trim() && String(filters.raceNo || '').trim())
      );

      if (!hasLookup) {
        return res.status(400).json({
          success: false,
          error: 'specify id, raceKey, or date+venueId+raceNo'
        });
      }

      const race = await getRace(filters);
      if (!race) {
        return res.status(404).json({
          success: false,
          error: 'race not found'
        });
      }

      return res.json({
        success: true,
        race
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'getRace failed'
      });
    }
  });
};
