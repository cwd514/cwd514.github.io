---
target: src/pages/index.astro
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/cwd5/Projects/mypage/src/pages/index.astro"
target_fingerprint: "sha256:0c1a07baddee26dc86469cdf0b6a46a631cbad2c55658b6d2f9a6797c8090e27"
target_path: /home/cwd5/Projects/mypage/src/pages/index.astro
timestamp: 2026-09-26T13-16-36Z
slug: src-pages-index-astro
---
# Critique — すい 個人ページ (homepage)

Target: `src/pages/index.astro` (live build at http://127.0.0.1:4321/)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hover/focus states are clear, but there is no active/current-section state in the nav, and the inert Discord pill gives no signal that it is not a link. |
| 2 | Match System / Real World | 3 | Japanese body copy is natural; English mono labels (`About`, `Works & Notes`, `Local LLM`) are conventional but carry no Japanese gloss for non-English readers. |
| 3 | User Control and Freedom | 3 | Skip link, anchor nav, 404 "トップへ戻る" and article back-link all work; nothing destructive exists to undo. |
| 4 | Consistency and Standards | 3 | One coherent system; the only drift is four literal font sizes outside the documented ramp (detector advisories). |
| 5 | Error Prevention | 3 | A static read-only page with a real 404 and no input paths — little to prevent by design. |
| 6 | Recognition Rather Than Recall | 3 | Nav labels and links are visible and named; no notes index yet, so future discovery depends on the homepage list alone. |
| 7 | Flexibility and Efficiency | n/a | No task workflow on a static identity page; accelerators are not meaningful. |
| 8 | Aesthetic and Minimalist Design | 4 | Genuinely excellent: one column, one accent, hairline hierarchy, nothing decorative. |
| 9 | Error Recovery | 3 | 404 uses plain language ("存在しないか、移動した可能性があります") and offers a route home; no search/sitemap, fine at this size. |
| 10 | Help and Documentation | n/a | A personal identity page does not carry help content. |
| **Total** | | **25/32** | **Good (78%)** |

Heuristics 7 and 10 scored `n/a` (Persuade surface); maximum renormalized to 32.

## Design Specificity Verdict

**LLM assessment.** Visually this is authored, not templated. The "Quiet Terminal" world is legible in concrete choices: a mono eyebrow (`Local LLM`), mono uppercase section labels pinned by a flex-grow hairline (`.section-title::after`), a single teal dot standing in for a logo, a dashed-border empty state, and a 46rem column tuned to Japanese line length at 1.85. The Mono Marker Rule is actually obeyed — no body text is set in mono. That discipline is rare and reads as a point of view, not a theme.

Specificity collapses at the content layer. Strip the chrome and the page is the universal personal-site skeleton: eyebrow → name → tagline → lead → three social pills → About → empty Works. A visitor learns *who* すい is but nothing about what has actually been run, broken, or learned — the exact thing PRODUCT.md names as the differentiator ("一次情報"). The visual world promises a research log; the page delivers a business card. The sticky nav (`About` / `Works`) is generic and does no product work.

**Deterministic scan.** `impeccable detect --json src` → exit 0 (clean), 5 advisory findings, all rule `design-system-font-size` in `src/styles/global.css`:

- line 133 — `font-size: 0.8rem` (nav)
- line 193 — `font-size: 0.9rem` (pill)
- line 251 — `font-size: 0.68rem` (badge)
- line 314 — `font-size: 0.9rem` (back link)
- line 333 — `font-size: 0.82rem` (footer)

These are **advisories, not defects** (exit 0). Partial false positive: DESIGN.md's prose explicitly documents a nav size of 0.8rem, but the machine-readable `typography` frontmatter block declares no nav/label-sm step, so the detector cannot see it. The other four are real drift.

**Visual overlays.** Not available. Browser automation reported "No desktop browser is connected to this session," so no live inspection, no screenshots, and no in-page `detect.js` overlay were possible. Fallback signal: browser disconnected; all visual judgments above are source-derived (HTML + CSS + built `dist/index.html`).

## Overall Impression

A quietly confident, unusually well-disciplined page for a solo student site — the craft floor is high and the restraint is the point. The single biggest opportunity: the design promises a working research log and the content delivers only an introduction. Fix that (within the no-fabrication constraint) and the page earns the visits it is built for.

## What's Working

1. **The component hierarchy is real, not stated.** Section labels are mono uppercase at 0.78rem in Faint Ink with a hairline that runs to the edge — the page's own system, applied consistently on 404, article, and home. Nothing is styled ad hoc.
2. **The empty state is honest and designed.** `準備中` in an accent-wash badge over a dashed border, with forward-looking copy. PRODUCT.md principle 5 ("誠実な空状態") is visibly implemented, not just promised.
3. **Accessibility plumbing is present where it counts.** Skip link, `lang="ja"`, `:focus-visible` outline with offset, `prefers-reduced-motion` override of `scroll-behavior` and all transitions, and automatic `color-scheme` light/dark with matching `theme-color`. This is more than most personal sites ship.

## Priority Issues

### [P1] Faint Ink fails WCAG AA everywhere it is used
- **What:** `--faint: #8b95a3` on `--bg: #ffffff` is **3.03:1** (needs 4.5:1 for normal text). It is used for every `.section-title`, `.note-meta` date, and the entire footer (0.78–0.82rem — normal text, not large). In dark mode `--faint: #6b7480` on `#0b0d10` is **~4.1:1**, still short.
- **Why it matters:** The section labels are how the page communicates its structure; low-vision users lose the primary wayfinding cue and the meta information. This is a concrete AA failure on the most-used structural element.
- **Fix:** Light theme `--faint` → `#6b7480` (≈4.7:1 on white); dark theme `--faint` → `#8b95a3` (≈6.4:1 on `#0b0d10`). The two values can simply swap. Verify `--muted` stays visually distinct from `--faint` afterward.
- **Suggested command:** `/impeccable harden`

### [P1] The page shows no evidence of the actual work
- **What:** The hero states identity; About restates intent ("実際に試し、動いたこと・詰まったことをそのまま記録"); Works & Notes is empty. No model names, hardware, quantization choices, experiment, code, or current focus appears anywhere.
- **Why it matters:** PRODUCT.md defines success as a peer quickly judging "誰で、何をしているか" and being moved to connect. "Who" lands; "what they've done" does not. The page undercuts its own positioning ("自分の環境で試行錯誤した記録そのもの").
- **Fix:** Add, without inventing facts, an honest **"Now / 環境"** block (current model + hardware + what is being tried this month) and a short bounded **"これから"** list of planned notes. Reuse existing components (`.prose`, `.empty`, `.badge`) so no new visual world appears.
- **Suggested command:** `/impeccable shape`

### [P2] The Discord pill is a false affordance and is not actionable
- **What:** Discord renders as a `<span class="pill pill-static">` visually identical to the GitHub/X `<a class="pill">` links. It is not clickable and not focusable. Discord handles have no profile URL, so copy is the only path — yet the string is not selectable-as-a-unit and there is no copy affordance.
- **Why it matters:** Users click it, nothing happens, and they read the site as broken. Screen-reader users hear "Discord su_ra_i_meu" as plain text with no role and no way to act on it. One third of the stated connection paths is effectively dead.
- **Fix:** Either drop the pill chrome for Discord and present it as labelled mono text (`Discord: su_ra_i_meu`) with a one-click copy button, or keep the pill and add a copy affordance plus a visually distinct, non-link treatment. Announce the copy result (e.g. "コピーしました").
- **Suggested command:** `/impeccable clarify`

### [P2] No social/OG preview image on the page's own growth channel
- **What:** `BaseLayout.astro` emits `og:type/title/description/url/site_name` and `twitter:card=summary`, but no `og:image` / `twitter:image`.
- **Why it matters:** PRODUCT.md names X as a primary entry point. Shared links render as bare text with no card, which measurably depresses click-through for exactly the audience the page is courting.
- **Fix:** Ship a simple typographic OG card (name + 「学生・地元のLLM研究中」 + accent dot) as a 1200×630 PNG, add `og:image`, `og:image:width/height`, and switch `twitter:card` to `summary_large_image`. A generated card is not a fabricated claim.
- **Suggested command:** `/impeccable harden`

### [P2] Outbound links open new tabs with no indication
- **What:** All GitHub/X pills and footer links use `target="_blank"` with no visual marker or accessible note. (The Discord pill is the only one that stays in place.)
- **Why it matters:** Unexpected context switch — a WCAG 3.2.5 (Change on Request) concern, and on mobile it can be disorienting returning to the page.
- **Fix:** Add an `↗` marker and an accessible note (visually hidden text or `aria-label` suffix, e.g. "新しいタブで開きます"), or remove `target="_blank"` — for a personal page, same-tab is defensible.
- **Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Jordan (Confused First-Timer).** Reads everything literally. Within 5 seconds gets "すい / 学生・地元のLLM研究中" — identity lands. But then: the nav and section headings are English mono (`About`, `Works & Notes`) with no Japanese gloss, so Jordan maps "Works & Notes" to 作品・メモ only by guessing. He clicks the Discord pill repeatedly — same shape as the working links, different result — and concludes the site is broken. After the lead paragraph there is no explicit "next step"; he is not told whether to read, click, or wait.

**Sam (Accessibility-Dependent).** Keyboard user, low vision. Skip link and focus-visible work well. But every `.section-title` and all footer text sit at 3.03:1 (light) / ~4.1:1 (dark) — below AA — so the page's structural skeleton is the least readable thing on it. The Discord pill is not focusable and exposes no role, so Discord is unreachable to a screen reader in practice. New-tab links change context with no announcement. No `aria-current` on the nav anchors.

**Casey (Distracted Mobile).** One-handed, interrupted. The hero pills measure roughly 42–43px tall (0.5rem vertical padding + 0.9rem text at 1.85 line-height), just under the 44×44px guidance, and they sit above the fold where the thumb reaches least comfortably. Navigation lives only in the top sticky bar — there is no bottom affordance. Returning mid-scroll is fine (static page, state preserved by URL).

**Riley (Deliberate Stress Tester).** No content to stress-test yet: the notes schema supports `tags`, `summary`, `draft`, but the homepage never surfaces `tags` once notes exist, and an empty-string `summary` renders an empty `.note-summary` div. Long titles and RTL/emoji in titles are untested paths worth checking when the first real note lands.

## Minor Observations

- **Off-ramp font sizes (detector advisories):** 0.68rem (badge, line 251), 0.9rem (pill, 193), 0.9rem (back, 314), 0.82rem (footer, 333) are literals outside the DESIGN.md type ramp. Either promote them to documented steps (`label-xs`, `label-sm`, `action`, `small`) in both DESIGN.md and its sidecar, or snap them to existing steps. 0.8rem nav (133) is already documented in prose but missing from the machine-readable frontmatter.
- No active/current-section state on `/#about` and `/#works` nav anchors.
- `tags` in the notes schema is currently dead surface — never rendered on the homepage or article page.
- Article back-link goes to `/#works` (good), but the 404 uses the lighter `.back` style with no visual weight advantage over body text.
- `og:image` absence aside, `theme-color` is correctly paired for both schemes.

## Questions to Consider

- If the page's job is to make a peer want to connect, what is the single piece of *evidence* that would do that — and why is it not on the page yet?
- The "Quiet Terminal" identity is strong visually but silent in content. Could the mono-marker language carry an actual current status line (model loaded, experiment running) instead of only labelling sections?
- The Discord handle is the least discoverable link but may be the highest-intent contact for this audience. What would make copying it trivially easy?
- Is the empty state doing enough work to turn a "nothing here yet" visit into a "come back" visit?
