/**
 * HTML/CSS/JS templates for the Cursor MCP App iframe renderer.
 * Terminal hacker aesthetic meets polished game UI — compact, animated, glowing.
 */

// --- Rarity color hex values (index 0-7) ---
export const RARITY_HEX = [
  "#9e9e9e", // 0 Common (grey)
  "#ffffff", // 1 Uncommon (white)
  "#00e676", // 2 Rare (green)
  "#00e5ff", // 3 Superior (cyan)
  "#448aff", // 4 Elite (blue)
  "#d500f9", // 5 Epic (magenta)
  "#ffea00", // 6 Legendary (yellow)
  "#ff1744", // 7 Mythic (red)
];

export const RARITY_NAMES = [
  "Common", "Uncommon", "Rare", "Superior",
  "Elite", "Epic", "Legendary", "Mythic",
];

export function rarityHex(rarity: number): string {
  return RARITY_HEX[rarity] ?? RARITY_HEX[0];
}

// --- CSS ---

export const BASE_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg-primary: #080810;
  --bg-secondary: #0c0c18;
  --bg-card: #111122;
  --bg-card-hover: #181830;
  --border-card: #1e1e3a;
  --border-card-hover: #3a3a6e;
  --text-primary: #d8d8f0;
  --text-secondary: #7878a0;
  --text-dim: #4a4a6a;
  --accent: #7c5cff;
  --accent-glow: rgba(124, 92, 255, 0.35);
  --success: #00e676;
  --danger: #ff1744;
  --warning: #ffea00;
  --energy-color: #ffcc00;
  --font-mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace;
}

html, body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
  overflow-x: hidden;
}

body {
  padding: 8px 10px;
  position: relative;
}

/* CRT scanline overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.08) 2px,
    rgba(0, 0, 0, 0.08) 4px
  );
  pointer-events: none;
  z-index: 1000;
}

/* Subtle vignette */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.6) 100%);
  pointer-events: none;
  z-index: 999;
}

/* --- Status HUD --- */
.status-hud {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: linear-gradient(90deg, rgba(124, 92, 255, 0.06), transparent);
  border: 1px solid var(--border-card);
  border-left: 2px solid var(--accent);
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 10px;
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.hud-label {
  color: var(--text-dim);
  text-transform: uppercase;
  font-size: 9px;
  letter-spacing: 1px;
}

.hud-value {
  color: var(--text-primary);
  font-weight: bold;
}

/* Progress bars */
.bar-track {
  width: 50px;
  height: 4px;
  background: #0e0e1e;
  border-radius: 2px;
  overflow: hidden;
  position: relative;
  border: 1px solid #1a1a30;
}

.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.bar-fill.energy {
  background: linear-gradient(90deg, #cc8800, #ffcc00);
  box-shadow: 0 0 8px rgba(255, 204, 0, 0.4);
}

.bar-fill.xp {
  background: linear-gradient(90deg, #5c3cff, #9c7cff);
  box-shadow: 0 0 8px rgba(124, 92, 255, 0.4);
}

/* Animated energy pulse */
.bar-fill.energy::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: #fff;
  border-radius: 2px;
  animation: barPulse 2s ease infinite;
}

/* --- Card container --- */
.card-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 8px 0;
}

/* --- Game card (catch) --- */
.game-card {
  width: 165px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  animation: cardDeal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
  transform: translateY(40px) rotateX(10deg);
}

.game-card:nth-child(1) { animation-delay: 0s; }
.game-card:nth-child(2) { animation-delay: 0.12s; }
.game-card:nth-child(3) { animation-delay: 0.24s; }

/* Rarity glow border on hover */
.game-card:hover {
  border-color: var(--border-card-hover);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 15px var(--accent-glow);
}

/* Animated shine sweep across card */
.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
  z-index: 1;
  animation: cardShine 3s ease-in-out infinite;
}

.game-card:nth-child(2)::before { animation-delay: 1s; }
.game-card:nth-child(3)::before { animation-delay: 2s; }

.card-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  z-index: 2;
  box-shadow: 0 0 10px var(--accent-glow);
  animation: badgePulse 2s ease infinite;
}

.card-type-banner {
  padding: 3px 8px;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--text-dim);
  border-bottom: 1px solid var(--border-card);
  background: linear-gradient(90deg, rgba(124, 92, 255, 0.05), transparent);
}

