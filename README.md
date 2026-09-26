# cwd514.github.io

「すい」の個人ページ。ローカルLLM研究の記録・作品・メモを置いていくサイト。

- 公開URL: https://cwd514.github.io/
- 構成: Astro（静的サイト）+ Markdown コンテンツコレクション
- デプロイ: `main` に push → GitHub Actions → GitHub Pages

## 開発

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/ を生成
npm run preview    # ビルド結果をローカル確認
```

## 記事・メモの追加

`src/content/notes/` に Markdown ファイルを追加します。

```md
---
title: 記事のタイトル
date: 2026-01-01
summary: 一覧に表示する短い説明（任意）
tags: [llama.cpp, quantization]
---

本文をここに書きます。
```

- `draft: true` を付けると非公開になります。
- ファイル名がそのまま URL になります（例: `src/content/notes/hello.md` → `/notes/hello/`）。

## デプロイ

`main` ブランチへ push すると、GitHub Actions が自動でビルドし GitHub Pages に公開します。
ワークフローは `.github/workflows/deploy.yml`。

## メモ

- `PRODUCT.md` はサイトの目的・読者・ブランド方針をまとめたドキュメントです。
