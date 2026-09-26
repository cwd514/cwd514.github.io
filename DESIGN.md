---
name: すい — 個人ページ
description: ローカルLLMを研究する学生が、一次情報を静かに積み上げるための個人ページ。
colors:
  page: "#ffffff"
  surface: "#f7f8fa"
  ink: "#14161a"
  ink-muted: "#5b6472"
  ink-faint: "#8b95a3"
  hairline: "#e5e8ec"
  accent-teal: "#0f766e"
  accent-wash: "#e6f4f1"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif"
    fontSize: "clamp(2.6rem, 8vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif"
    fontSize: "clamp(1.8rem, 5vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.85
    letterSpacing: "0.01em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif"
    fontSize: "clamp(15px, 0.95rem + 0.2vw, 16.5px)"
    fontWeight: 400
    lineHeight: 1.85
    letterSpacing: "0.01em"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.85
    letterSpacing: "0.16em"
rounded:
  sm: "10px"
  md: "14px"
  pill: "999px"
  focus: "4px"
components:
  pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.9rem"
  pill-static:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 0.9rem"
  note-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "1rem 1.1rem"
  empty-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "1.5rem 1.4rem"
  badge:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-teal}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.55rem"
  nav-link:
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
---

# Design System: すい — 個人ページ

## Overview

**Creative North Star: "The Quiet Terminal"**

静かな端末画面。ひとつの落ち着いたカラム、モノスペースのメタ情報、1px の罫線、そして一点だけ灯るティール。この世界は「上手く整理されたシェルセッション」のように振る舞う — 何も叫ばず、すべてが読め、記録そのものが内容になる。装飾は前に出ず、読者が数秒で「誰で、何をしている学生か」を掴めることだけを目的にする。

密度はゆったりしている。最大幅 46rem の単一カラム、日本語本文に合わせた 1.85 の行送り、clamp() による流動的な余白。UI は額縁であって演目ではない。ブランドより人間が先に立つ。テーマはライト／ダークを自動で追従し、どちらでも同じ静けさを保つ。

トーンは実験的で前向き — 空の状態も隠さず「準備中」として正直に見せ、これから積み上がる余地を残す。確定した拒否事項は、誇張したグラデーション・派手な影・量産型 SaaS ランディングの常套手段。

**Key Characteristics:**
- 単一カラム、最大 46rem、流動的な余白（breakpoint ではなく clamp）。
- モノスペースはメタ情報のためだけに使う。
- 階層は 1px の罫線と面のトーン差で作る。静止状態に影は無い。
- アクセントはティール 1 色のみ。
- ライト／ダーク両テーマを自動追従。
- 空の状態も正直に見せ、後から実データを差し込める構造。

## Colors

ほぼ無彩色のクールグレーを土台に、深いティールを一点だけ灯す。彩度はアクセントに集中し、その他はすべてトーンで語る。