.card-art {
  padding: 6px 8px;
  display: flex;
  justify-content: center;
}

.card-art pre {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.2;
  white-space: pre;
  text-shadow: 0 0 8px currentColor;
}

.card-name {
  padding: 2px 8px;
  font-weight: bold;
  font-size: 12px;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.1);
}

.card-traits {
  padding: 4px 8px;
  border-top: 1px solid var(--border-card);
}

.trait-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 1px 0;
  font-size: 10px;
  animation: traitFade 0.3s ease forwards;
  opacity: 0;
}

.trait-row:nth-child(1) { animation-delay: 0.4s; }
.trait-row:nth-child(2) { animation-delay: 0.5s; }
.trait-row:nth-child(3) { animation-delay: 0.6s; }
.trait-row:nth-child(4) { animation-delay: 0.7s; }

.trait-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor, 0 0 12px currentColor;
  animation: dotGlow 2s ease infinite alternate;
}

.trait-name { color: var(--text-primary); font-size: 10px; }
.trait-rarity { color: var(--text-secondary); font-size: 9px; margin-left: auto; }

.card-footer {
  padding: 4px 8px 6px;
  border-top: 1px solid var(--border-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  background: linear-gradient(0deg, rgba(124, 92, 255, 0.03), transparent);
}

.card-energy {
  color: var(--energy-color);
  font-weight: bold;
  text-shadow: 0 0 6px rgba(255, 204, 0, 0.3);
}

.card-rate { color: var(--text-secondary); }
.card-rate-high { color: var(--success); text-shadow: 0 0 6px rgba(0, 230, 118, 0.3); }
.card-rate-low { color: var(--danger); text-shadow: 0 0 6px rgba(255, 23, 68, 0.3); }

/* --- Breed card (big) --- */
.breed-card-big {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 8px;
  overflow: hidden;
  margin: 0 auto;
  animation: cardDeal 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
  position: relative;
}

.breed-card-big::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 107, 157, 0.04), transparent);
  z-index: 1;
  animation: cardShine 4s ease-in-out infinite;
}

.breed-title {
  text-align: center;
  padding: 6px;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #ff6b9d;
  border-bottom: 1px solid var(--border-card);
  background: linear-gradient(90deg, transparent, rgba(255, 107, 157, 0.06), transparent);
  text-shadow: 0 0 12px rgba(255, 107, 157, 0.4);
}

.breed-parents {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 8px;
}

.breed-parent { text-align: center; }

.breed-parent pre {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.2;
  white-space: pre;
  text-shadow: 0 0 8px currentColor;
}

.breed-parent-name {
  font-weight: bold;
  margin-top: 2px;
  font-size: 11px;
}

.breed-heart {
  font-size: 20px;
  color: #ff6b9d;
  animation: heartbeat 1.5s ease infinite;
  text-shadow: 0 0 16px rgba(255, 107, 157, 0.6);
  filter: drop-shadow(0 0 8px rgba(255, 107, 157, 0.4));
}

.breed-slots {
  padding: 4px 10px;
  border-top: 1px solid var(--border-card);
}

.breed-slot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  font-size: 10px;
}

.breed-slot-label { color: var(--text-secondary); width: 50px; }
.breed-slot-match { color: var(--success); font-weight: bold; text-shadow: 0 0 6px rgba(0, 230, 118, 0.3); }
.breed-slot-nomatch { color: var(--text-dim); }

.breed-actions {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--border-card);
}

.breed-btn {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-card);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: center;
  cursor: default;
  transition: all 0.2s;
}

.breed-btn.primary {
  background: linear-gradient(135deg, var(--accent), #6a4ae0);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 0 12px var(--accent-glow);
  animation: btnGlow 2s ease infinite;
}

/* --- Prompt hint --- */
.prompt-hint {
  text-align: center;
  margin-top: 6px;
  padding: 4px;
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 1px;
  animation: fadeInSlow 1s ease forwards;
  opacity: 0;
  animation-delay: 0.8s;
}

.prompt-hint kbd {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 10px;
  margin: 0 2px;
  box-shadow: 0 0 6px var(--accent-glow);
}

/* --- Result overlay --- */
.result-overlay {
  position: relative;
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  text-align: center;
  overflow: hidden;
  transition: opacity 0.5s ease;
}

.result-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
}

