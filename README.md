# Markdown Viewer - 最強のマークダウンビューアー

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## 概要

ブラウザで動作する高機能なマークダウンビューアーです。ドラッグ&ドロップで簡単にマークダウンファイルを閲覧でき、リアルタイムでの編集反映（ホットリロード）にも対応しています。

## 主な機能

- 🎯 **ドラッグ&ドロップ対応** - ファイルをドロップするだけで簡単閲覧
- 🔄 **ホットリロード機能** - ファイルの変更を自動検知して即座に反映
- 📑 **自動目次生成** - 見出しから自動的に目次を作成
- 📂 **折りたたみ機能** - セクションごとに開閉可能
- 📊 **Mermaidダイアグラム対応** - フローチャートやガントチャートを美しく表示
- 🖼️ **画像ライトボックス** - クリックで画像を拡大表示
- 💻 **シンタックスハイライト** - コードブロックを見やすく表示

## 使い方

1. [デモページ](https://monoharada.github.io/markdown-ohp/)にアクセス
2. マークダウンファイルをドラッグ&ドロップ、またはクリックして選択
3. ホットリロードを有効にする場合は、プロンプトに従って設定

## 対応ブラウザ

- Chrome / Edge（推奨）- ホットリロード機能対応
- Firefox - 基本機能のみ
- Safari - 基本機能のみ

## 技術スタック

- **marked.js** - マークダウンパーサー
- **Mermaid** - ダイアグラム描画
- **highlight.js** - シンタックスハイライト
- **File System Access API** - ホットリロード機能

## ローカルでの実行

```bash
git clone https://github.com/monoharada/markdown-ohp.git
cd markdown-ohp
# HTTPサーバーを起動（例: Python）
python -m http.server 8000
# ブラウザで http://localhost:8000 にアクセス
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します！バグ報告や機能要望は[Issues](https://github.com/monoharada/markdown-ohp/issues)へ。