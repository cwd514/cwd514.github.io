#!/usr/bin/env bash
# 出荷する 4 枚の板を、原板の PNG から作り直す。
#
#   tools/optimize-images.sh [原板のあるディレクトリ]
#
# 既定は ~/Documents/drive/shots。原板は 1280x720 の PNG。
# 画面は 880px 幅まで落とし、そこから WebP と AVIF を作る。
# 生成したファイルには来歴を埋め直すこと（impeccable embed-prompt）。

set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-$HOME/Documents/drive/shots}"
OUT=assets/img
WIDTH=880
Q_WEBP=80
Q_AVIF=62

NAMES=(chase-morning chase-mist-torii chase-sunset chase-night)

command -v ffmpeg  >/dev/null || { echo "ffmpeg が見つかりません" >&2; exit 1; }
command -v avifenc >/dev/null || { echo "avifenc が見つかりません" >&2; exit 1; }
mkdir -p "$OUT"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

total_before=0
total_after=0
for n in "${NAMES[@]}"; do
  src="$SRC/$n.png"
  [ -f "$src" ] || { echo "原板がありません: $src" >&2; exit 1; }

  ffmpeg -v error -y -i "$src" -vf "scale=$WIDTH:-2:flags=lanczos" "$tmp/$n.png"

  ffmpeg -v error -y -i "$tmp/$n.png" -q:v "$Q_WEBP" "$OUT/$n.webp"
  avifenc -q "$Q_AVIF" --speed 4 -j all "$tmp/$n.png" "$OUT/$n.avif" >/dev/null

  # 書き出したものが本当に読めるかを、その場で確かめる。
  for f in "$OUT/$n.webp" "$OUT/$n.avif"; do
    ffmpeg -v error -i "$f" -f null - || { echo "読めません: $f" >&2; exit 1; }
  done

  webp=$(stat -c%s "$OUT/$n.webp")
  avif=$(stat -c%s "$OUT/$n.avif")
  printf '  %-22s webp %6s B   avif %6s B\n' "$n" "$webp" "$avif"
  total_after=$((total_after + webp + avif))
done

printf '\n合計 %s B（%s KB）\n' "$total_after" "$((total_after / 1024))"
echo "次: impeccable embed-prompt --scan $OUT で来歴を確認し、欠けていれば埋め直す。"