.result-overlay > * { position: relative; z-index: 1; }

.result-overlay.catch-success {
  background: linear-gradient(135deg, rgba(0, 230, 118, 0.08), rgba(0, 230, 118, 0.02));
  border: 1px solid rgba(0, 230, 118, 0.25);
  animation: successPulse 0.6s ease;
}

.result-overlay.catch-success::before {
  background: radial-gradient(circle at center, rgba(0, 230, 118, 0.1) 0%, transparent 70%);
  animation: resultGlow 1.5s ease infinite;
}

.result-overlay.catch-fail {
  background: linear-gradient(135deg, rgba(255, 23, 68, 0.08), rgba(255, 23, 68, 0.02));
  border: 1px solid rgba(255, 23, 68, 0.25);
  animation: shake 0.5s ease;
}

.result-overlay.catch-escaped {
  background: linear-gradient(135deg, rgba(255, 234, 0, 0.08), rgba(255, 234, 0, 0.02));
  border: 1px solid rgba(255, 234, 0, 0.25);
  animation: shake 0.5s ease;
}

.result-overlay.breed-success {
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.08), rgba(255, 107, 157, 0.04));
  border: 1px solid rgba(124, 92, 255, 0.25);
  animation: successPulse 0.6s ease;
}

.result-overlay.breed-success::before {
  background: radial-gradient(circle at center, rgba(124, 92, 255, 0.1) 0%, transparent 70%);
  animation: resultGlow 1.5s ease infinite;
}

.result-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
  letter-spacing: 2px;
}

.result-title.success-text {
  color: var(--success);
  text-shadow: 0 0 20px rgba(0, 230, 118, 0.5);
  animation: titleGlow 1s ease infinite alternate;
}

.result-title.fail-text {
  color: var(--danger);
  text-shadow: 0 0 12px rgba(255, 23, 68, 0.4);
}

.result-title.escaped-text {
  color: var(--warning);
  text-shadow: 0 0 12px rgba(255, 234, 0, 0.4);
}

.result-title.breed-text {
  color: var(--accent);
  text-shadow: 0 0 20px var(--accent-glow);
  animation: titleGlow 1s ease infinite alternate;
}

.result-title.hybrid-text {
  background: linear-gradient(90deg, #ff6b9d, #ffea00, #00e5ff, #d500f9);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbowShift 2s ease infinite;
}

.result-subtitle {
  color: var(--text-secondary);
  font-size: 10px;
  margin-bottom: 6px;
}

.result-xp {
  color: var(--success);
  font-size: 11px;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 230, 118, 0.3);
}

.result-creature-name {
  font-weight: bold;
  font-size: 13px;
  margin: 4px 0;
}

.result-creature-art pre {
  text-shadow: 0 0 12px currentColor;
  animation: artReveal 0.5s ease forwards;
}

.upgrade-arrow {
  color: var(--warning);
  font-weight: bold;
  text-shadow: 0 0 6px rgba(255, 234, 0, 0.5);
  animation: upgradeFlash 0.8s ease 3;
}

/* --- Collection grid --- */
.collection-header {
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-size: 10px;
  border-left: 2px solid var(--accent);
  padding-left: 8px;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}

.collection-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 6px;
  padding: 6px;
  animation: cardDeal 0.3s ease forwards;
  opacity: 0;
}

