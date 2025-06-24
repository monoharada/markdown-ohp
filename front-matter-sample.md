---
title: "Front Matterサンプル - カスタムタイトル"
author: Claude
date: 2024-06-19
tags: [markdown, front-matter, sample]
description: Front Matterを使用したマークダウンファイルのサンプルです
draft: false
version: 1.0
---

# Front Matterの使い方

このファイルはFront Matterを含むマークダウンファイルのサンプルです。

## Front Matterとは

Front Matterは、マークダウンファイルの先頭に配置されるメタデータブロックです。YAML形式で記述され、`---`で囲まれています。

## サポートされるフィールド

現在の実装では、以下のようなフィールドをサポートしています：

- **title**: ページタイトル（ブラウザタブに表示）
- **author**: 著者名
- **date**: 作成日
- **tags**: タグのリスト
- **description**: ページの説明
- **draft**: 下書きフラグ
- **version**: バージョン番号

## 使用例

```yaml
---
title: "私のブログ記事"
author: "山田太郎"
date: 2024-06-19
tags: [技術, Web開発, マークダウン]
---
```

## タイトルの優先順位

ページタイトルは以下の優先順位で決定されます：

1. Front Matterの`title`フィールド
2. 最初のH1見出し
3. 最初の見出し（H1以外）
4. ファイル名

この仕組みにより、柔軟なタイトル管理が可能になります。