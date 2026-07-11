# 仕事情報収集ダッシュボード

Claude.ai の Artifact として動く、個人用の情報収集ダッシュボードです。
「開いてボタンを押せば、トピック別の最新情報がまとまって読める」画面を提供します。

> **Note:** このディレクトリは同リポジトリの TimeLight（`routine.` アプリ / ルートの `index.html`）とは**別プロジェクト**です。

## 使い方

1. `JobInfoDashboard.jsx` の中身を全てコピーする
2. Claude.ai で「このReactコンポーネントをArtifactにして」と依頼して貼り付ける
3. Artifact 上で各パネルの「更新」ボタンを押すと、Claude API（Web検索付き）で最新情報を取得する

※ `window.storage` と Claude API は Artifact 環境でのみ動作します。ローカルでは動きません。

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `JobInfoDashboard.jsx` | **本体**。単一ファイルのReactコンポーネント（default export） |
| `prototype.html` | 操作できるプロトタイプ。サンプルデータでUI・操作感を確認できる（API不要、ブラウザで開くだけ） |
| `architecture.html` | 視覚的なアーキテクチャ図（単一HTML） |
| `ARCHITECTURE.md` | 設計ドキュメント（Mermaid図つき。GitHub上でそのまま描画される） |

## 機能の概要

- **4パネル**：WordPress / HRテック業界 / Webデザイン / 自由枠（キーワード指定）
- 各パネルは独立して更新（枠ごとのローディング・エラー状態）
- 記事は タイトル（新しいタブで開くリンク）・媒体名・要約・既読チェック 付き
- 既読状態と取得結果は `window.storage`（単一キー `dashboard-state`）に永続化
- デスクトップ 2×2 グリッド / モバイル 1カラム（375px幅で横スクロールなし）

詳細な設計は [`ARCHITECTURE.md`](./ARCHITECTURE.md) を参照してください。
