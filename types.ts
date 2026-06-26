:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin:0; font-family: Arial, 'Hiragino Sans', 'Yu Gothic', sans-serif; background:#f4f6fb; color:#14213d; }
button, input, select { font: inherit; }
.container { max-width:1180px; margin:0 auto; padding:24px; }
.header { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:20px; }
.brand { font-size:30px; font-weight:900; letter-spacing:-.04em; }
.badge { display:inline-flex; padding:6px 10px; background:#e8f0ff; color:#174ea6; border-radius:999px; font-size:12px; font-weight:700; }
.grid { display:grid; gap:16px; }
.grid2 { grid-template-columns:repeat(2, minmax(0, 1fr)); }
.grid3 { grid-template-columns:repeat(3, minmax(0, 1fr)); }
.card { background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:18px; box-shadow:0 8px 24px rgba(20,33,61,.05); }
.title { font-size:18px; font-weight:800; margin:0 0 12px; }
.sub { color:#64748b; font-size:13px; }
.venues { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px; }
.venue { border:1px solid #dbe3ef; background:#fff; border-radius:14px; padding:12px; cursor:pointer; text-align:left; }
.venue.active { border-color:#2563eb; background:#eff6ff; }
.races { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
.race { border:1px solid #dbe3ef; background:#fff; border-radius:12px; padding:10px; cursor:pointer; }
.race.active { border-color:#0f766e; background:#ecfdf5; }
.tableWrap { overflow:auto; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th, td { padding:9px 8px; border-bottom:1px solid #e5e7eb; text-align:left; white-space:nowrap; }
th { color:#64748b; font-size:12px; }
input, select { width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:8px; background:#fff; }
.btn { border:0; border-radius:12px; padding:10px 14px; background:#1d4ed8; color:#fff; cursor:pointer; font-weight:800; }
.btn.secondary { background:#0f766e; }
.btn.gray { background:#475569; }
.metric { display:flex; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px dashed #e5e7eb; }
.metric b { font-size:18px; }
.buy { color:#dc2626; font-weight:900; }
.warn { color:#ca8a04; font-weight:900; }
.skip { color:#64748b; font-weight:900; }
.footer { margin-top:22px; color:#64748b; font-size:12px; }
@media (max-width: 820px) { .grid2,.grid3 { grid-template-columns:1fr; } .races { grid-template-columns:repeat(4,1fr); } .container { padding:14px; } }
