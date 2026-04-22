# V-CAL CLAUDE.md

## プロジェクト概要
キャンピングカー（Leaves3）の車両総重量・軸重を計算するWebアプリ。
Cloudflare Pagesでホスティング。フレームワークなし（HTML + CSS + JavaScript）。

## ファイル構成
- `index.html` — UI骨格（オプションはscript.jsから自動生成）
- `script.js` — 全ロジック（データ定義・設定・計算・排他制御・描画）
- `index.css` — スタイル
- `test.js` — Node.jsで動作する簡易テスト（`node test.js`）

## オプションの追加方法
`script.js` の `OPTIONS` 配列に1行追加するだけ。HTMLの変更は不要。

```javascript
{ id: 'XXXX', name: '表示名', code: 'XXXX', front: 0, rear: 0, total: 0 }
```

排他制御が必要な場合は `APP_CONFIG.EXCLUSIVITY` にルールを追加する。

## script.js アーキテクチャ
| クラス/定数 | 役割 |
|---|---|
| `CONSTANTS` | 定数（乗員体重・警告閾値など） |
| `OPTIONS` | オプションデータ定義（HTMLを自動生成） |
| `WATER_OPTIONS` | 水タンクデータ定義（HTMLを自動生成） |
| `APP_CONFIG.STYLES` | スタイル別のデフォルト・ロック設定 |
| `APP_CONFIG.EXCLUSIVITY` | 排他制御ルール定義 |
| `DOMRegistry` | DOM要素の一元管理 |
| `AppState` | 状態管理 |
| `WeightCalculator` | 重量計算（純粋関数） |
| `PolicyManager` | スタイル適用・排他制御 |
| `Renderer` | UI更新 |
| `App` | 初期化・HTML生成・イベント接続 |

### 初期化順序
`App.constructor()` → `_buildOptions()` でHTML生成 → `new DOMRegistry()` → `init()`

## 排他制御の仕様（APP_CONFIG.EXCLUSIVITY）
- **480W (O4600)** → 240W (O4601) と ルーフウィンドウ (O1404) を排他
- **240W (O4601)** → 480Wのみ排他（ルーフウィンドウとは共存可能）
- **ルーフウィンドウ (O1404)** → 480Wのみ排他（240Wとは共存可能）
- **610W (O4700)** → 排他なし（常に選択可能）
- **バッテリー1個 (O4800)** ⇔ **バッテリー2個 (O4801)** 相互排他
- **温水設備 (O3012)** → バッテリー2個を排他（W-maxスタイルのみ: `styleOnly: ['wmax']`）
- **温水設備 (O3012)** → 生活用水タンクを強制チェック（`forceCheck: true`）

### 排他制御のポイント
- `applyExclusivity()` はループ前に全オプションをリセットしてからdisableルールを適用（順序依存の競合を防ぐ）
- excludes対象は `disabled` + `checked = false` でチェックも解除する
- `styleOnly` フィールドがある場合は該当スタイル時のみルールを適用

## スタイル設定（APP_CONFIG.STYLES）
| スタイル | 特徴 |
|---|---|
| custom | デフォルト6人・生活用水タンクON |
| family | 生活用水タンク・温水設備・バッテリー2個をロック |
| wmax | 生活用水タンク・温水設備をデフォルトON、バッテリー2個は温水設備と排他 |
| emax | バッテリー2個をデフォルトON、生活用水タンク・温水設備をロック |
| premium | 3人・生活用水タンクON |

## WATER_OPTIONS のカテゴリ
- `category: 'water'` → 重量内訳の「生活用水タンク」に計上
- `category: 'freshWater'` → 重量内訳の「標準装備重量」に計上（清水タンク）

## 開発ルール
- **pushのたびに `index.html` のバージョンバッジをパッチインクリメントする**（v1.5 → v1.6 → …）
- オプション追加は `OPTIONS` 配列への追記のみ（HTMLは変更不要）
- 排他ルール追加は `APP_CONFIG.EXCLUSIVITY` への追記で対応
- `index.css` の**既存ルールは変更しない**（既存コンポーネントのルック＆フィール維持のため）。
  新規コンポーネントを追加する場合は、`index.css` の末尾にセクションコメント付きで追記してよい。

## テスト
```bash
node test.js
```
script.jsがクラッシュなく評価されることを確認する簡易テスト。
