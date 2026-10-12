#!/usr/bin/env bash
# 手元で見るための最小のサーバ。127.0.0.1 にだけ開く。
#
#   tools/serve.sh [ポート]     既定 8129
#
# file:// でも概ね動くが、AVIF/WebP の content-type を正しく返させるために
# これを使う。外部へは何も出さない。

set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${1:-8129}"
echo "http://127.0.0.1:$PORT/"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
