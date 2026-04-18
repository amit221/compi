/**
 * Shared MCP tool registration for both stdio MCP servers:
 *   - `mcp-server.ts` (Claude Code) — text-only output via ANSI display file.
 *   - `mcp-server-cursor.ts` (Cursor) — HTML MCP Apps via embedded resource.
 */
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StateManager } from "./state/state-manager";
import { GameEngine } from "./engine/game-engine";
import { SimpleTextRenderer } from "./renderers/simple-text";
import { MAX_ENERGY } from "./engine/energy";
import { SlotId, SpeciesDefinition, Renderer } from "./types";
import { registerPersonalSpecies } from "./config/species";
import { drawCards, playCard, skipHand } from "./engine/cards";

const statePath =
  process.env.COMPI_STATE_PATH ||
  path.join(os.homedir(), ".compi", "state.json");

export function loadEngine() {
  const stateManager = new StateManager(statePath);
  const state = stateManager.load();
  const engine = new GameEngine(state);
  return { stateManager, engine };
}

export interface RegisterToolsOptions {
  /** Write ANSI output to a temp file (Claude Code display mode) */
  writeDisplayFile?: boolean;
  /** If provided, use server.registerTool() with _meta for MCP Apps */
  appMeta?: Record<string, unknown>;
  /** Callback to capture rendered output (used by Cursor server for its persistent UI resource) */
  onOutput?: (content: string) => void;
  /** If provided, render ANSI to HTML and include as embedded resource in result */
  renderHtml?: (ansiContent: string) => string;
  /** Custom renderer (used by Cursor server for HTML output) */
  renderer?: Renderer;
}

const displayPath = path.join(os.tmpdir(), "compi_display.txt");

function makeText(content: string, options: RegisterToolsOptions, htmlContent?: string) {
  if (options.writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }

  const html = htmlContent ?? (options.renderHtml ? options.renderHtml(content) : null);

  if (options.onOutput && html) {
    options.onOutput(html);
  } else if (options.onOutput) {
    options.onOutput(content);
  }

  if (html) {
    return { content: [
      { type: "text" as const, text: content },
      { type: "resource" as any, resource: { uri: `ui://compi/result-${Date.now()}.html`, mimeType: "text/html;profile=mcp-app", text: html } },
    ] };
  }
  return { content: [{ type: "text" as const, text: content }] };
}

type ToolHandler<T> = (args: T) => Promise<{ content: any[] }>;

function addTool<T extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: z.ZodObject<T>,
  handler: ToolHandler<z.infer<z.ZodObject<T>>>,
  appMeta?: Record<string, unknown>,
) {
  if (appMeta) {
    server.registerTool(name, { description, inputSchema, _meta: appMeta }, handler as any);
  } else {
    // server.tool() with schema expects the raw shape object, not ZodObject
    const shape = inputSchema.shape;
    if (Object.keys(shape).length > 0) {
      server.tool(name, description, shape as any, handler as any);
    } else {
      server.tool(name, description, {}, handler as any);
    }
  }
}

export function registerTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const meta = options.appMeta;

  addTool(server, "play", "Play the game — draw cards or pick one", z.object({
    choice: z.enum(["a", "b", "c", "s"]).optional().describe("Pick a card (a/b/c) or skip (s). Omit for initial draw."),
  }), async (args) => {
    const { stateManager, engine } = loadEngine();
    const state = engine.getState();
    const ansiRenderer = new SimpleTextRenderer();
    const htmlRenderer = options.renderer;

    // Register hybrid species so renderer can find their art
    registerPersonalSpecies(state.personalSpecies);

    // Process ticks (energy/spawns)
    engine.processTick({ timestamp: Date.now(), sessionId: state.currentSessionId }, Math.random);

    let ansiOutput: string;
    let htmlOutput: string | undefined;

    if (!args.choice) {
      // Initial draw
      const draw = drawCards(state, Math.random);
      ansiOutput = ansiRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
      if (htmlRenderer) htmlOutput = htmlRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else if (args.choice === "s") {
      // Skip — new turn costs 1 energy
      const draw = drawCards(state, Math.random);
      ansiOutput = ansiRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
      if (htmlRenderer) htmlOutput = htmlRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
    } else {
      const choiceIndex = args.choice.charCodeAt(0) - 97; // 'a'=0, 'b'=1, 'c'=2

      // Handle breed pass (choice "b" on a single breed card)
      if (state.currentHand?.length === 1 && state.currentHand[0].type === "breed" && args.choice === "b") {
        const draw = skipHand(state, Math.random);
        ansiOutput = ansiRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
        if (htmlRenderer) htmlOutput = htmlRenderer.renderCardDraw(draw, state.energy, MAX_ENERGY, state.profile);
      } else {
        const result = playCard(state, choiceIndex, Math.random);
        ansiOutput = ansiRenderer.renderPlayResult(result, state.energy, MAX_ENERGY, state.profile);
        if (htmlRenderer) htmlOutput = htmlRenderer.renderPlayResult(result, state.energy, MAX_ENERGY, state.profile);
      }
    }

    stateManager.save(state);
    return makeText(ansiOutput, options, htmlOutput);
  }, meta);

  addTool(server, "collection", "View your creature collection (free, no energy cost)", z.object({}), async () => {
    const { engine } = loadEngine();
    const state = engine.getState();
    registerPersonalSpecies(state.personalSpecies);
    const ansiRenderer = new SimpleTextRenderer();
    const htmlRenderer = options.renderer;
    const active = state.collection.filter((c: any) => !c.archived);
    const ansiOutput = ansiRenderer.renderCollection(active);
    const htmlOutput = htmlRenderer ? htmlRenderer.renderCollection(active) : undefined;
    return makeText(ansiOutput, options, htmlOutput);
  }, meta);

  addTool(server, "register_hybrid", "Register a newly bred hybrid species with AI-generated name and art", z.object({
    speciesId: z.string().describe("The hybrid species ID (e.g., hybrid_compi_pyrax)"),
    name: z.string().describe("Creative name for the hybrid species"),
    art: z.string().describe("ASCII art template (4-5 lines separated by newlines). Use EE=eyes, MM=mouth, BB=body, TT=tail as placeholders"),
    description: z.string().describe("One-line flavor text description"),
  }), async ({ speciesId, name, art, description }: { speciesId: string; name: string; art: string; description: string }) => {
    const { stateManager, engine } = loadEngine();
    const state = engine.getState();

    const artLines = art.split("\n");
    const species: SpeciesDefinition = {
      id: speciesId,
      name,
      description,
      spawnWeight: 0,
      art: artLines,
      zones: ["eyes", "mouth", "body", "tail"] as SlotId[],
      traitPools: {},
    };

    // Update existing placeholder or add new
    const existingIdx = state.personalSpecies.findIndex((s: SpeciesDefinition) => s.id === speciesId);
    if (existingIdx >= 0) {
      state.personalSpecies[existingIdx] = species;
    } else {
      state.personalSpecies.push(species);
    }
    stateManager.save(state);

    const artDisplay = artLines.join("\n");
    return makeText(`★ Hybrid species "${name}" registered!\n\n${artDisplay}\n\n"${description}"`, options);
  }, meta);
}
