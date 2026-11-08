#!/usr/bin/env bash
# يبني IPK للتثبيت على التلفاز.  المتطلب: npm i -g @webos-tools/cli
set -e
cd "$(dirname "$0")/.."
STAGE=$(mktemp -d); mkdir -p "$STAGE/app" dist
for f in appinfo.json index.html icon.png largeIcon.png splash.png css js fonts; do cp -R "$f" "$STAGE/app/"; done
ares-package "$STAGE/app" -o dist
rm -rf "$STAGE"; echo "تم: $(ls dist/*.ipk)"
