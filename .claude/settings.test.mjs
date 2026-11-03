import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8'));
// Hook commands quote the project dir so paths with spaces work: "$CLAUDE_PROJECT_DIR"/.claude/...
const stripRoot = (cmd) => cmd.replace(/^node /, '').replace(/^"?\$CLAUDE_PROJECT_DIR"?\//, '');
const commandPath = (cmd) => join(root, stripRoot(cmd));

test('SubagentStop matcher lists the six agents and points at an existing script', () => {
  const [entry] = settings.hooks.SubagentStop;
  assert.deepEqual(entry.matcher.split('|').sort(), ['design-qa', 'developer-package', 'explorer', 'plan-auditor', 'reviewer-package', 'validator-global']);
  const cmd = entry.hooks[0].command;
  assert.match(cmd, /^node "\$CLAUDE_PROJECT_DIR"\/\.claude\/hooks\/journal-capture\.mjs$/);
  assert.ok(existsSync(commandPath(cmd)));
});

test('PostToolUse runs the executable eslint hook for file edits', () => {
  const [entry] = settings.hooks.PostToolUse;
  assert.deepEqual(entry.matcher.split('|'), ['Edit', 'Write', 'MultiEdit']);
  const file = commandPath(entry.hooks[0].command);
  assert.ok(file.endsWith('.claude/hooks/post-edit-eslint.sh'));
  assert.ok(statSync(file).mode & 0o111, 'hook must be executable');
});
