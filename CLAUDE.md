# V-CAL CLAUDE.md

## プロジェクト概要
キャンピングカー（Leaves3）の車両総重量・軸重を計算するWebアプリ。
GitHub Pagesでホスティング。フレームワークなし（HTML + CSS + JavaScript）。

## ファイル構成
- `index.html` — UI・オプション定義
- `script.js` — 全ロジック（設定・計算・排他制御・描画）
- `index.css` — スタイル
- `test.js` — Node.jsで動作する簡易テスト（`node test.js`）

## script.js アーキテクチャ
| クラス/定数 | 役割 |
|---|---|
| `CONSTANTS` | 定数（乗員体重・警告閾値など） |
| `APP_CONFIG.STYLES` | スタイル別のデフォルト・ロック設定 |
| `APP_CONFIG.EXCLUSIVITY` | 排他制御ルール定義 |
| `DOMRegistry` | DOM要素の一元管理 |
| `AppState` | 状態管理 |
| `WeightCalculator` | 重量計算（純粋関数） |
| `PolicyManager` | スタイル適用・排他制御 |
| `Renderer` | UI更新 |
| `App` | 初期化・イベント接続 |

## 排他制御の仕様（APP_CONFIG.EXCLUSIVITY）
- **480W (O4600)** → 240W (O4601) と ルーフウィンドウ (O1404) を排他
- **240W (O4601)** → 480Wのみ排他（ルーフウィンドウとは共存可能）
- **ルーフウィンドウ (O1404)** → 480Wのみ排他（240Wとは共存可能）
- **610W (O4700)** → 排他なし（常に選択可能）、id属性なし
- **バッテリー1個 (O4800)** ⇔ **バッテリー2個 (O4801)** 相互排他
- **温水設備 (O3012)** → バッテリー2個を排他（W-maxスタイルのみ: `styleOnly: ['wmax']`）
- **温水設備 (O3012)** → 生活用水タンクを強制チェック（`forceCheck: true`）

### 排他制御のポイント
- `applyExclusivity()` はループ前に全オプションをリセットしてからdisableルールを適用する（順序依存の競合を防ぐため）
- excludes対象は `disabled` にするとともに `checked = false` でチェックも解除する
- `styleOnly` フィールドがある場合は該当スタイル時のみルールを適用

## スタイル設定（APP_CONFIG.STYLES）
| スタイル | 特徴 |
|---|---|
| custom | デフォルト6人・生活用水タンクON |
| family | 生活用水タンク・温水設備・バッテリー2個をロック |
| wmax | 生活用水タンク・温水設備をデフォルトON、バッテリー2個は温水設備と排他 |
| emax | バッテリー2個をデフォルトON、生活用水タンク・温水設備をロック |
| premium | 3人・生活用水タンクON |

## 開発ルール
- **pushのたびに `index.html` のバージョンバッジをパッチインクリメントする**（v1.3 → v1.4 → …）
- ロジック変更は `script.js` のみ、UIは `index.html` のみ
- 排他ルールの追加は `APP_CONFIG.EXCLUSIVITY` 配列への追記で対応（`applyExclusivity` のロジック変更は原則不要）
- バッテリー以外のオプション・スタイル設定を変更する際は他スタイルへの影響を確認する

## テスト
```bash
node test.js
```
script.jsがクラッシュなく評価されることを確認する簡易テスト。
