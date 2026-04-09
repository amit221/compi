/**
 * ANSI escape code to HTML converter.
 * Used by the HTTP MCP server (Cursor) and MCP Apps.
 */

export const ANSI_TO_CSS: Record<string, string> = {
  "30": "#000", "31": "#ff1744", "32": "#00e676", "33": "#ffea00",
  "34": "#448aff", "35": "#d500f9", "36": "#00e5ff", "37": "#e0e0e0",
  "90": "#9e9e9e", "91": "#ff1744", "92": "#00e676", "93": "#ffea00",
  "94": "#448aff", "95": "#d500f9", "96": "#00e5ff", "97": "#ffffff",
};

export function ansiToHtml(text: string): string {
  let html = "";
  let openSpans = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      const end = text.indexOf("m", i + 2);
      if (end === -1) { html += text[i]; continue; }
      const codes = text.slice(i + 2, end).split(";");
      i = end;
      const styles: string[] = [];
      for (const code of codes) {
        if (code === "0" || code === "") {
          while (openSpans > 0) { html += "</span>"; openSpans--; }
        } else if (code === "1") {
          styles.push("font-weight:bold");
        } else if (code === "2") {
          styles.push("opacity:0.6");
        } else if (ANSI_TO_CSS[code]) {
          styles.push("color:" + ANSI_TO_CSS[code]);
        }
      }
      if (styles.length > 0) {
        html += `<span style="${styles.join(";")}">`;
        openSpans++;
      }
    } else if (text[i] === "<") {
      html += "&lt;";
    } else if (text[i] === ">") {
      html += "&gt;";
    } else if (text[i] === "&") {
      html += "&amp;";
    } else {
      html += text[i];
    }
  }
  while (openSpans > 0) { html += "</span>"; openSpans--; }
  return html;
}

export function buildAppHtml(ansiContent: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;color:#e0e0e0;font-family:'Cascadia Code','Fira Code',Consolas,monospace;font-size:14px;padding:16px;line-height:1.5}
pre{white-space:pre-wrap;word-wrap:break-word}
</style></head><body><pre>${ansiToHtml(ansiContent)}</pre></body></html>`;
}
