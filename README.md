# Boat AI v0.6

v0.6では、外部データ取得を差し替えやすくするためのAPI層を追加します。

## 追加内容
- `services/boatDataProvider.ts`
- `services/mockBoatDataProvider.ts`
- `services/dataProviderFactory.ts`
- 開催場API
- レース一覧API
- レース詳細API
- オッズAPI
- 結果API
- 天候API
- 環境変数 `BOAT_DATA_PROVIDER`

## 使い方
既存のBoat AIへ上書きしてください。

現時点では `mock` データで動きます。
将来、公式・有料APIに差し替える場合は `dataProviderFactory.ts` を変更します。