### Primary
- **Deep Teal / Laboratory Teal** (#0f766e): 唯一のアクセント。ブランドのドット、アイブロウ、ステータスバッジ、ホバー時の罫線、フォーカスアウトライン、戻りリンクのホバーに現れる。計測器のランプのように、ここぞという一点だけを照らす。

### Neutral
- **Page White** (#ffffff): ライトテーマのページ背景。
- **Mist Surface** (#f7f8fa): カード・ピル・空状態の面。ページから一段だけ沈んだ、静かな面。
- **Ink** (#14161a): 本文と見出しの基本色。
- **Muted Ink** (#5b6472): タグライン、リード文、ナビの通常状態、補助的な説明。
- **Faint Ink** (#8b95a3): セクション見出し、日付、フッターなどの三次メタ情報。
- **Hairline** (#e5e8ec): すべての 1px 罫線・区切り線。
- **Accent Wash** (#e6f4f1): ステータスバッジ専用の淡いティール面。

ダークテーマでは、frontmatter が記録するライト値が次のように入れ替わる（数値はサイドカー `colorMeta.<token>.darkCanonical` に保持）: page はほぼ黒、surface は一段明るいチャコール、ink 系は明るいグレーへ反転、accent-teal は同じ色相のまま明度を上げた明るいティール、accent-wash は暗いティールへ。テーマを編集するときは必ず両方を同時に更新する。

### Named Rules
**The One Voice Rule.** アクセントはどの画面でも面積の 10% 以下に留める。まれであること自体がその意味であり、広げた瞬間に静けさが壊れる。

## Typography

**Display Font:** system-ui 系サンセリフ（Hiragino Kaku Gothic ProN / Noto Sans JP 等の日本語フォールバック込み）
**Body Font:** 同上
**Label/Mono Font:** ui-monospace / SFMono-Regular / SF Mono / Menlo / Consolas

**Character:** 本文は素直なシステムサンセリフ、メタ情報だけがモノスペース。日本語の長文を主役に据えた、落ち着いた技術文書の声色。フォントを読み込まず OS に委ねることで、ページは軽く、常に手元の環境に馴染む。

### Hierarchy
- **Display** (800, clamp(2.6rem, 8vw, 4rem), 1.05, -0.02em): ヒーローの名前だけに使う最大級の一箇所。
- **Headline** (700, clamp(1.8rem, 5vw, 2.6rem), 1.25, -0.01em): 記事タイトルと 404 見出し。
- **Title** (600, 1.05rem, 1.85): タグライン、カード見出し。
- **Body** (400, clamp(15px, 0.95rem + 0.2vw, 16.5px), 1.85, 0.01em): 本文。行長は 38–42rem に収める。
- **Label** (mono 600, 0.75rem, 0.16em, uppercase): アイブロウ、セクション見出し、ナビ、日付。セクション見出しは 0.78rem / 0.16em、ナビは 0.8rem / 0.04em と、同系のまま微調整して使う。

### Named Rules
**The Mono Marker Rule.** モノスペースは「これはメタ情報だ」という印としてのみ使う。本文・リード・説明文には決して使わない。

## Layout

単一カラムの中央寄せ。コンテンツ幅は最大 46rem、左右パディングは clamp(1.1rem, 4vw, 2rem)。セクションの上下は clamp(2rem, 5vw, 3.25rem)、ヒーローだけは clamp(2.5rem, 8vw, 4.5rem) まで広げて呼吸させる。リズムは rem 単位の小さなギャップ（0.6 / 0.75 / 1.1 / 1.25rem）で組み、本文の行長は 38–42rem に制限する。

レスポンシブは breakpoint ではなく clamp() による連続的なスケーリングで表現する。固定のナビゲーション高は 3.5rem。ヘッダーは sticky で、背景は半透明＋ぼかし。

## Elevation & Depth

**フラットが既定。** 深さは影ではなく、1px のヘアラインと面のトーン差で表現する。カード・ピル・空状態はページから一段沈んだ surface の塗りと 1px の罫線だけで成立し、唯一の「浮き」は sticky ヘッダーの backdrop blur。現行実装に box-shadow は一つも無い。

ユーザー確定の方針は「静止はフラット、反応時のみ影」。現在の実装では反応時の浮きを translateY(-1px) で表しており、影は使っていない。影を導入する場合は、ホバー／フォーカスされた操作要素の直下にだけ許可する。

### Shadow Vocabulary
- **reactive-lift** (`box-shadow: 0 6px 20px rgba(20, 22, 26, 0.10)`): ホバー／フォーカス中の操作要素にのみ許可される、唯一認められた反応時の影。現行コードでは未使用（確定方針としての予約）。

### Named Rules
**The Flat-By-Default Rule.** 静止状態に影を置かない。階層は罫線と面のトーンで作る。影は「反応」の合図であって、構造の道具ではない。

## Shapes

角丸は柔らかいが抑制されている。コンテナは 14px、操作可能なカードとスキップリンクは 10px、ピルとバッジは完全な 999px。フォーカスリングは 2px のアクセント＋3px オフセット、角丸 4px。罫線は 1px のヘアラインのみを標準とし、空状態だけが 1px の破線で「まだ無い」ことを正直に示す。グラデーション、二重線、クリッピング、強い輪郭は使わない。

## Components

### Pills (link buttons)
触感があり自信的、しかし静か。丸みと罫線で「押せる」ことを示す、このページの主要な操作部品。
- **Shape:** 完全な丸（999px）＋ 1px ヘアライン。
- **Primary:** Mist Surface の塗り、Ink の文字、太字の名前とモノスペースのハンドルの二部構成、padding 0.5rem 0.9rem。
- **Hover / Focus:** 罫線がティールに変わり、1px だけ持ち上がる（translateY(-1px)、0.15s ease）。フォーカスはアクセントのアウトライン。
- **Static:** 同じ外殻でホバー反応なし・既定カーソル。Discord のような「リンクではない」項目に使う。

### Cards / Containers
- **Corner Style:** ノートカード 10px、空状態 14px。
- **Background:** Mist Surface。
- **Shadow Strategy:** なし（Elevation & Depth を参照）。
- **Border:** 1px ヘアライン。空状態のみ 1px 破線。
- **Internal Padding:** ノートカード 1rem 1.1rem、空状態 1.5rem 1.4rem。

### Status Badge
- **Style:** ピル形状、Accent Wash の塗り、Accent Teal の文字、モノスペース大文字 0.68rem / 0.14em、padding 0.2rem 0.55rem。空状態の中でだけ使う。

### Navigation
- **Style:** sticky な 3.5rem のヘッダー、半透明背景（ページ色を 82% で混ぜたもの）＋ぼかし、下端に 1px ヘアライン。
- **Brand:** 太字のテキスト＋アクセントのドット。
- **Links:** モノスペース 0.8rem / 0.04em。通常は Muted Ink、ホバーで Ink へ。
- **Footer:** ヘッダーの鏡像。Faint Ink のメタ情報＋ Muted Ink のリンクで、アクセントは使わない。

### Section Label (signature)
モノスペース 0.78rem / 0.16em の大文字 Faint Ink ラベル。直後に flex-grow する 1px のヘアライン罫線が続き、セクションの始まりを静かに告げる。

## Do's and Don'ts

### Do:
- **Do** アクセントを 1 画面あたり 10% 以下に保つ（The One Voice Rule）。
- **Do** 階層は 1px ヘアラインとトーンの異なる面で作る（The Flat-By-Default Rule）。
- **Do** モノスペースをメタ情報の印にだけ使う（The Mono Marker Rule）。
- **Do** 空状態は正直に「準備中」と見せ、後から実データを差し込める構造にする。
- **Do** ライト／ダーク両テーマの値を同時に更新する。
- **Do** 本文の行長を 38–42rem に収め、行送り 1.85 を保つ。

### Don't:
- **Don't** 誇張したグラデーションや派手な影を使う。
- **Don't** 量産型 SaaS ランディングの常套手段（全面ヒーロー画像、複数アクセント、常時ドロップシャドウ）を真似する。
- **Don't** 本文をモノスペースで組む。
- **Don't** アクセント以外の彩度の高い色を追加する。
- **Don't** 罫線を 2px 以上に太らせる。
- **Don't** ピルやカードの角丸を 0 にする。
