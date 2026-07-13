const { initDatabase, saveRaceData } = require('../database/db');

function normalizeRaceList(body) {
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body?.races)) {
    return body.races;
  }
  if (body?.race && typeof body.race === 'object') {
    return [body.race];
  }
  return [];
}

module.exports = function registerImportRaceDataApi(app) {
  const handleImportRaceData = async (req, res) => {
    try {
      await initDatabase();
      const races = normalizeRaceList(req.body);

      if (!races.length) {
        return res.status(400).json({
          success: false,
          error: 'race data is required (race or races)'
        });
      }

      let inserted = 0;
      let updated = 0;
      const details = [];

      for (const race of races) {
        const result = await saveRaceData(race);
        if (result.action === 'inserted') {
          inserted += 1;
        } else {
          updated += 1;
        }
        details.push(result);
      }

      return res.json({
        success: true,
        imported: inserted,
        updated,
        total: races.length,
        details
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || 'importRaceData failed'
      });
    }
  };

  app.post('/api/importRaceData', handleImportRaceData);
  app.post('/api/database/importRaceData', handleImportRaceData);
};
