import { ansiToHtml, buildAppHtml } from "../../src/renderers/ansi-to-html";

describe("ansiToHtml", () => {
  it("converts basic foreground color codes to HTML spans", () => {
    const input = "\x1b[31mred text\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe('<span style="color:#ff1744">red text</span>');
  });

  it("converts bold (code 1)", () => {
    const input = "\x1b[1mbold\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe('<span style="font-weight:bold">bold</span>');
  });

  it("converts dim (code 2)", () => {
    const input = "\x1b[2mdim\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe('<span style="opacity:0.6">dim</span>');
  });

  it("closes all open spans on reset (code 0)", () => {
    const input = "\x1b[1m\x1b[31mnested\x1b[0m after";
    const result = ansiToHtml(input);
    expect(result).toBe(
      '<span style="font-weight:bold"><span style="color:#ff1744">nested</span></span> after'
    );
  });

  it("escapes XML special characters (<, >, &)", () => {
    const input = "<div> & 'quotes' > less";
    const result = ansiToHtml(input);
    expect(result).toBe("&lt;div&gt; &amp; 'quotes' &gt; less");
  });

  it("passes through plain text with no ANSI codes", () => {
    const input = "hello world";
    const result = ansiToHtml(input);
    expect(result).toBe("hello world");
  });

  it("handles multiple sequential styles", () => {
    const input = "\x1b[32mgreen\x1b[0m \x1b[34mblue\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe(
      '<span style="color:#00e676">green</span> <span style="color:#448aff">blue</span>'
    );
  });

  it("handles combined codes in a single escape (e.g. bold+color)", () => {
    const input = "\x1b[1;33mbold yellow\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe(
      '<span style="font-weight:bold;color:#ffea00">bold yellow</span>'
    );
  });

  it("closes unclosed spans at end of string", () => {
    const input = "\x1b[31mno reset";
    const result = ansiToHtml(input);
    expect(result).toBe('<span style="color:#ff1744">no reset</span>');
  });

  it("handles bright color codes (90-97)", () => {
    const input = "\x1b[97mbright white\x1b[0m";
    const result = ansiToHtml(input);
    expect(result).toBe('<span style="color:#ffffff">bright white</span>');
  });
});

describe("buildAppHtml", () => {
  it("wraps ANSI content in a full HTML document", () => {
    const result = buildAppHtml("hello");
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<pre>hello</pre>");
    expect(result).toContain("background:#000");
  });

  it("converts ANSI codes inside the HTML wrapper", () => {
    const result = buildAppHtml("\x1b[31mred\x1b[0m");
    expect(result).toContain('<span style="color:#ff1744">red</span>');
  });
});
