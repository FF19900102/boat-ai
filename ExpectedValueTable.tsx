:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #07111f; color: #e5eefc; font-family: Arial, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif; }
a { color: inherit; text-decoration: none; }
.container { max-width: 1180px; margin: 0 auto; padding: 24px; }
.header { position: sticky; top: 0; z-index: 10; background: rgba(7,17,31,.92); border-bottom: 1px solid #1f3354; backdrop-filter: blur(8px); }
.header-inner { max-width: 1180px; margin: 0 auto; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
.logo { font-weight: 800; letter-spacing: .04em; }
.nav { display: flex; gap: 14px; color: #b6c5dc; font-size: 14px; }
.hero { padding: 28px; border: 1px solid #1f3354; border-radius: 24px; background: linear-gradient(135deg,#0d1b31,#13294a); }
.hero h1 { margin: 0 0 10px; font-size: 40px; }
.hero p { color: #b6c5dc; line-height: 1.7; }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
.card { border: 1px solid #1f3354; background: #0d1b31; border-radius: 18px; padding: 18px; }
.card:hover { border-color: #3d7cff; }
.badge { display: inline-flex; padding: 4px 9px; border: 1px solid #2f4b75; border-radius: 999px; font-size: 12px; color: #a9c7ff; }
.button { display: inline-flex; justify-content: center; align-items: center; padding: 11px 16px; background: #2563eb; border-radius: 12px; font-weight: 700; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 10px; border-bottom: 1px solid #1f3354; text-align: left; }
.table th { color: #8fb2e8; font-weight: 700; }
.kpi { font-size: 28px; font-weight: 800; }
.green { color: #5ee3a1; }
.yellow { color: #ffd166; }
.red { color: #ff7b7b; }
.muted { color: #8da3c2; }
.section-title { display: flex; justify-content: space-between; align-items: end; margin: 28px 0 12px; }
.section-title h2 { margin: 0; }
@media (max-width: 800px) { .grid-2,.grid-3 { grid-template-columns: 1fr; } .hero h1 { font-size: 30px; } .container { padding: 16px; } }
input { width: 100%; margin-top: 6px; padding: 10px; border-radius: 10px; border: 1px solid #2f4b75; background: #081528; color: #e5eefc; }
label { display: block; color: #b6c5dc; font-size: 13px; }
button { border: 0; color: white; cursor: pointer; }
