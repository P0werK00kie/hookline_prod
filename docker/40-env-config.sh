#!/bin/sh
# Writes window.__ENV__ from VITE_* container env vars so one image can be
# pointed at any Appwrite instance without rebuilding.
set -eu

OUT=/usr/share/nginx/html/env-config.js

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

{
  echo "window.__ENV__ = {"
  for key in \
    VITE_APPWRITE_URL \
    VITE_APPWRITE_PROJECT_ID \
    VITE_APPWRITE_DATABASE_ID \
    VITE_APPWRITE_STORAGE_ID \
    VITE_APPWRITE_USER_COLLECTION_ID \
    VITE_APPWRITE_POST_COLLECTION_ID \
    VITE_APPWRITE_SAVES_COLLECTION_ID; do
    val=$(printenv "$key" || true)
    printf '  "%s": "%s",\n' "$key" "$(json_escape "$val")"
  done
  echo "};"
} > "$OUT"

echo "40-env-config: wrote $OUT (VITE_APPWRITE_URL=${VITE_APPWRITE_URL:-<unset>})"
