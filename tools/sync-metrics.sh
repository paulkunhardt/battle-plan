#!/usr/bin/env bash
# sync-metrics.sh — Propagates metrics.yml values to all docs that reference them.
# Finds [**N**](metrics.yml#field) links and updates N to match metrics.yml.
# Also handles legacy format: **N** (→ metrics.yml#field)
# Usage: tools/sync-metrics.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
METRICS_FILE="$REPO_ROOT/metrics.yml"
DOCS_DIR="$REPO_ROOT/docs"

if [ ! -f "$METRICS_FILE" ]; then
  echo "ERROR: metrics.yml not found at $METRICS_FILE"
  exit 1
fi

UPDATED=0
FILES_CHANGED=0

# Parse metrics.yml into key=value pairs (skip comments, blank lines, string values)
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "$line" ]] && continue
  [[ "$line" =~ \" ]] && continue

  key=$(echo "$line" | cut -d: -f1 | tr -d ' ')
  value=$(echo "$line" | cut -d: -f2 | tr -d ' ')

  [[ "$key" == "last_updated" ]] && continue

  # Find docs with references to this metric
  pattern="metrics\.yml#${key}"
  while IFS= read -r match_file; do
    [ -z "$match_file" ] && continue

    changed=false

    # Link format: [**N**](metrics.yml#field) → [**value**](metrics.yml#field)
    if grep -q "\[\*\*[0-9]*\*\*\](metrics\.yml#${key})" "$match_file"; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\[\*\*[0-9]*\*\*\](metrics\.yml#${key})/[\*\*${value}\*\*](metrics.yml#${key})/g" "$match_file"
      else
        sed -i "s/\[\*\*[0-9]*\*\*\](metrics\.yml#${key})/[\*\*${value}\*\*](metrics.yml#${key})/g" "$match_file"
      fi
      changed=true
    fi

    # Link format without bold: [N](metrics.yml#field) → [value](metrics.yml#field)
    if grep -q "\[[0-9]*\](metrics\.yml#${key})" "$match_file"; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\[[0-9]*\](metrics\.yml#${key})/[${value}](metrics.yml#${key})/g" "$match_file"
      else
        sed -i "s/\[[0-9]*\](metrics\.yml#${key})/[${value}](metrics.yml#${key})/g" "$match_file"
      fi
      changed=true
    fi

    # Legacy format: **N** (→ metrics.yml#field) → **value** (→ metrics.yml#field)
    if grep -q "\*\*[0-9]*\*\* (→ metrics\.yml#${key})" "$match_file"; then
      if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\*\*[0-9]*\*\* (→ metrics\.yml#${key})/\*\*${value}\*\* (→ metrics.yml#${key})/g" "$match_file"
      else
        sed -i "s/\*\*[0-9]*\*\* (→ metrics\.yml#${key})/\*\*${value}\*\* (→ metrics.yml#${key})/g" "$match_file"
      fi
      changed=true
    fi

    if [ "$changed" = true ]; then
      UPDATED=$((UPDATED + 1))
      echo "Synced: $key=$value in $match_file"
    fi
  done < <(grep -rl "$pattern" "$DOCS_DIR" 2>/dev/null | grep -v '/examples/' || true)
done < "$METRICS_FILE"

echo ""
echo "=== Metrics Sync ==="
echo "References updated: $UPDATED"

if [ $UPDATED -gt 0 ]; then
  echo "Run tools/touch-date.sh on modified files to update their dates."
fi
