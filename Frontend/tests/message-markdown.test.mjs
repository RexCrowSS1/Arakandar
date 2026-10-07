import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageMarkdown } from "../features/website-page-ui/message-markdown.mjs";

const render = (text) =>
  renderToStaticMarkup(createElement(MessageMarkdown, { text }));

test("AI analysis renders headings, emphasis, paragraphs, and nested lists", () => {
  const html = render(`Certainly! Here is the analysis.

### Step 1: Identify Support Levels
Support levels are areas where the price tends to find support.

- **Current Support Level**: around 6136.191.
- *Confirmation*: monitor price action.
  1. Check the recent lows.
  2. Review the volume.

### Conclusion
The analysis requires more data.`);
  assert.match(html, /<h3>Step 1: Identify Support Levels<\/h3>/);
  assert.match(
    html,
    /<li><strong>Current Support Level<\/strong>: around 6136.191\.<\/li>/,
  );
  assert.match(html, /<em>Confirmation<\/em>/);
  assert.match(html, /<ol>[\s\S]*Check the recent lows/);
  assert.match(
    html,
    /<h3>Conclusion<\/h3>\s*<p>The analysis requires more data\.<\/p>/,
  );
  assert.doesNotMatch(html, /###|\*\*Current Support/);
});

test("GFM tables, quotes, code, strikethrough, and task lists retain their meaning", () => {
  const html = render(`> Data tertunda.

| Level | Harga |
| --- | ---: |
| Support | 6136.191 |

~~Lama~~ Gunakan \`close\`.

- [x] Data tersedia

\`\`\`js
const label = "<script>example</script>";
\`\`\``);
  assert.match(html, /<blockquote>\s*<p>Data tertunda\.<\/p>/);
  assert.match(html, /class="chat-markdown-table"[^>]*tabindex="0"/);
  assert.match(html, /<table>[\s\S]*<th>Level<\/th>[\s\S]*6136.191/);
  assert.match(html, /<del>Lama<\/del>/);
  assert.match(html, /<code>close<\/code>/);
  assert.match(html, /type="checkbox"[^>]*disabled=""[^>]*checked=""/);
  assert.match(
    html,
    /<pre><code class="language-js">const label = &quot;&lt;script&gt;/,
  );
  assert.doesNotMatch(html, /<script>/);
});

test("model output cannot execute HTML or javascript links", () => {
  const html = render(`<script>alert(1)</script>

<img src=x onerror="alert(1)">

[Unsafe](javascript:alert%281%29)

[Data](data:text/html,malicious)

![Remote image](https://example.com/tracking.png)

[Sumber](https://example.com/analysis)`);
  assert.doesNotMatch(
    html,
    /<script|<img|onerror|href="javascript:|href="data:|tracking\.png/,
  );
  assert.match(html, /<span>Unsafe<\/span>/);
  assert.match(
    html,
    /href="https:\/\/example.com\/analysis" target="_blank" rel="noopener noreferrer"/,
  );
});
