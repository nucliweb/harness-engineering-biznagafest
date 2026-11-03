#!/usr/bin/env bash
# Runs the four spec skills in series through `claude -p` in headless mode.
# Usage: scripts/headless.sh <TICKET>
# Env:   CLAUDE_FLAGS         overrides the default flags
#        HEADLESS_ALLOW_DIRTY=1  starts even with uncommitted changes in apps/ or packages/
#        HEADLESS_ROOT        overrides the repo root (tests)
# Exit:  0 all phases done and verified
#        1 error (claude exited non-zero or reported is_error)
#        2 usage error, or uncommitted changes in apps/ or packages/
#        4 blocked: BLOCKED.md exists, or a phase left an artefact that fails its deterministic check
# After each phase the runner checks the artefact itself instead of trusting the model's report.
set -u

TOOLS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="${HEADLESS_ROOT:-$TOOLS_DIR}"
PARSE="node $TOOLS_DIR/scripts/lib/parse-result.mjs"
FORMAT="$TOOLS_DIR/scripts/lib/format-stream.mjs"
APPEND="node $TOOLS_DIR/.claude/scripts/journal-append.mjs"
VALIDATE="$TOOLS_DIR/.claude/scripts"
ALLOW=(--allowedTools Read Grep Glob Edit Write Agent
  "Bash(pnpm --version)" "Bash(pnpm lint*)" "Bash(pnpm typecheck*)" "Bash(pnpm test*)" "Bash(pnpm build*)" "Bash(pnpm --filter *)" "Bash(pnpm exec vitest *)"
  "Bash(node .claude/scripts/*)" "Bash(node --test*)"
  "Bash(git diff*)" "Bash(git status*)" "Bash(git log*)" "Bash(git ls-files*)"
  "Bash(ls *)" "Bash(cat *)" "Bash(grep *)" "Bash(head *)" "Bash(tail *)" "Bash(wc *)")
DEFAULT_FLAGS="--permission-mode acceptEdits --permission-prompts none --max-turns 150"
FLAGS="${CLAUDE_FLAGS-$DEFAULT_FLAGS}"
PHASES="spec-clarify spec-plan spec-implement spec-validate"

TICKET="${1:-}"
if ! [[ "$TICKET" =~ ^[A-Z]+-[0-9]+$ ]]; then
  echo "usage: scripts/headless.sh <TICKET>   (ticket must match ^[A-Z]+-[0-9]+$)" >&2
  exit 2
fi

cd "$ROOT" || exit 1
SPEC_DIR="specs/$TICKET"
BLOCKED="$SPEC_DIR/BLOCKED.md"
METRICS="docs/run-metrics.md"

if [ -z "${HEADLESS_ALLOW_DIRTY:-}" ] || [ "$HEADLESS_ALLOW_DIRTY" != "1" ]; then
  if ! DIRTY="$(git status --porcelain -- apps packages 2>&1)"; then
    echo "headless: git status failed: $DIRTY" >&2
    exit 1
  fi
  if [ -n "$DIRTY" ]; then
    echo "headless: uncommitted changes in apps/ or packages/ (commit or stash them, or set HEADLESS_ALLOW_DIRTY=1):" >&2
    echo "$DIRTY" >&2
    exit 2
  fi
fi

if [ -e "$BLOCKED" ]; then
  echo "headless: $BLOCKED exists from an earlier run; resolve and delete it first" >&2
  exit 4
fi

export SPEC_HEADLESS=1
HEADLESS_NOTE="SPEC_HEADLESS=1. This is a headless run: never ask the person anything; follow the Headless section of each spec skill; on any block write specs/$TICKET/BLOCKED.md and stop."
mkdir -p docs "$SPEC_DIR"
if [ ! -f "$METRICS" ]; then
  {
    echo "# Run metrics"
    echo
    echo "Copied from the final \`result\` event of \`claude -p --output-format stream-json\`. Never estimated."
    echo
    $PARSE header
  } > "$METRICS"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

journal_phase() {
  case "$1" in
    spec-implement) echo implement ;;
    spec-validate) echo validate ;;
    *) echo plan ;;
  esac
}

