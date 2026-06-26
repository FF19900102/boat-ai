:root {
  --bg: #07111f;
  --panel: #0e1d33;
  --panel2: #102846;
  --line: rgba(255,255,255,.1);
  --text: #f8fbff;
  --muted: #93a4bb;
  --accent: #3aa5ff;
  --good: #33d17a;
  --warn: #f6c445;
  --bad: #ff6b6b;
}
* { box-sizing: border-box; }
body { margin: 0; background: linear-gradient(180deg, #05101d, #08192e); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
button, input, select { font: inherit; }
.container { max-width: 1220px; margin: 0 auto; padding: 24px; }
.header { display:flex; align-items:center; justify-content:space-between; gap: 16px; padding: 18px 24px; border-bottom: 1px solid var(--line); position: sticky; top: 0; background: rgba(7,17,31,.9); backdrop-filter: blur(12px); z-index: 10; }
.logo { font-weight: 900; letter-spacing: .04em; font-size: 22px; }
.sub { color: var(--muted); font-size: 13px; }
.grid { display:grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.card { background: rgba(14,29,51,.86); border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 12px 30px rgba(0,0,0,.18); }
.card h2, .card h3 { margin: 0 0 12px; }
.badge { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:999px; padding: 5px 10px; color: var(--muted); font-size:12px; gap:6px; }
.btn { border: 0; border-radius: 12px; padding: 10px 14px; background: var(--accent); color: #00172b; font-weight: 800; cursor:pointer; }
.btn.secondary { background: #18314f; color: var(--text); border: 1px solid var(--line); }
.venue { cursor:pointer; transition:.15s; }
.venue:hover, .venue.active { transform: translateY(-2px); border-color: rgba(58,165,255,.7); background: rgba(16,40,70,.92); }
.race-button { border:1px solid var(--line); background:#10233d; color:var(--text); border-radius:14px; padding:12px; cursor:pointer; font-weight:800; }
.race-button.active { border-color: var(--accent); background:#153b67; }
.table-wrap { overflow:auto; }
table { width:100%; border-collapse: collapse; min-width: 760px; }
th, td { border-bottom:1px solid var(--line); padding:10px; text-align:left; font-size:14px; }
th { color: var(--muted); font-size:12px; }
input, select { width:100%; background:#08172a; border:1px solid var(--line); color:var(--text); border-radius:10px; padding:8px; }
.kpi { display:flex; flex-direction:column; gap:6px; }
.kpi strong { font-size: 26px; }
.good { color: var(--good); } .warn { color: var(--warn); } .bad { color: var(--bad); }
.tabs { display:flex; gap:8px; flex-wrap:wrap; }
.small { font-size: 12px; color: var(--muted); }
@media (max-width: 820px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } .container { padding: 14px; } }

.section-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.race-button {
  display: grid;
  gap: 4px;
  text-align: left;
}

.race-button span {
  font-size: 12px;
  color: var(--muted);
}

.race-button em {
  font-style: normal;
  font-size: 11px;
  color: var(--muted);
}

.sync-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.sync-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn.secondary {
  background: #1f2937;
  border: 1px solid rgba(255,255,255,0.15);
}

button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .sync-card {
    display: grid;
  }
}

.row-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.btn.ghost { background: transparent; border: 1px solid rgba(255,255,255,.18); color: var(--text); }
.compact-table td, .compact-table th { padding-top: 8px; padding-bottom: 8px; }
.odds-input { max-width: 110px; padding: 8px 10px; }
