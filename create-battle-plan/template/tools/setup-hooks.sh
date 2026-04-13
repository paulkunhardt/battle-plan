#!/usr/bin/env bash
# setup-hooks.sh — Installs the Battle Plan git hooks.
# Usage: tools/setup-hooks.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$REPO_ROOT" config core.hooksPath .githooks
echo "Git hooks installed. Pre-commit will run verify-cascade.sh on docs changes."
echo ""
echo "Configuration:"
echo "  Default: warn only (commits proceed despite warnings)"
echo "  Strict:  copy .cascaderc.example to .cascaderc and set CASCADE_STRICT=1"
