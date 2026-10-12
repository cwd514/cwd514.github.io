#!/usr/bin/env python3
"""日本語を自前で同梱したら何バイトになるかを測る。同梱はしない。判断の根拠を残すためだけの道具。

    PYTHONPATH=.impeccable/py python3 tools/cjk-subset-size.py

fontTools は入っていません（リポジトリに依存を持ち込まないため）。README の「書体」の節に
書いてある数字は、この 1 本で出しています。書体や機能を変えれば数字も変わるので、
変えたときは README の数字も測り直してください。
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ["index.html", "js/main.js", "css/styles.css"]
FACE = "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"
FACE_NUMBER = 0

# 本文に出てくる記号のうち、CJK 書体側に字形があるもの。
EXTRA = "—–·→↗×≤≥〜％°±"

# 上位集合を切り出すときの機能。縦組みと詰めは使っていないので入れていない。
FEATURES = ["kern", "liga", "tnum", "calt"]

# 本文に実際に出てくる CJK の数。数字が動いたら気づけるように出す。
PRINTED_BYTES = 89_268
LATIN_BYTES = 73_272


def charset():
    text = "".join((ROOT / f).read_text(encoding="utf-8") for f in SOURCES)
    text = re.sub(r"<[^>]+>", " ", text)  # タグは字形を持たない
    chars = set(text) | {chr(c) for c in range(0x20, 0x7F)} | set(EXTRA)
    return {c for c in chars if c.strip() or c == " "}


def main():
    try:
        from fontTools import subset
    except ImportError:
        sys.exit(
            "fontTools がありません。\n"
            "  pip install --no-cache-dir --target .impeccable/py fonttools brotli\n"
            "  PYTHONPATH=.impeccable/py python3 tools/cjk-subset-size.py"
        )
    if not Path(FACE).exists():
        sys.exit(f"書体がありません: {FACE}")

    chars = charset()
    cjk = sum(1 for c in chars if ord(c) > 0x2E80)

    opts = subset.Options()
    opts.font_number = FACE_NUMBER
    opts.flavor = "woff2"
    opts.layout_features = FEATURES
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]

    font = subset.load_font(FACE, opts)
    sub = subset.Subsetter(options=opts)
    sub.populate(text="".join(sorted(chars)))
    sub.subset(font)

    out = ROOT / ".impeccable/tmp/cjk-subset.woff2"
    out.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(out), opts)
    n = out.stat().st_size

    print(f"  文字種        {len(chars)}（うち CJK {cjk}）")
    print(f"  書体          {FACE}")
    print(f"  CJK サブセット {n:,} B = {n / 1024:.1f} KB")
    print(f"  同梱中のラテン {LATIN_BYTES:,} B = {LATIN_BYTES / 1024:.1f} KB（4 書体）")
    print(f"  比            {n / LATIN_BYTES:.1f} 倍")
    print(f"  書き出し      {out.relative_to(ROOT)}")

    if abs(n - PRINTED_BYTES) > 1024:
        print(
            f"\n  ※ README は {PRINTED_BYTES:,} B と書いています。"
            f"{n:,} B との差が 1 KB を超えたので、README を測り直してください。"
        )


if __name__ == "__main__":
    main()
