#!/bin/sh
# Keep .horos/ current the way package-lock.json is kept current.
#
# The reading boundary describes this tree's token sinks, so it goes stale the
# moment a tracked file is added, removed, or changes size. The horos workflow
# re-derives it on every push and fails when the committed copy no longer
# matches, which is what makes the boundary worth consulting. This regenerates
# it in the commit that would otherwise have broken it.
#
# It never blocks a commit. A missing python3, an unreachable network or an
# absent pin leaves the boundary untouched and says why on stderr; CI stays the
# enforcement. The classifier is cached under .horos-classifier, fetched once
# per pin, and the pin is read from the workflow so there is one place to move
# it.

set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

workflow=.github/workflows/horos.yml
[ -f "$workflow" ] || exit 0

pin=$(sed -n 's/^  HOROS_REF: \([0-9a-f]\{40\}\)[[:space:]]*$/\1/p' "$workflow" | head -1)
if [ -z "$pin" ]; then
  echo "horos: no HOROS_REF pin in $workflow; boundary not refreshed" >&2
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "horos: python3 not found; boundary not refreshed, the horos job will check it" >&2
  exit 0
fi

cache=.horos-classifier
scripts_path=plugins/horos/skills/horos/scripts
horos=$cache/$scripts_path/horos.py

if [ "$(cat "$cache/.pin" 2>/dev/null || true)" != "$pin" ] || [ ! -f "$horos" ]; then
  rm -rf "$cache"
  if git clone -q --filter=blob:none --no-checkout \
        https://github.com/wildcat-finance/skills.git "$cache" 2>/dev/null \
     && git -C "$cache" sparse-checkout set --no-cone "$scripts_path" 2>/dev/null \
     && git -C "$cache" checkout -q "$pin" 2>/dev/null; then
    printf '%s\n' "$pin" > "$cache/.pin"
  else
    rm -rf "$cache"
    echo "horos: could not fetch the pinned classifier; boundary not refreshed, the horos job will check it" >&2
    exit 0
  fi
fi

python3 "$horos" scan . --write >/dev/null
python3 "$horos" scan . --census --write >/dev/null
git add .horos
