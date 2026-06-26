:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #f5f7fb; color: #111827; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
button, input, select { font: inherit; }
.container { max-width: 1180px; margin: 0 auto; padding: 24px; }
.header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; }
.logo { font-size: 28px; font-weight: 800; letter-spacing:-0.04em; }
.muted { color:#6b7280; font-size:14px; }
.grid { display:grid; gap:14px; }
.venue-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.race-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.card { background:white; border:1px solid #e5e7eb; border-radius:18px; padding:16px; box-shadow:0 6px 20px rgba(15,23,42,.05); }
.btn { border:0; border-radius:14px; padding:12px 14px; cursor:pointer; background:#111827; color:white; font-weight:700; }
.btn.secondary { background:#e5e7eb; color:#111827; }
.btn.active { background:#0b63ce; }
.btn.danger { background:#b91c1c; }
.row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.section-title { font-size:20px; font-weight:800; margin:26px 0 12px; }
.table-wrap { overflow:auto; border-radius:18px; border:1px solid #e5e7eb; background:white; }
table { width:100%; border-collapse:collapse; min-width:850px; }
th, td { padding:10px 9px; border-bottom:1px solid #edf0f4; text-align:left; font-size:14px; }
th { background:#f9fafb; color:#374151; font-weight:800; }
input, select { width:100%; padding:9px; border:1px solid #d1d5db; border-radius:10px; background:white; }
.kpi { display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px; }
.kpi .card strong { display:block; font-size:24px; margin-top:6px; }
.badge { display:inline-flex; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:800; background:#e5e7eb; }
.badge.buy { background:#dcfce7; color:#166534; }
.badge.warn { background:#fef3c7; color:#92400e; }
.badge.skip { background:#fee2e2; color:#991b1b; }
.two { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
@media (max-width: 800px) { .two { grid-template-columns:1fr; } .race-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .container { padding:14px; } }
