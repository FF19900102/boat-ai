# Boat AI Real Data Layer v1

実データ取得層の追加パッチです。

## 追加内容
- 実データ取得プロバイダー構造
- 公式/外部データへ差し替え可能なProvider
- HTML/JSON取得クライアント
- レースID解析
- live API群
- 管理画面 `/admin/live-data`
- Mock fallback

## 重要
現時点では、実取得先URLを `BOAT_DATA_BASE_URL` に設定できる構造です。
未設定時は既存Mockへフォールバックします。

`.env`
```env
BOAT_DATA_PROVIDER=external
BOAT_DATA_BASE_URL=https://example.com
```
