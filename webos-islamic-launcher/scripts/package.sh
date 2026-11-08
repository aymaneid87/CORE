#!/usr/bin/env bash
# يبني ملف IPK للتثبيت على التلفاز.  المتطلب: npm i -g @webos-tools/cli
set -e
cd "$(dirname "$0")/.."
STAGE=$(mktemp -d)
mkdir -p "$STAGE/app"
for f in appinfo.json index.html icon.png largeIcon.png splash.png css js data fonts audio; do cp -R "$f" "$STAGE/app/"; done
mkdir -p dist
ares-package "$STAGE/app" -o dist
rm -rf "$STAGE"
echo "تم: $(ls dist/*.ipk)"
