import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface FormattedTextProps {
  text: string;
}

export default function FormattedText({ text }: FormattedTextProps) {
  if (!text) return null;

  // Split text by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-slate-200 text-[15px] select-text">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // It's a code block
          const lines = part.split("\n");
          // Extract language if specified, e.g., ```typescript
          let language = lines[0].replace("```", "").trim();
          if (!language) language = "code";

          // Join lines except the first and last (the markdown delimiters)
          const code = lines.slice(1, -1).join("\n");

          return (
            <CodeSnippet key={index} code={code} language={language} />
          );
        } else {
          // It's normal text, format inline bolding, lists, and line breaks
          return (
            <div key={index} className="whitespace-pre-line break-words space-y-1">
              {part.split("\n").map((line, lIdx) => {
                let trimmedLine = line.trim();
                
                // Bullet points
                if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
                  const content = formatInlineStyle(trimmedLine.substring(2));
                  return (
                    <div key={lIdx} className="flex items-start gap-2 ms-4 my-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2.5 flex-shrink-0" />
                      <span className="flex-1">{content}</span>
                    </div>
                  );
                }

                // Header styles
                if (trimmedLine.startsWith("### ")) {
                  return (
                    <h4 key={lIdx} className="text-base font-semibold text-white mt-4 mb-2 border-b border-slate-800 pb-1">
                      {formatInlineStyle(trimmedLine.substring(4))}
                    </h4>
                  );
                }
                if (trimmedLine.startsWith("## ")) {
                  return (
                    <h3 key={lIdx} className="text-lg font-bold text-white mt-5 mb-2.5">
                      {formatInlineStyle(trimmedLine.substring(3))}
                    </h3>
                  );
                }
                if (trimmedLine.startsWith("# ")) {
                  return (
                    <h2 key={lIdx} className="text-xl font-extrabold text-white mt-6 mb-3">
                      {formatInlineStyle(trimmedLine.substring(2))}
                    </h2>
                  );
                }

                // Normal line
                return (
                  <p key={lIdx} className="min-h-[1.2rem]">
                    {formatInlineStyle(line)}
                  </p>
                );
              })}
            </div>
          );
        }
      })}
    </div>
  );
}

// Format inline Bold (**text**)
function formatInlineStyle(text: string): React.ReactNode[] {
  if (!text) return [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-white bg-indigo-500/10 px-1 rounded text-[15px]">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

interface CodeSnippetProps {
  code: string;
  language: string;
  key?: React.Key;
}

function CodeSnippet({ code, language }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  };

  return (
    <div className="my-4 rounded-xl border border-slate-800/80 bg-slate-900/90 overflow-hidden shadow-lg font-mono text-sm max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 border-b border-slate-800/60 text-xs text-slate-400">
        <span className="uppercase text-indigo-400 tracking-wider font-semibold text-[11px]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400 font-sans text-[11px]">تم النسخ!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="font-sans text-[11px]">نسخ</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-slate-100/90 leading-relaxed max-w-full scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <pre><code className="block text-left" style={{ direction: "ltr" }}>{code}</code></pre>
      </div>
    </div>
  );
}
