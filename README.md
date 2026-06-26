# Boat AI v2.2

v2.2では、購入履歴・成績集計をDB保存へ移行するための実装を追加します。

## 追加内容
- Prisma Client接続 `lib/db/prisma.ts`
- DB保存用Repository
- メモリ保存フォールバック
- Bet API
- 管理用Stats API
- 管理画面 `/admin/bets`
- DB移行メモ

既存の v2.0 / v2.1 に上書き・追加してください。
