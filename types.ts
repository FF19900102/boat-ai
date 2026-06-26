:root {
  --bg: #f5f7fb;
  --card: #ffffff;
  --ink: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --blue: #2563eb;
  --green: #16a34a;
  --red: #dc2626;
  --yellow: #ca8a04;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
button, input, select { font: inherit; }
.page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.header { display:flex; justify-content:space-between; gap:16px; align-items:center; margin-bottom:20px; }
.logo { font-size:28px; font-weight:800; }
.sub { color:var(--muted); font-size:14px; margin-top:4px; }
.grid { display:grid; gap:16px; }
.grid2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; box-shadow:0 4px 16px rgba(15,23,42,.05); }
.title { font-weight:700; font-size:18px; margin-bottom:12px; }
.small { font-size:12px; color:var(--muted); }
.btn { border:0; border-radius:12px; padding:10px 14px; background:var(--blue); color:white; font-weight:700; cursor:pointer; }
.btn.secondary { background:#e2e8f0; color:#0f172a; }
.btn.green { background:var(--green); }
.btn.red { background:var(--red); }
.row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.venue { border:1px solid var(--line); border-radius:12px; padding:12px; cursor:pointer; background:#fff; }
.venue.active { outline:3px solid rgba(37,99,235,.25); border-color:var(--blue); }
.raceButton { border:1px solid var(--line); background:#fff; border-radius:12px; padding:10px; cursor:pointer; }
.raceButton.active { background:var(--blue); color:#fff; border-color:var(--blue); }
.tableWrap { overflow:auto; }
table { width:100%; border-collapse: collapse; font-size:14px; }
th, td { border-bottom:1px solid var(--line); padding:8px; text-align:left; white-space:nowrap; }
th { color:var(--muted); font-size:12px; font-weight:700; }
input, select { width:100%; border:1px solid var(--line); border-radius:10px; padding:8px; background:white; }
.badge { border-radius:999px; padding:4px 8px; font-size:12px; font-weight:700; display:inline-block; }
.buy { background:#dcfce7; color:#166534; }
.watch { background:#fef9c3; color:#854d0e; }
.skip { background:#fee2e2; color:#991b1b; }
.kpi { font-size:24px; font-weight:800; }
@media (max-width: 800px) { .grid2,.grid3{grid-template-columns:1fr;} .page{padding:14px;} }
