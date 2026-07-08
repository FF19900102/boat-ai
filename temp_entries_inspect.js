const https = require('https');
const url = 'https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=01&hd=20260706';
https.get(url, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const lower = data.toLowerCase();
    const tbodyIdx = lower.indexOf('<tbody');
    if (tbodyIdx < 0) {
      console.log('tbody not found');
      return;
    }
    const end = lower.indexOf('</tbody>', tbodyIdx);
    const tbody = data.slice(tbodyIdx, end + 8);
    console.log(tbody);
  });
}).on('error', (err) => {
  console.error(err);
  process.exit(1);
});
