import { wrapPage, RARITY_HEX, RARITY_NAMES, rarityHex, BASE_CSS, RESULT_AUTO_DISMISS_SCRIPT } from "../../src/renderers/html-templates";

describe("html-templates", () => {
  describe("RARITY_HEX", () => {
    it("has 8 entries", () => {
      expect(RARITY_HEX).toHaveLength(8);
    });

    it("common is grey", () => {
      expect(RARITY_HEX[0]).toBe("#9e9e9e");
    });

    it("mythic is red", () => {
      expect(RARITY_HEX[7]).toBe("#ff1744");
    });
  });

  describe("RARITY_NAMES", () => {
    it("has 8 entries", () => {
      expect(RARITY_NAMES).toHaveLength(8);
    });

    it("maps correctly", () => {
      expect(RARITY_NAMES[0]).toBe("Common");
      expect(RARITY_NAMES[7]).toBe("Mythic");
    });
  });

  describe("rarityHex", () => {
    it("returns correct hex for valid rarity", () => {
      expect(rarityHex(2)).toBe("#00e676");
    });

    it("returns grey for out-of-range rarity", () => {
      expect(rarityHex(99)).toBe("#9e9e9e");
    });
  });

  describe("wrapPage", () => {
    it("returns a full HTML document", () => {
      const html = wrapPage("<p>hello</p>", { sidecarPort: null });
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<p>hello</p>");
    });

    it("includes base CSS", () => {
      const html = wrapPage("", { sidecarPort: null });
      expect(html).toContain("--bg-primary");
      expect(html).toContain("--bg-card");
      expect(html).toContain(".game-card");
      expect(html).toContain("@keyframes cardDeal");
    });

    it("does not include sidecar script when port is null", () => {
      const html = wrapPage("", { sidecarPort: null });
      expect(html).not.toContain("SIDECAR_PORT");
      expect(html).not.toContain("pickCard");
    });

    it("includes sidecar script with correct port when provided", () => {
      const html = wrapPage("", { sidecarPort: 9123 });
      expect(html).toContain("SIDECAR_PORT = 9123");
      expect(html).toContain("pickCard");
      expect(html).toContain("skipTurn");
    });
  });

  describe("BASE_CSS", () => {
    it("includes key CSS variables", () => {
      expect(BASE_CSS).toContain("--bg-primary: #080810");
      expect(BASE_CSS).toContain("--accent: #7c5cff");
      expect(BASE_CSS).toContain("--font-mono");
    });

    it("includes card styles", () => {
      expect(BASE_CSS).toContain(".game-card");
      expect(BASE_CSS).toContain(".breed-card-big");
      expect(BASE_CSS).toContain(".collection-grid");
    });

    it("includes animation keyframes", () => {
      expect(BASE_CSS).toContain("@keyframes cardDeal");
      expect(BASE_CSS).toContain("@keyframes heartbeat");
      expect(BASE_CSS).toContain("@keyframes shake");
      expect(BASE_CSS).toContain("@keyframes cardShine");
      expect(BASE_CSS).toContain("@keyframes dotGlow");
    });
  });

  describe("RESULT_AUTO_DISMISS_SCRIPT", () => {
    it("contains dismiss logic", () => {
      expect(RESULT_AUTO_DISMISS_SCRIPT).toContain("result-overlay");
      expect(RESULT_AUTO_DISMISS_SCRIPT).toContain("next-draw-content");
      expect(RESULT_AUTO_DISMISS_SCRIPT).toContain("setTimeout");
    });
  });
});
