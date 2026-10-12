#!/usr/bin/env python3
"""自分の書体を積む。本文の外へ出る通信を増やさずに、字を選んだ者にする。

  tools/subset-fonts.py [--check-cjk]

この紙の上でラテン字が担う役は 2 つだけ。

  測定値と表示数字 → Hack            （コード用に設計された等幅。0 に点、1 は平ら）
  大文字ラテンの刻印 → DejaVu Sans Condensed（細身のグロテスク。追い込んだ大文字が締まる）

どちらも再配布できる。日本語の本文は端末のゴシックに任せる — 理由は DESIGN.md に書いた。
この 2 役は字形が閉じているので、部分化すると合計 20KB 前後になる。
"""

import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"

# 読み出しに現れうる字を、出荷する 3 ファイルから漏れなく拾う。
SOURCES = ["index.html", "js/main.js", "css/styles.css"]
# 数字・記号は本文に無くても JS が組み立てるので、印字可能 ASCII は全部入れる。
ALWAYS = "".join(chr(c) for c in range(0x20, 0x7F)) + "—–·→↗×≤≥〜％°±"

FACES = [
    ("hack", 400, "/usr/share/fonts/TTF/Hack-Regular.ttf"),
    ("hack", 700, "/usr/share/fonts/TTF/Hack-Bold.ttf"),
    ("label", 400, "/usr/share/fonts/TTF/DejaVuSansCondensed.ttf"),
    ("label", 700, "/usr/share/fonts/TTF/DejaVuSansCondensed-Bold.ttf"),
]

CJK_CANDIDATE = "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"


def charset() -> set:
    seen = set(ALWAYS)
    for rel in SOURCES:
        seen |= set((ROOT / rel).read_text(encoding="utf-8"))
    return seen


def build(src: str, text: set, dest: Path, font_number: int | None = None) -> int:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True          # CFF の部分化で壊れないように
    opts.layout_features = ["kern", "liga", "tnum", "calt"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]

    font = TTFont(src, fontNumber=font_number) if font_number is not None else TTFont(src)
    s = subset.Subsetter(options=opts)
    s.populate(text="".join(sorted(text)))
    s.subset(font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    font.save(dest)
    font.close()
    return dest.stat().st_size


def main() -> int:
    text = charset()
    print(f"字種 {len(text)}（うち非 ASCII {sum(1 for c in text if ord(c) > 0x7E)}）\n")

    total = 0
    for name, weight, src in FACES:
        if not Path(src).exists():
            print(f"  MISSING {src}", file=sys.stderr)
            return 1
        dest = OUT / f"{name}-{weight}.woff2"
        size = build(src, text, dest)
        total += size
        print(f"  {dest.name:<20} {size:>7,} B   ← {Path(src).name}")
    print(f"\n  合計 {total:,} B（{total / 1024:.1f} KB）")

    if "--check-cjk" in sys.argv:
        # 日本語を積むと何 KB になるか。積まない判断の根拠として測っておく。
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            probe = Path(td) / "probe.woff2"
            size = build(CJK_CANDIDATE, text, probe, font_number=0)
            print(f"\n  （参考）Noto Sans CJK JP を同じ字種で積むと {size:,} B（{size / 1024:.0f} KB）")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
