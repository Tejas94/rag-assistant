/**
 * Turns an MDX or Docusaurus markdown body into plain markdown for chunking:
 *
 * - Fenced code blocks are kept byte for byte. Developers ask about code, and an
 *   `import` line or a <Component> inside a code block is content, not markup.
 * - Outside code: MDX import/export lines, {/* comments *\/} and <!-- comments --> go.
 * - JSX and HTML tags go, but the text between them stays (<AppOnly>, <details>,
 *   <TabItem>...). A tag with an alt, label or title attribute is replaced by that
 *   text, so <Image alt="How streaming works" ... /> leaves "How streaming works".
 * - Inline code is never touched, so "wrap it in `<Suspense>`" survives.
 * - Docusaurus admonitions (:::note ... :::) become a bold label.
 *
 * Next.js marks router-specific text with <AppOnly> and <PagesOnly>. Both are unwrapped,
 * so a Pages Router note can show up in an App Router page's chunks. Dropping
 * <PagesOnly> blocks on app/ pages is a reasonable experiment.
 */
export function cleanMdx(body: string): string {
  const out: string[] = [];
  for (const segment of splitFences(body.replace(/\r\n?/g, "\n"))) {
    out.push(segment.code ? segment.text : cleanProse(segment.text));
  }
  return out
    .join("\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Segment {
  code: boolean;
  text: string;
}

const FENCE_OPEN = /^\s*(`{3,}|~{3,})(.*)$/;

/** Splits markdown into prose and fenced code segments. An unclosed fence runs to the end. */
export function splitFences(text: string): Segment[] {
  const lines = text.split("\n");
  const segments: Segment[] = [];
  let buffer: string[] = [];
  let fence: { char: string; length: number } | null = null;

  const flush = (code: boolean) => {
    if (buffer.length) segments.push({ code, text: buffer.join("\n") });
    buffer = [];
  };

  for (const line of lines) {
    if (!fence) {
      const open = line.match(FENCE_OPEN);
      if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
        flush(false);
        fence = { char: open[1][0], length: open[1].length };
      }
      buffer.push(line);
    } else {
      buffer.push(line);
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) {
        flush(true);
        fence = null;
      }
    }
  }
  flush(fence !== null);
  return segments;
}

const PLACEHOLDER = "\u0000";

function cleanProse(text: string): string {
  // 1. Line-based: MDX import/export statements (they can span lines) and admonitions.
  const kept: string[] = [];
  let depth = 0;
  for (const line of text.split("\n")) {
    if (depth > 0 || /^(import|export)\s/.test(line)) {
      depth = Math.max(0, depth + balance(line));
      continue;
    }
    const admonition = line.match(/^\s*:::\s*([A-Za-z]+)\s*(.*)$/);
    if (admonition) {
      const label = admonition[1].charAt(0).toUpperCase() + admonition[1].slice(1);
      kept.push(`**${label}:**${admonition[2] ? ` ${admonition[2]}` : ""}`);
      continue;
    }
    if (/^\s*:::\s*$/.test(line)) {
      kept.push("");
      continue;
    }
    kept.push(line);
  }

  // 2. Protect inline code spans (single line) from everything below.
  const code: string[] = [];
  let prose = kept.join("\n").replace(/(`+)([^`\n]|[^`\n][^\n]*?[^`\n])\1(?!`)/g, (span) => {
    code.push(span);
    return `${PLACEHOLDER}${code.length - 1}${PLACEHOLDER}`;
  });

  // 3. Comments, autolinks, then tags.
  prose = prose
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(https?:\/\/[^\s>]+)>/g, "$1");
  prose = stripTags(prose);

  // 4. Lines that only held a tag become blank; restore inline code.
  prose = prose
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : line))
    .join("\n")
    .replace(new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, "g"), (_m, i: string) => code[Number(i)]);
  return prose;
}

/** Net count of opening minus closing brackets, for multi-line export statements. */
function balance(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === "{" || ch === "(" || ch === "[") n++;
    else if (ch === "}" || ch === ")" || ch === "]") n--;
  }
  return n;
}

/** Removes <Tag ...>, </Tag> and <Tag ... /> (multi-line, with {expressions} and quoted values). */
function stripTags(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, lt);
    const end = /^<\/?[A-Za-z]/.test(text.slice(lt, lt + 3)) ? tagEnd(text, lt) : -1;
    if (end === -1) {
      out += "<";
      i = lt + 1;
      continue;
    }
    const tag = text.slice(lt, end + 1);
    const attr = tag.match(/\s(?:alt|label|title)=(?:"([^"]*)"|'([^']*)'|\{\s*["'`]([^"'`]*)["'`]\s*\})/);
    out += attr ? (attr[1] ?? attr[2] ?? attr[3] ?? "") : "";
    i = end + 1;
  }
  return out;
}

/** Index of the ">" that closes the tag starting at `start`, skipping quotes and {braces}. -1 if none. */
function tagEnd(text: string, start: number): number {
  let quote: string | null = null;
  let braces = 0;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      // Quotes only count inside the tag's attributes, not in an apostrophe in prose.
      if (braces > 0 || /=\s*$/.test(text.slice(Math.max(start, i - 3), i))) quote = ch;
    } else if (ch === "{") braces++;
    else if (ch === "}") braces = Math.max(0, braces - 1);
    else if (ch === ">" && braces === 0) return i;
    else if (ch === "<" && braces === 0) return -1; // "a <b and <c>" is prose, not a tag
  }
  return -1;
}
