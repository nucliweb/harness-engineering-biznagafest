# Claude Code reference used by this harness

Facts checked against the official docs at code.claude.com/docs on 2026-11-03 for Claude Code 2.1.316. Builders use these field names verbatim.

## Skills (`.claude/skills/<name>/SKILL.md`)

Frontmatter fields: `name` (defaults to the directory), `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context` (`fork`), `agent`, `background`, `hooks`, `paths`. Unknown fields are ignored silently, so spelling matters.

Arguments: `/spec-clarify DEMO-1` exposes `$ARGUMENTS`, `$0` and `$ARGUMENTS[0]`, all equal to `DEMO-1`. If the body uses no placeholder, Claude Code appends `ARGUMENTS: DEMO-1` to the content.

`disallowed-tools: AskUserQuestion` removes the question tool while the skill runs. `context: fork` plus `agent: <name>` runs the skill body as a prompt inside that subagent, without the conversation history.

## Subagents (`.claude/agents/<name>.md`)

Frontmatter fields: `name` (required, hooks receive it as `agent_type`), `description` (required), `tools`, `disallowedTools`, `model`, `effort`, `permissionMode`, `maxTurns`, `skills` (full skill content injected at start), `memory`, `background`, `color`, `isolation` (`worktree`), `omitClaudeMd`.

`model` accepts `sonnet`, `opus`, `haiku`, `fable`, a full id such as `claude-opus-5-5`, or `inherit`. `effort` accepts `low`, `medium`, `high`, `xhigh`, `max`.

Hooks declared in settings.json also fire inside subagents.

## Hooks (`.claude/settings.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [ { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/post-edit-eslint.sh" } ] }
    ],
    "SubagentStop": [
      { "matcher": "explorer|plan-auditor|developer-package|reviewer-package|validator-global|design-qa", "hooks": [ { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/journal-capture.mjs" } ] }
    ]
  }
}
```

`SubagentStop` matchers filter on `agent_type`.

PostToolUse stdin:

```json
{ "session_id": "...", "transcript_path": "...", "cwd": "...", "hook_event_name": "PostToolUse",
  "tool_name": "Edit", "tool_input": { "file_path": "/abs/path.ts", "old_string": "...", "new_string": "..." },
  "tool_response": { "filePath": "/abs/path.ts" }, "tool_use_id": "..." }
```

Paths are absolute. Exit code 2 shows stderr to the model; the tool already ran, so this is feedback, not a block. JSON `{"decision":"block","reason":"..."}` on stdout does the same with the reason attached to the tool result.

SubagentStop stdin:

```json
{ "session_id": "...", "transcript_path": "<main session>", "cwd": "...", "hook_event_name": "SubagentStop",
  "stop_hook_active": false, "agent_id": "def456", "agent_type": "developer-package",
  "agent_transcript_path": "~/.claude/projects/<project>/<session>/subagents/agent-def456.jsonl",
  "last_assistant_message": "..." }
```

Use `last_assistant_message` for the final text. To keep the subagent running, exit 2 with the instruction on stderr, or print `{"decision":"block","reason":"..."}`; the reason becomes the subagent's next instruction. `stop_hook_active` is true when the hook already blocked once this turn; check it to avoid loops. Eight consecutive blocks are overridden by Claude Code.

## Headless (`claude -p`)

- A skill invocation is just the prompt: `claude -p "/spec-clarify DEMO-1"`.
- `--output-format json` returns `result`, `session_id`, `duration_ms`, `duration_api_ms`, `num_turns`, `total_cost_usd`, `usage` (top-level agent only), `modelUsage` (per model, includes subagents: `costUSD`, `inputTokens`, `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`), `is_error`, `subtype` (`success`, `error_max_turns`, `error_max_budget_usd`, ...). Costs are client-side estimates at list price.
- `--model sonnet|opus|haiku|fable|<full id>`, `--effort low|medium|high|xhigh|max`.
- `--permission-mode acceptEdits|dontAsk|bypassPermissions|...`, `--permission-prompts none` removes the tools that need a person (`AskUserQuestion`) and denies anything that would prompt.
- `--allowedTools "Bash(pnpm *)" "Read"` pre-approves; `--tools "Read,Grep"` restricts the built-in set; `--disallowedTools` removes.
- `--max-turns N`, `--max-budget-usd X` (subagent spend counts).
- Do not use `--bare`: it skips hooks, skills, subagents and CLAUDE.md discovery.

## Usage in interactive sessions

`/usage` shows the session's total cost, API and wall durations, and usage by model, computed locally at list price.
