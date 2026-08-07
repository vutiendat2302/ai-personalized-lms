import React, { useState } from "react";
import { Copy, Check, Code } from "lucide-react";

interface CodeBlockRendererProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeBlockRenderer: React.FC<CodeBlockRendererProps> = ({
  code,
  language = "javascript",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageLabel = (lang: string) => {
    switch ((lang || "").toLowerCase()) {
      case "java":
        return "☕ Java";
      case "python":
      case "py":
        return "🐍 Python";
      case "sql":
        return "🗄️ SQL";
      case "html":
      case "css":
        return "🌐 HTML / CSS";
      case "json":
        return "📦 JSON";
      case "typescript":
      case "ts":
        return "🔷 TypeScript";
      case "cpp":
      case "c++":
      case "c":
        return "⚙️ C / C++";
      default:
        return "⚡ JavaScript";
    }
  };

  // Syntax highlighter using regex token replacements
  const highlightSyntax = (rawCode: string, lang: string) => {
    if (!rawCode) return "";

    let html = rawCode
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const l = (lang || "").toLowerCase();

    let keywords = [
      "const", "let", "var", "function", "return", "if", "else", "for", "while",
      "import", "export", "from", "default", "class", "extends", "new", "this",
      "async", "await", "try", "catch", "throw", "null", "undefined", "true", "false"
    ];

    if (l === "java") {
      keywords = [
        "public", "private", "protected", "class", "interface", "extends", "implements",
        "static", "final", "void", "int", "double", "float", "boolean", "String", "char",
        "return", "if", "else", "for", "while", "new", "this", "super", "try", "catch",
        "null", "true", "false", "import", "package"
      ];
    } else if (l === "python" || l === "py") {
      keywords = [
        "def", "class", "return", "if", "elif", "else", "for", "while", "in", "import",
        "from", "as", "try", "except", "finally", "with", "lambda", "None", "True", "False",
        "and", "or", "not", "is", "pass", "break", "continue"
      ];
    } else if (l === "sql") {
      keywords = [
        "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON",
        "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "INSERT", "INTO", "VALUES", "UPDATE",
        "SET", "DELETE", "CREATE", "TABLE", "DROP", "ALTER", "AND", "OR", "NOT", "NULL",
        "AS", "COUNT", "SUM", "AVG", "MIN", "MAX"
      ];
    }

    // String literals ("..." or '...' or `...`)
    html = html.replace(/(["'`])(.*?)\1/g, '<span class="text-amber-300 font-semibold">$1$2$1</span>');

    // Single-line Comments (//... or #...)
    html = html.replace(/(\/\/.*$|#.*$)/gm, '<span class="text-gray-500 italic">$1</span>');

    // Keywords highlight
    const kwPattern = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    html = html.replace(kwPattern, '<span class="text-purple-400 font-bold">$1</span>');

    // Numbers
    html = html.replace(/\b(\d+)\b/g, '<span class="text-sky-300 font-medium">$1</span>');

    return html;
  };

  return (
    <div className={`rounded-xl overflow-hidden bg-gray-950 border border-gray-800 shadow-md my-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-300">
        <span className="font-mono font-bold flex items-center gap-1.5 text-emerald-400">
          <Code className="w-3.5 h-3.5" /> {getLanguageLabel(language)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-medium transition cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Đã sao chép!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép mã</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 font-mono text-xs overflow-x-auto leading-relaxed text-gray-100 bg-gray-950">
        <pre dangerouslySetInnerHTML={{ __html: highlightSyntax(code, language) }} />
      </div>
    </div>
  );
};
