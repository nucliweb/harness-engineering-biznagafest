#!/usr/bin/env bash
# Adversarial review: an opus reviewer lists findings on a diff, a sonnet reviewer tries to refute each,
# up to 3 rounds. Usage: scripts/adversarial-review.sh <base> <head>
# Exit: 0 CONSENSUS, 3 NO CONSENSUS, 1 error, 2 usage.
set -u

TOOLS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="${REVIEW_ROOT:-$TOOLS_DIR}"
PROMPTS="$TOOLS_DIR/scripts/prompts"
REVIEW="node $TOOLS_DIR/scripts/lib/parse-review.mjs"
MAX_ROUNDS=3

if [ "$#" -ne 2 ]; then
  echo "usage: scripts/adversarial-review.sh <base> <head>" >&2
  exit 2
fi
BASE="$1"
HEAD_REF="$2"

cd "$ROOT" || exit 1
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
STATE="$TMP/state.json"

if ! git diff "$BASE..$HEAD_REF" > "$TMP/diff.patch" 2> "$TMP/git.err"; then
  echo "adversarial-review: git diff failed: $(cat "$TMP/git.err")" >&2
  exit 1
fi
if [ ! -s "$TMP/diff.patch" ]; then
  echo "CONSENSUS"
  echo "No findings."
  exit 0
fi

# ask <model> <promptfile> <extra-text-file|->: pipes prompt + diff + extra to claude, prints the result text.
ask() {
  local model="$1" prompt="$2" extra="$3" raw="$TMP/raw.json"
  {
    cat "$prompt"
    printf '\n## Diff\n\n```diff\n'
    cat "$TMP/diff.patch"
    printf '\n```\n'
    if [ "$extra" != "-" ]; then
      printf '\n## Findings\n\n'
      cat "$extra"
      printf '\n'
    fi
  } | claude -p --model "$model" --tools "Read,Grep,Glob" --permission-prompts none --output-format json > "$raw" 2> "$TMP/claude.err"
  local code=$?
  if [ "$code" -ne 0 ] || ! $REVIEW result < "$raw"; then
    echo "adversarial-review: claude ($model) failed with exit $code: $(head -c 300 "$TMP/claude.err")" >&2
    return 1
  fi
}

# Round 0: the reviewer lists findings.
ask opus "$PROMPTS/reviewer.md" - > "$TMP/review.txt" || exit 1
if ! COUNT="$($REVIEW init "$STATE" < "$TMP/review.txt" 2> "$TMP/init.err")"; then
  echo "adversarial-review: reviewer output unparsable: $(head -c 300 "$TMP/review.txt")" >&2
  exit 1
fi
if [ "$COUNT" -eq 0 ]; then
  echo "CONSENSUS"
  echo "No findings."
  exit 0
fi

ROUND=1
while [ "$ROUND" -le "$MAX_ROUNDS" ]; do
  $REVIEW list "$STATE" alive > "$TMP/alive.txt"
  ask sonnet "$PROMPTS/rebuttal.md" "$TMP/alive.txt" > "$TMP/rebuttal.txt" || exit 1
  DISPUTED="$($REVIEW rebuttal "$STATE" < "$TMP/rebuttal.txt")"
  echo "adversarial-review: round $ROUND, $DISPUTED disputed" >&2

  if [ "$DISPUTED" -eq 0 ]; then
    $REVIEW render "$STATE" consensus
    exit 0
  fi
  if [ "$ROUND" -eq "$MAX_ROUNDS" ]; then
    $REVIEW render "$STATE" no-consensus
    exit 3
  fi

  $REVIEW list "$STATE" disputed > "$TMP/disputed.txt"
  ask opus "$PROMPTS/reviewer-reply.md" "$TMP/disputed.txt" > "$TMP/reply.txt" || exit 1
  REMAINING="$($REVIEW reply "$STATE" < "$TMP/reply.txt")"
  if [ "$REMAINING" -eq 0 ]; then
    $REVIEW render "$STATE" consensus
    exit 0
  fi
  ROUND=$((ROUND + 1))
done
