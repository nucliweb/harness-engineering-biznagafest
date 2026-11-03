// Tiny markdown helpers shared by the artefact validators. Node built-ins only.

const FENCE = /^\s*```/;

function eachLineOutsideFences(md, fn) {
  const lines = md.split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) fn(line, i);
  });
}

export function readTitle(md) {
  let title = null;
  eachLineOutsideFences(md, (line) => {
    if (title === null) {
      const m = /^# (.+?)\s*$/.exec(line);
      if (m) title = m[1];
    }
  });
  return title;
}

// Splits a document by headings of the given level. Returns [{ heading, body, line }]
// where `line` is the 1-based line of the heading.
export function splitSections(md, level = 2) {
  const marker = new RegExp(`^${'#'.repeat(level)} (.+?)\\s*$`);
  const lines = md.split('\n');
  const heads = [];
  eachLineOutsideFences(md, (line, i) => {
    const m = marker.exec(line);
    if (m) heads.push({ heading: m[1], index: i });
  });
  return heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].index : lines.length;
    return {
      heading: h.heading,
      body: lines.slice(h.index + 1, end).join('\n'),
      line: h.index + 1,
    };
  });
}

// Reads bullet items outside fences. `checked` is null for plain bullets.
export function readListItems(body) {
  const items = [];
  eachLineOutsideFences(body, (line) => {
    const m = /^\s*[-*]\s+(?:\[([ xX])\]\s+)?(.*?)\s*$/.exec(line);
    if (m) {
      items.push({
        text: m[2],
        checked: m[1] === undefined ? null : m[1].toLowerCase() === 'x',
      });
    }
  });
  return items;
}

export function readFencedBlocks(body) {
  const blocks = [];
  let current = null;
  for (const line of body.split('\n')) {
    const m = /^\s*```\s*(\S*)\s*$/.exec(line);
    if (m && current === null) {
      current = { lang: m[1], lines: [] };
    } else if (FENCE.test(line) && current !== null) {
      blocks.push({ lang: current.lang, content: current.lines.join('\n') });
      current = null;
    } else if (current !== null) {
      current.lines.push(line);
    }
  }
  return blocks;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

// Reads the first pipe table outside fences: { headers, rows } or null.
export function readTable(body) {
  const lines = [];
  eachLineOutsideFences(body, (line) => lines.push(line));
  for (let i = 0; i + 1 < lines.length; i++) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const headers = splitRow(lines[i]);
      const rows = [];
      for (let j = i + 2; j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j]); j++) {
        rows.push(splitRow(lines[j]));
      }
      return { headers, rows };
    }
  }
  return null;
}

export function isBlank(body) {
  return body.trim() === '';
}
