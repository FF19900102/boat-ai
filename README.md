# Boat AI FINAL

毎日使える競艇AIアプリの統合版です。トップ画面で今日の勝負レース、AI結論、期待値、購入金額、買い目、理由、最強AI、信頼度をまとめて確認できます。

## 起動方法

1. `npm install`
2. `node server/server.js`
3. `http://localhost:3001` を開く

## 主要API

- `GET /api/predict/:venueId/:raceNo`
- `POST /api/model/train`
- `GET /api/model/status`
- `GET /api/automation/status`
- `GET /api/stats`

## データ保存場所

- `server/raceDatabase.json` 競艇レースDB
- `server/model.json` 学習済みモデル
- `server/predictionHistory.json` 予想履歴
- `server/leagueHistory.json` リーグ履歴
- `server/backtestHistory.json` バックテスト履歴
- `server/optimizerHistory.json` 最適化履歴
- `server/importLog.json` 取込ログ

## 更新方法

- 今日のデータはサーバー起動後に自動取得します。
- 手動で学習モデルを更新する場合は `POST /api/model/train` を実行します。
- 自動学習の状況は `GET /api/automation/status` で確認できます。

## バックアップ方法

- `server/*.json` を定期的にコピーしてください。
- 特に `raceDatabase.json` と `model.json` を退避すると復旧しやすいです。
