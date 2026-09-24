"use client";

/*
  Render teks soal yang bisa mengandung:
  - Rumus LaTeX:  $...$ (inline) dan $$...$$ (blok)  → KaTeX
  - Kode/log:     blok ```...``` dan `inline code`
  Aman: bila parsing/KaTeX gagal, jatuh ke teks polos.
*/

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface RichTextProps {
  children: string;
  className?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMath(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: "html",
    });
  } catch {
    const d = display ? "$$" : "$";
    return escapeHtml(d + tex + d);
  }
}

function toHtml(input: string): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };

  let s = input;

  // 1) Blok kode ```lang\n...```
  s = s.replace(/```[a-zA-Z0-9]*\n?([\s\S]*?)```/g, (_m, code) =>
    stash(
      `<pre class="rt-pre"><code>${escapeHtml(String(code).replace(/\n$/, ""))}</code></pre>`
    )
  );

  // 2) Math blok $$...$$
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) =>
    stash(renderMath(String(tex).trim(), true))
  );

  // 3) Inline code `...`
  s = s.replace(/`([^`\n]+?)`/g, (_m, code) =>
    stash(`<code class="rt-code">${escapeHtml(String(code))}</code>`)
  );

  // 4) Math inline $...$ (hindari cocok dengan $ tunggal / harga)
  s = s.replace(/\$([^$\n]+?)\$/g, (_m, tex) =>
    stash(renderMath(String(tex).trim(), false))
  );

  // 5) Escape sisa teks, lalu kembalikan token.
  s = escapeHtml(s);
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i) => tokens[Number(i)] ?? "");
  return s;
}

export function RichText({ children, className = "" }: RichTextProps) {
  const html = useMemo(() => {
    try {
      return toHtml(children ?? "");
    } catch {
      return escapeHtml(children ?? "");
    }
  }, [children]);

  return (
    <span
      className={`rt ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
