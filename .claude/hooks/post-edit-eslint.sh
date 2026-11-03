#!/usr/bin/env bash
# PostToolUse hook (Edit|Write|MultiEdit): lint the edited .ts/.tsx file under apps/ or packages/.
# Exit 0: nothing to do or lint passed. Exit 2: lint failed, output on stderr is fed back to the model.
# No model call, no jq: the payload is parsed with node.

set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

FILE_PATH="$(node -e '
let s = "";
process.stdin.on("data", (c) => (s += c));
process.stdin.on("end", () => {
  try {
    const p = JSON.parse(s)?.tool_input?.file_path;
    process.stdout.write(typeof p === "string" ? p : "");
  } catch {}
});
' 2>/dev/null)"

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac

# Make the path project-relative to decide whether it lives under apps/ or packages/.
case "$FILE_PATH" in
  "$PROJECT_DIR"/*) REL="${FILE_PATH#"$PROJECT_DIR"/}" ;;
  /*) exit 0 ;;
  *) REL="${FILE_PATH#./}" ;;
esac

case "$REL" in
  apps/* | packages/*) ;;
  *) exit 0 ;;
esac

if ! command -v pnpm >/dev/null 2>&1; then
  echo "post-edit-eslint: pnpm not found, skipping lint for $REL" >&2
  exit 0
fi

cd "$PROJECT_DIR" || exit 0
if OUTPUT="$(pnpm lint:file "$FILE_PATH" 2>&1)"; then
  exit 0
fi

{
  echo "ESLint failed for $REL. Fix these before continuing:"
  echo "$OUTPUT"
} >&2
exit 2
