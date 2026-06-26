import Link from 'next/link';
import Header from '@/components/Header';
import { getVenue, sampleBoats } from '@/lib/data';

function scoreBoat(b: typeof sampleBoats[number]) {
  const frameBonus = [18, 9, 5, 1, -3, -7][b.frame - 1];
  const stScore = Math.max(0, (0.22 - b.st) * 120);
  return b.winRate * 8 + b.localRate * 4 + b.motor * 0.45 + stScore + frameBonus;
}

export default function RacePage({ params }: { params: { venue: string; race: string } }) {
  const venue = getVenue(params.venue);
  const scored = sampleBoats.map((b) => ({ ...b, score: scoreBoat(b) }));
  const total = scored.reduce((s, b) => s + b.score, 0);
  const ranked = scored.map((b) => ({ ...b, firstRate: (b.score / total) * 100 })).sort((a, b) => b.firstRate - a.firstRate);
  return (
    <>
      <Header />
      <main className="wrap">
        <Link href={`/race/${venue.id}`} className="btn">← レース一覧へ戻る</Link>
        <div className="section">
          <h1 className="title">{venue.name} {params.race}R</h1>
          <p className="muted">Phase 1：サンプル出走表と簡易AI確率</p>
        </div>
        <section className="section card">
          <h2>AI確率ランキング</h2>
          <table>
            <thead><tr><th>順位</th><th>艇</th><th>選手</th><th>級</th><th>1着率</th><th>判定</th></tr></thead>
            <tbody>
              {ranked.map((b, i) => (
                <tr key={b.frame}>
                  <td>{i + 1}</td><td>{b.frame}号艇</td><td>{b.name}</td><td>{b.rank}</td><td>{b.firstRate.toFixed(1)}%</td><td><span className="pill">{i === 0 ? '本命' : i <= 2 ? '対抗' : '穴'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="section card">
          <h2>出走表</h2>
          <table>
            <thead><tr><th>艇</th><th>選手</th><th>全国勝率</th><th>当地勝率</th><th>モーター2連率</th><th>平均ST</th></tr></thead>
            <tbody>
              {sampleBoats.map((b) => <tr key={b.frame}><td>{b.frame}</td><td>{b.name}</td><td>{b.winRate}</td><td>{b.localRate}</td><td>{b.motor}%</td><td>{b.st}</td></tr>)}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
