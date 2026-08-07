import React from "react";
import { MathRenderer } from "./MathRenderer";
import { CodeBlockRenderer } from "./CodeBlockRenderer";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Split content by block separators (double linebreaks or math blocks)
  const renderMarkdownContent = (rawText: string) => {
    // Check if rawText is JSON blocks array (backwards compatibility)
    if (rawText.trim().startsWith("[")) {
      try {
        const blocks = JSON.parse(rawText);
        if (Array.isArray(blocks)) {
          return blocks.map((b: any, idx: number) => (
            <div key={b.id || idx} className="my-2">
              {b.type === "heading" && (
                <h3 className={`font-bold text-foreground border-b border-border/40 pb-1 mt-4 ${
                  b.level === 1 ? "text-2xl" : b.level === 2 ? "text-xl" : "text-lg"
                } ${b.align === "center" ? "text-center" : b.align === "right" ? "text-right" : b.align === "justify" ? "text-justify" : "text-left"}`}>
                  {b.content}
                </h3>
              )}
              {b.type === "paragraph" && (
                <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap ${
                  b.align === "center" ? "text-center" : b.align === "right" ? "text-right" : b.align === "justify" ? "text-justify" : "text-left"
                }`}>
                  {b.content}
                </p>
              )}
              {b.type === "math" && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-sm text-amber-950 flex items-center justify-center my-3 shadow-2xs">
                  <MathRenderer math={b.content} displayMode={true} />
                </div>
              )}
              {b.type === "code" && (
                <div className="bg-gray-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner my-2">
                  <pre>{b.content}</pre>
                </div>
              )}
              {b.type === "callout" && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-950 font-medium my-2">
                  {b.content}
                </div>
              )}
            </div>
          ));
        }
      } catch (e) {}
    }

    // Process standard Markdown string line by line / block by block
    const lines = rawText.split("\n");
    const elements: React.ReactNode[] = [];

    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = "";

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Code blocks ```
      if (trimmed.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <CodeBlockRenderer key={`code_${index}`} code={codeBuffer.join("\n")} language={codeLang} />
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = trimmed.substring(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      // Math blocks $$ ... $$ or \[ ... \]
      if ((trimmed.startsWith("$$") && trimmed.endsWith("$$")) || (trimmed.startsWith("\\[") && trimmed.endsWith("\\]"))) {
        let mathStr = trimmed;
        if (trimmed.startsWith("$$")) mathStr = trimmed.substring(2, trimmed.length - 2);
        if (trimmed.startsWith("\\[")) mathStr = trimmed.substring(2, trimmed.length - 2);
        elements.push(
          <div key={`math_${index}`} className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl text-sm text-amber-950 flex items-center justify-center my-3 shadow-2xs">
            <MathRenderer math={mathStr} displayMode={true} />
          </div>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={`blank_${index}`} className="h-2" />);
        return;
      }

      // Standard Markdown Headings: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
      const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        if (level === 1) {
          elements.push(<h1 key={`h_${index}`} className="text-3xl font-extrabold text-foreground border-b border-border/40 pb-2 mt-6 mb-3">{parseInline(headingText)}</h1>);
          return;
        }
        if (level === 2) {
          elements.push(<h2 key={`h_${index}`} className="text-2xl font-bold text-foreground border-b border-border/40 pb-1 mt-5 mb-2">{parseInline(headingText)}</h2>);
          return;
        }
        if (level === 3) {
          elements.push(<h3 key={`h_${index}`} className="text-xl font-bold text-foreground mt-4 mb-2">{parseInline(headingText)}</h3>);
          return;
        }
        if (level === 4) {
          elements.push(<h4 key={`h_${index}`} className="text-lg font-bold text-foreground mt-3 mb-1">{parseInline(headingText)}</h4>);
          return;
        }
        if (level === 5) {
          elements.push(<h5 key={`h_${index}`} className="text-base font-semibold text-foreground mt-2 mb-1">{parseInline(headingText)}</h5>);
          return;
        }
        elements.push(<h6 key={`h_${index}`} className="text-sm font-semibold text-foreground mt-2 mb-1">{parseInline(headingText)}</h6>);
        return;
      }

      // Blockquotes >
      if (trimmed.startsWith("> ")) {
        elements.push(
          <blockquote key={`quote_${index}`} className="p-3 bg-amber-50/50 border-l-4 border-amber-400 text-amber-950 italic text-xs rounded-r-lg my-2">
            {parseInline(trimmed.substring(2))}
          </blockquote>
        );
        return;
      }

      // Unordered lists - or *
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        elements.push(
          <li key={`li_${index}`} className="text-sm text-foreground ml-6 list-disc my-1">
            {parseInline(trimmed.substring(2))}
          </li>
        );
        return;
      }

      // Images ![alt](url)
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imgMatch) {
        elements.push(
          <div key={`img_${index}`} className="my-3 text-center">
            <img src={imgMatch[2]} alt={imgMatch[1]} className="max-h-96 mx-auto rounded-xl shadow-xs border border-border/40" />
            {imgMatch[1] && <p className="text-xs text-muted-foreground italic mt-1">{imgMatch[1]}</p>}
          </div>
        );
        return;
      }

      // Paragraph
      elements.push(
        <p key={`p_${index}`} className="text-sm text-foreground leading-relaxed whitespace-pre-wrap my-1">
          {parseInline(line)}
        </p>
      );
    });

    return elements;
  };

  // Helper for inline Markdown elements (**bold**, *italic*, <u>underline</u>, ~~strikethrough~~, `code`, $math$, [link](url))
  const parseInline = (text: string): React.ReactNode => {
    if (!text) return "";

    // Replace bold, italic, strikethrough, underline, highlight, inline math
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del>$1</del>")
      .replace(/`(.*?)`/g, "<code class='bg-muted px-1.5 py-0.5 rounded font-mono text-xs text-primary'>$1</code>");

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return <div className={`markdown-body space-y-2 ${className}`}>{renderMarkdownContent(content)}</div>;
};
