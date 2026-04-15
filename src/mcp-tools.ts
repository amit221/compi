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
import { AdvisorContext, SlotId, SpeciesDefinition } from "./types";
import { getProgressInfo } from "./engine/advisor";
import { getCompanionOverview } from "./engine/companion";

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
}

const displayPath = path.join(os.tmpdir(), "compi_display.txt");

/**
 * Append advisor context as a structured JSON block after the ANSI display text.
 * Claude reads this block for narrator commentary and next-action suggestions.
 */
function appendAdvisorContext(displayContent: string, advisorCtx: AdvisorContext): string {
  const json = JSON.stringify(advisorCtx, null, 2);
  return `${displayContent}\n\n<advisor_context>\n${json}\n</advisor_context>`;
}

/**
 * Prepend the status bar (energy, collection, XP%, level)
 * to any rendered screen output. Called by every MCP tool so players always
 * see their current game state at the top of every response.
 */
function prependStatusBar(engine: GameEngine, renderer: SimpleTextRenderer, content: string): string {
  const progress = getProgressInfo(engine.getState());
  return renderer.renderStatusBar(progress) + "\n\n" + content;
}

function makeText(content: string, options: RegisterToolsOptions) {
  if (options.writeDisplayFile) {
    fs.writeFileSync(displayPath, content);
  }
  if (options.onOutput) {
    options.onOutput(content);
  }
  // If renderHtml is provided, return HTML for the iframe instead of raw ANSI
  if (options.renderHtml) {
    const html = options.renderHtml(content);
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

/**
 * Pure command-layer logic for the `breed` MCP tool. Extracted so the three
 * modes (list / partner / preview / execute) can be unit-tested without
 * constructing a real MCP server.
 *
 * Returns the rendered output and a flag indicating whether state mutated
 * (so the caller can decide whether to persist).
 */
export function runBreedCommand(
  engine: GameEngine,
  renderer: SimpleTextRenderer,
  args: { indexA?: number; indexB?: number; confirm?: boolean }
): { output: string; mutated: boolean } {
  const { indexA, indexB, confirm } = args;
  const collection = engine.getState().collection;

  // List mode: no indexes → show the species-grouped breed table
  if (indexA === undefined && indexB === undefined) {
    return {
      output: renderer.renderBreedTable(engine.buildBreedTable()),
      mutated: false,
    };
  }

  // One-arg mode is no longer supported
  if (indexA !== undefined && indexB === undefined) {
    throw new Error(
      "Pick two creatures to breed. Run /breed to see all breedable creatures, or /breed N M to preview a pair."
    );
  }
  if (indexA === undefined && indexB !== undefined) {
    throw new Error(
      "indexA is required. Run /breed to see all breedable creatures, or /breed N M to preview a pair."
    );
  }

  // Preview / execute mode
  if (indexA === undefined || indexB === undefined) {
    throw new Error("Both indexA and indexB are required to preview or confirm a breed.");
  }
  if (indexA < 1 || indexA > collection.length) {
    throw new Error(
      `No creature at index ${indexA}. You have ${collection.length} creatures.`
    );
  }
  if (indexB < 1 || indexB > collection.length) {
    throw new Error(
      `No creature at index ${indexB}. You have ${collection.length} creatures.`
    );
  }
  const parentAId = collection[indexA - 1].id;
  const parentBId = collection[indexB - 1].id;

  if (confirm) {
    const result = engine.breedExecute(parentAId, parentBId);
    let output = renderer.renderBreedResult(result);
    if (result.isCrossSpecies) {
      output += `\n\n<hybrid_species_context>\nIMPORTANT: You MUST now generate a hybrid species. Do this immediately — do not ask the player first.\n\nCreate:\n1. A creative name blending both parent species themes (e.g. "Emberlotl" for compi × pyrax)\n2. ASCII art (3-4 lines) combining visual elements from both parents\n3. A one-line flavor description\n\nThen call the register_hybrid tool with:\n- speciesId: "${result.child.speciesId}"\n- name: your generated name\n- art: your generated ASCII art (newline-separated)\n- description: your flavor text\n</hybrid_species_context>`;
    }
    return { output, mutated: true };
  }
  const preview = engine.breedPreview(parentAId, parentBId);
  return { output: renderer.renderBreedPreview(preview), mutated: false };
}

export function registerTools(server: McpServer, options: RegisterToolsOptions = {}): void {
  const text = (content: string) => makeText(content, options);
  const meta = options.appMeta;

  addTool(server, "scan", "Show nearby creatures that can be caught. IMPORTANT: Always show the full output to the user. Never summarize or abbreviate.", z.object({}), async () => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.scan();
    stateManager.save(engine.getState());
    return text(prependStatusBar(engine, renderer, renderer.renderScan(result)));
  }, meta);

  addTool(server, "catch", "Attempt to catch a nearby creature. IMPORTANT: Always show the full output to the user. Never summarize or abbreviate.", z.object({
    index: z.number().describe("1-indexed creature number from scan list"),
  }), async ({ index }: { index: number }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.catch(index - 1);
    stateManager.save(engine.getState());
    const advisorCtx = engine.getAdvisorContext("catch", result);
    return text(prependStatusBar(engine, renderer, appendAdvisorContext(renderer.renderCatch(result), advisorCtx)));
  }, meta);

  addTool(server, "collection", "Browse caught creatures. IMPORTANT: Always show the full output to the user. Never summarize or abbreviate.", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    return text(prependStatusBar(engine, renderer, renderer.renderCollection(engine.getState().collection)));
  }, meta);

  addTool(server, "breed", "Breed two creatures from your collection (uses /collection indexes). IMPORTANT: Always show the full output to the user. Never summarize or abbreviate.", z.object({
    indexA: z.number().optional().describe("1-indexed position of first parent in /collection"),
    indexB: z.number().optional().describe("1-indexed position of second parent in /collection"),
    confirm: z.boolean().optional().describe("Set to true to execute the breed after previewing"),
  }), async ({ indexA, indexB, confirm }: { indexA?: number; indexB?: number; confirm?: boolean }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = runBreedCommand(engine, renderer, { indexA, indexB, confirm });
    if (result.mutated) {
      stateManager.save(engine.getState());
      const advisorCtx = engine.getAdvisorContext("breed", result);
      return text(prependStatusBar(engine, renderer, appendAdvisorContext(result.output, advisorCtx)));
    }
    return text(prependStatusBar(engine, renderer, result.output));
  }, meta);

  addTool(server, "archive", "View archive or archive a creature", z.object({
    id: z.string().optional().describe("Creature ID to archive (omit to view archive)"),
  }), async ({ id }: { id?: string }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    if (id) {
      const result = engine.archive(id);
      stateManager.save(engine.getState());
      return text(prependStatusBar(engine, renderer, `Archived ${result.creature.name}.`));
    } else {
      return text(prependStatusBar(engine, renderer, renderer.renderArchive(engine.getState().archive)));
    }
  }, meta);

  addTool(server, "release", "Permanently release a creature", z.object({
    id: z.string().describe("Creature ID to release"),
  }), async ({ id }: { id: string }) => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    engine.release(id);
    stateManager.save(engine.getState());
    return text(prependStatusBar(engine, renderer, `Released creature ${id}.`));
  }, meta);

  addTool(server, "energy", "Show current energy level", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    return text(prependStatusBar(engine, renderer, renderer.renderEnergy(state.energy, MAX_ENERGY)));
  }, meta);

  addTool(server, "status", "View player profile and game stats", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const result = engine.status();
    return text(prependStatusBar(engine, renderer, renderer.renderStatus(result)));
  }, meta);

  addTool(server, "settings", "View or change game settings", z.object({
    key: z.string().optional().describe("Setting key: 'notifications'"),
    value: z.string().optional().describe("New value for the setting"),
  }), async ({ key, value }: { key?: string; value?: string }) => {
    const { stateManager, engine } = loadEngine();
    const gameState = engine.getState();
    if (key && value) {
      if (key === "notifications") {
        gameState.settings.notificationLevel = value as "minimal" | "moderate" | "off";
      }
      stateManager.save(gameState);
      return text(`Settings updated: ${key} = ${value}`);
    }
    const settings = gameState.settings;
    return text(`SETTINGS\n\nNotifications: ${settings.notificationLevel}`);
  }, meta);

  addTool(server, "companion", "Get a full game overview with strategic insights for the companion AI", z.object({}), async () => {
    const { stateManager, engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    const overview = getCompanionOverview(state);
    // Display file gets only the rendered ANSI (status bar + overview with numbered picks)
    const rendered = prependStatusBar(engine, renderer, renderer.renderCompanionOverview(overview));
    if (options.writeDisplayFile) {
      fs.writeFileSync(displayPath, rendered);
    }
    if (options.onOutput) {
      options.onOutput(rendered);
    }
    // MCP response includes the rendered display AND JSON for Claude to parse
    const json = JSON.stringify(overview, null, 2);
    const fullContent = `${rendered}\n\n<companion_overview>\n${json}\n</companion_overview>`;
    if (options.renderHtml) {
      const html = options.renderHtml(rendered);
      return { content: [
        { type: "text" as const, text: fullContent },
        { type: "resource" as any, resource: { uri: `ui://compi/result-${Date.now()}.html`, mimeType: "text/html;profile=mcp-app", text: html } },
      ] };
    }
    return { content: [{ type: "text" as const, text: fullContent }] };
  }, meta);

  addTool(server, "species", "Show species index — discovered tiers for each species", z.object({}), async () => {
    const { engine } = loadEngine();
    const renderer = new SimpleTextRenderer();
    const state = engine.getState();
    return text(prependStatusBar(engine, renderer, renderer.renderSpeciesIndex(state.speciesProgress)));
  }, meta);

  addTool(server, "register_hybrid", "Register a newly bred hybrid species with AI-generated name and art", z.object({
    speciesId: z.string().describe("The hybrid species ID (e.g., hybrid_compi_pyrax)"),
    name: z.string().describe("Creative name for the hybrid species"),
    art: z.string().describe("ASCII art for the creature (3-4 lines, separated by newlines)"),
    description: z.string().describe("One-line flavor text description"),
  }), async ({ speciesId, name, art, description }: { speciesId: string; name: string; art: string; description: string }) => {
    const { stateManager, engine } = loadEngine();
    const state = engine.getState();

    if (state.personalSpecies.find((s: SpeciesDefinition) => s.id === speciesId)) {
      return text(`Hybrid species "${name}" (${speciesId}) is already registered.`);
    }

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

    state.personalSpecies.push(species);
    stateManager.save(state);

    const artDisplay = artLines.join("\n");
    return text(`★ Hybrid species "${name}" registered!\n\n${artDisplay}\n\n"${description}"`);
  }, meta);

  // companion_pick removed — agent presents choices directly in conversation text
}