# block <phase> <reason line>: write BLOCKED.md and a journal entry.
block() {
  local phase="$1" reason="$2" detail="${3:-}"
  {
    echo "# $TICKET · Blocked"
    echo
    echo "SETUP_ERROR $reason"
    if [ -n "$detail" ]; then
      echo
      echo '```'
      echo "$detail" | head -40
      echo '```'
    fi
  } > "$BLOCKED"
  $APPEND --root "$ROOT" --ticket "$TICKET" --phase "$(journal_phase "$phase")" --actor headless --kind blocked \
    --summary "$reason" >/dev/null 2>&1 || true
}

# check_phase <phase>: prints the failed check on one line, nothing when the artefact is fine.
check_phase() {
  local out
  case "$1" in
    spec-clarify)
      out="$(node "$VALIDATE/validate-clarification.mjs" "$SPEC_DIR/00-clarification.md" 2>&1)" ||
        echo "validate-clarification failed: $(echo "$out" | head -1)"
      ;;
    spec-plan)
      out="$(node "$VALIDATE/validate-plan.mjs" "$SPEC_DIR/03-plan.md" 2>&1)" ||
        echo "validate-plan failed: $(echo "$out" | head -1)"
      ;;
    spec-implement)
      if [ ! -f "$SPEC_DIR/03-plan.md" ]; then
        echo "03-plan.md is missing after spec-implement"
      elif grep -Eq '^[[:space:]]*- \[ \]' "$SPEC_DIR/03-plan.md"; then
        echo "03-plan.md has $(grep -Ec '^[[:space:]]*- \[ \]' "$SPEC_DIR/03-plan.md") unticked steps after spec-implement"
      fi
      ;;
    spec-validate)
      if [ ! -f "$SPEC_DIR/04-dod.md" ]; then
        echo "04-dod.md is missing after spec-validate"
      else
        local verdict
        verdict="$(awk '/^## Verdict[[:space:]]*$/{f=1;next} f&&NF{print;exit}' "$SPEC_DIR/04-dod.md" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        if [ "$verdict" != "GREEN" ] && [ "$verdict" != "GREEN WITH SUPPRESSIONS" ]; then
          echo "04-dod.md Verdict is \"${verdict:-empty}\", expected GREEN or GREEN WITH SUPPRESSIONS"
        fi
      fi
      ;;
  esac
}

for PHASE in $PHASES; do
  OUT="$TMP/$PHASE.ndjson"
  echo "headless: $TICKET $PHASE" >&2
  # shellcheck disable=SC2086
  claude -p "/$PHASE $TICKET" --output-format stream-json --verbose --append-system-prompt "$HEADLESS_NOTE" "${ALLOW[@]}" $FLAGS \
    < /dev/null 2> "$TMP/$PHASE.err" | node "$FORMAT" "$OUT"
  CODE="${PIPESTATUS[0]}"

  $PARSE row "$TICKET" "$PHASE" "$OUT" >> "$METRICS"
  IS_ERROR="$($PARSE field is_error "$OUT")"

  if [ -e "$BLOCKED" ]; then
    echo "headless: blocked after $PHASE, see $BLOCKED" >&2
    exit 4
  fi

  if [ "$CODE" -ne 0 ] || [ "$IS_ERROR" != "false" ]; then
    SUBTYPE="$($PARSE field subtype "$OUT")"
    DETAIL="$({ $PARSE field result "$OUT"; cat "$TMP/$PHASE.err"; } | head -40)"
    block "$PHASE" "headless run failed in $PHASE (exit $CODE, subtype $SUBTYPE)" "$DETAIL"
    echo "headless: $PHASE failed (exit $CODE, subtype $SUBTYPE), wrote $BLOCKED" >&2
    exit 1
  fi

  FAILED="$(check_phase "$PHASE")"
  if [ -n "$FAILED" ]; then
    block "$PHASE" "$FAILED"
    echo "headless: $PHASE check failed: $FAILED" >&2
    exit 4
  fi
done

echo "headless: $TICKET done, metrics in $METRICS" >&2
exit 0
