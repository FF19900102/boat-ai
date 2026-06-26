:root {
  --bg: #f5f7fb;
  --card: #ffffff;
  --ink: #101828;
  --muted: #667085;
  --line: #e4e7ec;
  --blue: #2563eb;
  --green: #16a34a;
  --red: #dc2626;
  --amber: #d97706;
  --dark: #0f172a;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
a { color: inherit; text-decoration: none; }
button, input, select { font: inherit; }
.app-shell { width: min(1180px, calc(100% - 28px)); margin: 0 auto; padding: 22px 0 48px; }
.header { background: var(--dark); color: white; position: sticky; top: 0; z-index: 10; }
.header-inner { width: min(1180px, calc(100% - 28px)); margin: 0 auto; display:flex; align-items:center; justify-content:space-between; padding: 14px 0; gap: 12px; }
.logo { font-weight: 800; letter-spacing: .04em; font-size: 20px; }
.nav { display:flex; gap: 8px; flex-wrap:wrap; }
.nav a { padding: 8px 11px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; color: #dbeafe; font-size: 13px; }
.hero { display:grid; grid-template-columns: 1.4fr .8fr; gap: 18px; align-items: stretch; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 8px 24px rgba(15,23,42,.05); }
.title { font-size: clamp(26px, 4vw, 42px); line-height: 1.08; margin: 0 0 12px; }
.sub { color: var(--muted); line-height: 1.7; margin: 0; }
.grid { display:grid; gap: 14px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.section-title { display:flex; justify-content:space-between; align-items:end; gap: 12px; margin: 26px 0 12px; }
.section-title h2 { margin:0; font-size: 22px; }
.badge { display:inline-flex; align-items:center; gap: 6px; padding: 5px 9px; border-radius: 999px; background:#eef4ff; color:#1d4ed8; font-size:12px; font-weight:700; }
.btn { display:inline-flex; justify-content:center; align-items:center; gap: 8px; border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 700; cursor:pointer; background: var(--blue); color:white; }
.btn.subtle { background:#eef2ff; color:#1e40af; }
.btn.dark { background: var(--dark); color:white; }
.venue { display:flex; justify-content:space-between; gap:12px; align-items:center; }
.venue-name { font-weight:800; font-size:18px; }
.venue-meta { color: var(--muted); font-size: 13px; margin-top: 5px; }
.race-grid { display:grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
.race-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px; text-align:center; transition:.12s ease; }
.race-card:hover { transform: translateY(-2px); border-color:#93c5fd; }
.race-card strong { display:block; font-size:20px; }
.table-wrap { overflow:auto; border: 1px solid var(--line); border-radius: 14px; background:white; }
table { border-collapse: collapse; width: 100%; min-width: 860px; }
th, td { border-bottom:1px solid var(--line); padding: 10px 12px; text-align:left; white-space:nowrap; }
th { background:#f8fafc; font-size: 12px; color: var(--muted); }
.boat-no { display:inline-grid; place-items:center; width:30px; height:30px; border-radius:9px; font-weight:900; border:1px solid #d0d5dd; }
.boat-1 { background:#fff; color:#111; } .boat-2 { background:#111827; color:white; } .boat-3 { background:#ef4444; color:white; } .boat-4 { background:#2563eb; color:white; } .boat-5 { background:#facc15; color:#111; } .boat-6 { background:#16a34a; color:white; }
.kpi { display:flex; flex-direction:column; gap:6px; }
.kpi span { color: var(--muted); font-size:12px; }
.kpi strong { font-size:24px; }
.rank { display:flex; justify-content:space-between; align-items:center; gap: 12px; border-bottom:1px solid var(--line); padding: 10px 0; }
.rank:last-child { border-bottom:0; }
.form-row { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.field label { display:block; color:var(--muted); font-size:12px; margin-bottom:5px; }
.field input, .field select { width:100%; border:1px solid var(--line); border-radius:10px; padding:9px 10px; background:white; }
.alert { border-radius:14px; padding:14px; border:1px solid #fed7aa; background:#fff7ed; color:#9a3412; }
.good { color: var(--green); } .bad { color: var(--red); } .warn { color: var(--amber); }
@media (max-width: 820px) { .hero,.grid-2,.grid-3,.grid-4 { grid-template-columns:1fr; } .race-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } .form-row { grid-template-columns:1fr; } }
