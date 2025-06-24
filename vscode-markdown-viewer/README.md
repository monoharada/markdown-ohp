# Markdown OHP Viewer for VSCode

VSCode内で動作する高機能なマークダウンビューアー拡張機能です。

## 機能

- 🔄 **ホットリロード** - ファイルの変更を自動検知して即座に反映
- 📑 **自動目次生成** - 見出しから自動的に目次を作成
- 📂 **折りたたみ機能** - セクションごとに開閉可能
- 📊 **Mermaidダイアグラム対応** - フローチャートやガントチャートを美しく表示
- 🖼️ **画像ライトボックス** - クリックで画像を拡大表示
- 💻 **シンタックスハイライト** - コードブロックを見やすく表示
- 🎨 **テーマ対応** - VSCodeのテーマに合わせて表示

## 使い方

1. マークダウンファイル（.md）を開く
2. 以下のいずれかの方法でプレビューを表示：
   - `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows/Linux)
   - エディタ右上のプレビューアイコンをクリック
   - 右クリックメニューから「Open with Markdown OHP Viewer」を選択
   - コマンドパレットから「Markdown OHP: Open Preview」を実行

## 設定

VSCodeの設定から以下の項目をカスタマイズできます：

- `markdownOhp.autoReload`: ファイル変更時の自動リロード（デフォルト: true）
- `markdownOhp.showToc`: 目次の表示（デフォルト: true）

## 開発

```bash
# 依存関係のインストール
npm install

# 拡張機能のパッケージング
npm run package
```

## ライセンス

MIT License