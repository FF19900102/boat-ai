const https = require('https');
https.get('https://www.boatrace.jp/owpc/pc/race/index', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const hrefs = [...data.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
    const filtered = hrefs.filter((h) => /race|stadium|place|index|list|hcd|jcd|rno|sno/i.test(h)).slice(0, 200);
    console.log(filtered.join('\n'));
  });
}).on('error', (err) => {
  console.error(err);
  process.exit(1);
});
