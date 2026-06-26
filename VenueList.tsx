:root {
  --bg: #f4f7fb;
  --panel: #ffffff;
  --text: #132033;
  --muted: #667085;
  --border: #d9e2ef;
  --primary: #1769ff;
  --primary-soft: #e8f0ff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.container { max-width: 1120px; margin: 0 auto; padding: 24px; }
.hero { padding: 28px 0 16px; }
h1 { margin: 6px 0; font-size: 36px; }
h2 { margin: 0 0 16px; font-size: 20px; }
p { color: var(--muted); }
.badge { display: inline-block; background: var(--primary-soft); color: var(--primary); padding: 6px 10px; border-radius: 999px; font-weight: 700; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 18px; padding: 18px; margin: 16px 0; box-shadow: 0 8px 24px rgba(16, 24, 40, .04); }
.highlight { border-color: var(--primary); background: linear-gradient(180deg, #fff, #f7faff); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
.card, .race { border: 1px solid var(--border); background: #fff; border-radius: 14px; padding: 14px; cursor: pointer; text-align: left; }
.card strong { display: block; font-size: 18px; }
.card span { display: block; color: var(--muted); margin-top: 4px; }
.active { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); font-weight: 800; }
.raceGrid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.race { text-align: center; font-size: 18px; font-weight: 700; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px; border-bottom: 1px solid var(--border); text-align: left; }
th { color: var(--muted); font-size: 13px; }
@media (max-width: 720px) {
  .container { padding: 14px; }
  .raceGrid { grid-template-columns: repeat(3, 1fr); }
  table { font-size: 13px; }
  th, td { padding: 8px; }
}