.collection-card:hover {
  border-color: var(--border-card-hover);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.collection-card pre {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.2;
  white-space: pre;
  text-align: center;
  margin-bottom: 4px;
  text-shadow: 0 0 6px currentColor;
}

.collection-name {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 1px;
}

.collection-species {
  color: var(--text-dim);
  font-size: 9px;
  margin-bottom: 4px;
}

.collection-traits { font-size: 9px; }

/* --- Empty / no energy states --- */
.empty-state {
  text-align: center;
  padding: 24px 12px;
  color: var(--text-secondary);
}

.empty-state-icon {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.3;
  animation: float 3s ease infinite;
}

.empty-state-text { font-size: 11px; }

/* ============================================
   ANIMATIONS — the juicy stuff
   ============================================ */

@keyframes cardDeal {
  from {
    opacity: 0;
    transform: translateY(40px) rotateX(15deg) scale(0.9);
    filter: blur(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0) scale(1);
    filter: blur(0);
  }
}

@keyframes cardShine {
  0%, 100% { left: -100%; }
  50% { left: 200%; }
}

@keyframes traitFade {
  from { opacity: 0; transform: translateX(-6px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes dotGlow {
  from { box-shadow: 0 0 4px currentColor; }
  to { box-shadow: 0 0 8px currentColor, 0 0 16px currentColor; }
}

@keyframes badgePulse {
  0%, 100% { box-shadow: 0 0 6px var(--accent-glow); }
  50% { box-shadow: 0 0 14px var(--accent-glow), 0 0 20px var(--accent-glow); }
}

@keyframes barPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes btnGlow {
  0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
  50% { box-shadow: 0 0 18px var(--accent-glow), 0 0 30px rgba(124, 92, 255, 0.15); }
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  10% { transform: scale(1.2); }
  20% { transform: scale(1); }
  30% { transform: scale(1.15); }
  40% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(-6px) rotate(-1deg); }
  30% { transform: translateX(6px) rotate(1deg); }
  45% { transform: translateX(-4px) rotate(-0.5deg); }
  60% { transform: translateX(4px) rotate(0.5deg); }
  75% { transform: translateX(-2px); }
}

@keyframes successPulse {
  0% { transform: scale(0.95); opacity: 0; }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes resultGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

@keyframes titleGlow {
  from { filter: brightness(1); }
  to { filter: brightness(1.3); }
}

@keyframes rainbowShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes artReveal {
  from { opacity: 0; transform: scale(0.8); filter: blur(4px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}

@keyframes upgradeFlash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; transform: scale(1.3); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes fadeInSlow {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; transform: translateY(-8px); }
}

.anim-burst { animation: successPulse 0.5s ease; }
.anim-shake { animation: shake 0.5s ease; }
`;

// --- Auto-dismiss script for result overlay ---

export const RESULT_AUTO_DISMISS_SCRIPT = `
<script>
(function() {
  var overlay = document.querySelector('.result-overlay');
  var nextContent = document.querySelector('.next-draw-content');
  if (overlay && nextContent) {
    nextContent.style.opacity = '0.3';
    setTimeout(function() {
      overlay.style.animation = 'fadeOut 0.5s ease forwards';
      nextContent.style.transition = 'opacity 0.5s ease';
      nextContent.style.opacity = '1';
      setTimeout(function() {
        overlay.style.display = 'none';
      }, 500);
    }, 2500);
  }
})();
</script>`;

// --- Sidecar JS (enables click-to-play when sidecar is running) ---

function sidecarScript(port: number): string {
  return `
<script>
const SIDECAR_PORT = ${port};
const SIDECAR_URL = "http://127.0.0.1:" + SIDECAR_PORT;

async function pickCard(choice) {
  document.querySelectorAll('.game-card,.breed-card-big').forEach(function(c) {
    if (c.dataset.choice !== choice) c.classList.add('dimmed');
  });
  try {
    var res = await fetch(SIDECAR_URL + "/action?choice=" + choice);
    if (res.ok) {
      var html = await res.text();
      document.open();
      document.write(html);
      document.close();
    }
  } catch (e) {
    console.warn("Sidecar unreachable:", e);
    // Remove dimming so user can still see cards and reply in chat
    document.querySelectorAll('.dimmed').forEach(function(c) { c.classList.remove('dimmed'); });
  }
}

async function skipTurn() {
  try {
    var res = await fetch(SIDECAR_URL + "/action?choice=s");
    if (res.ok) {
      var html = await res.text();
      document.open();
      document.write(html);
      document.close();
    }
  } catch (e) {
    console.warn("Sidecar unreachable:", e);
  }
}
</script>`;
}

// --- Page wrapper ---

export interface WrapPageOptions {
  sidecarPort: number | null;
}

export function wrapPage(bodyContent: string, options: WrapPageOptions): string {
  const sidecar = options.sidecarPort != null ? sidecarScript(options.sidecarPort) : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>${BASE_CSS}</style>
</head>
<body>
${bodyContent}
${sidecar}
</body>
</html>`;
}
