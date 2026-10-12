#!/bin/sh
# 公開してよい物だけを dist/ へ複製する。
#
# このリポジトリの根は、そのまま公開できる形になっていない。PRODUCT.md には
# 公開しないと決めた一覧と、本人が名指しで触れるなと言った団体名が入っている。
# .impeccable/ には指示契約・ロール・判断の記録が丸ごと入っている。
# 根をそのまま web の根に置くと、それらが全部公開される。
#
# 使い方: tools/stage.sh [出力先]     （既定は ./dist）
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DEST=${1:-"$ROOT/dist"}

# 消す前に、解決した絶対パスが本当に意図した先か確かめる
case "$DEST" in
  /*) ;;
  *) echo "出力先は絶対パスで指定してください: $DEST" >&2; exit 1 ;;
esac
[ "$DEST" != "/" ] || { echo "出力先に / は使えません" >&2; exit 1; }

if [ -d "$DEST" ]; then
  rm -rf -- "$DEST"
fi
mkdir -p -- "$DEST"

for item in index.html css js assets; do
  cp -R -- "$ROOT/$item" "$DEST/"
done

# 板の隣に置いてある *.json は来歴の記録で、頁からは参照していない。リポジトリには残すが、
# 読者の取りに行く物ではないので公開物からは外す。
find "$DEST/assets" -name '*.json' -type f -delete

# 道具・設計文書・撮影記録は持ち出さない（そもそも複製していない）。
# 複製した物の中に、公開しない文字列が残っていないか確認する。
# 一覧はリポジトリに置かない。一覧そのものが、公開しない文字列だから。
# .impeccable/build/forbidden.txt に 1 行 1 語で置く。無ければこの確認は飛ばす。
LIST="$ROOT/.impeccable/build/forbidden.txt"
if [ -f "$LIST" ]; then
  # -f で一覧をそのまま渡す。配列は POSIX の sh に無い（CI の /bin/sh は dash）。
  if grep -rIlF -f "$LIST" "$DEST" 2>/dev/null | grep -q .; then
    echo "公開しない文字列が混ざっています:" >&2
    grep -rIlF -f "$LIST" "$DEST" >&2
    exit 1
  fi
  echo "公開しない文字列 $(grep -cv '^$' "$LIST") 語を確認しました。"
else
  echo "※ $LIST が無いので、公開しない文字列の確認は飛ばしました。" >&2
fi

echo "複製した物:"
( cd "$DEST" && find . -type f | sort | sed 's|^\./|  |' )
echo
echo "合計 $(find "$DEST" -type f -exec cat {} + | wc -c | tr -d ' ') B"
echo "公開先: $DEST"
