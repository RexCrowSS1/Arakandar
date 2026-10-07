import { createElement } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownLink({ href, title, children }) {
  if (!href) return createElement("span", null, children);
  const external = /^https?:\/\//i.test(href);
  return createElement(
    "a",
    {
      href,
      title,
      target: external ? "_blank" : undefined,
      rel: external ? "noopener noreferrer" : undefined,
    },
    children,
  );
}

function MarkdownTable({ children }) {
  return createElement(
    "div",
    {
      className: "chat-markdown-table",
      role: "region",
      "aria-label": "Tabel jawaban AI",
      tabIndex: 0,
    },
    createElement("table", null, children),
  );
}

const components = { a: MarkdownLink, table: MarkdownTable };
const plugins = [remarkGfm];

export function MessageMarkdown({ text, style }) {
  return createElement(
    "div",
    { className: "chat-markdown", style },
    createElement(
      Markdown,
      {
        remarkPlugins: plugins,
        components,
        skipHtml: true,
        disallowedElements: ["img"],
      },
      text,
    ),
  );
}
