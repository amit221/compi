#!/usr/bin/env node
// validate-species.js — Validates a species JSON file and optionally copies it to config/species/
"use strict";

const fs = require("fs");
const path = require("path");

const VALID_SLOTS = ["eyes", "mouth", "body", "tail"];
const PLACEHOLDERS = { eyes: "EE", mouth: "MM", body: "BB", tail: "TT" };
const TRAIT_ID_PATTERN = /^[a-z]{2,4}_(?:eye|mth|bod|tal)_\d{2,3}$/;

function validate(filePath) {
  const errors = [];

  // 1. Parse JSON
  let data;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    data = JSON.parse(raw);
  } catch (e) {
    return { errors: [`Failed to parse JSON: ${e.message}`] };
  }

  // 2. Required fields
  for (const field of ["id", "name", "description", "spawnWeight", "art", "zones", "traitPools"]) {
    if (data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (errors.length > 0) return { errors };

  // 3. Type checks
  if (typeof data.id !== "string" || data.id.length === 0) {
    errors.push(`"id" must be a non-empty string`);
  }
  if (typeof data.name !== "string" || data.name.length === 0) {
    errors.push(`"name" must be a non-empty string`);
  }
  if (typeof data.description !== "string") {
    errors.push(`"description" must be a string`);
  }
  if (typeof data.spawnWeight !== "number" || data.spawnWeight <= 0) {
    errors.push(`"spawnWeight" must be a positive number`);
  }
  if (!Array.isArray(data.art) || data.art.length === 0) {
    errors.push(`"art" must be a non-empty array of strings`);
  }
  if (!Array.isArray(data.zones)) {
    errors.push(`"zones" must be an array`);
  }

  if (errors.length > 0) return { errors };

  // 4. Zones length matches art length
  if (data.zones.length !== data.art.length) {
    errors.push(`zones length (${data.zones.length}) must match art length (${data.art.length})`);
  }

  // 5. Zone values are valid slot IDs
  for (let i = 0; i < data.zones.length; i++) {
    if (!VALID_SLOTS.includes(data.zones[i])) {
      errors.push(`zones[${i}] = "${data.zones[i]}" is not a valid slot ID (${VALID_SLOTS.join(", ")})`);
    }
  }

  // 6. Check placeholders appear exactly once in art
  const artJoined = data.art.join("\n");
  for (const [slot, placeholder] of Object.entries(PLACEHOLDERS)) {
    const count = (artJoined.match(new RegExp(placeholder, "g")) || []).length;
    if (count === 0) {
      errors.push(`Placeholder "${placeholder}" for slot "${slot}" not found in art`);
    } else if (count > 1) {
      errors.push(`Placeholder "${placeholder}" for slot "${slot}" appears ${count} times (must be exactly 1)`);
    }
  }

  // 7. Check trait pools
  if (typeof data.traitPools !== "object" || data.traitPools === null) {
    errors.push(`"traitPools" must be an object`);
    return { errors };
  }

  const allTraitIds = new Set();

  for (const slotId of VALID_SLOTS) {
    const traits = data.traitPools[slotId];
    if (!traits || !Array.isArray(traits)) {
      errors.push(`traitPools.${slotId} must be a non-empty array`);
      continue;
    }

    const placeholder = PLACEHOLDERS[slotId];
    const placeholderWidth = placeholder.length;

    let spawnRateSum = 0;

    for (let i = 0; i < traits.length; i++) {
      const trait = traits[i];

      if (!trait.id || !trait.name || trait.art === undefined || trait.spawnRate === undefined) {
        errors.push(`traitPools.${slotId}[${i}] missing required fields (id, name, art, spawnRate)`);
        continue;
      }

      if (!TRAIT_ID_PATTERN.test(trait.id)) {
        errors.push(`traitPools.${slotId}[${i}].id "${trait.id}" doesn't match pattern <prefix>_<slot>_<number>`);
      }

      if (allTraitIds.has(trait.id)) {
        errors.push(`Duplicate trait ID: "${trait.id}"`);
      }
      allTraitIds.add(trait.id);

      if (trait.art.length !== placeholderWidth) {
        errors.push(
          `traitPools.${slotId}[${i}].art "${trait.art}" has length ${trait.art.length}, ` +
          `expected ${placeholderWidth} (matching placeholder "${placeholder}")`
        );
      }

      if (typeof trait.spawnRate !== "number" || trait.spawnRate <= 0) {
        errors.push(`traitPools.${slotId}[${i}].spawnRate must be a positive number`);
      }

      spawnRateSum += trait.spawnRate;
    }

    if (spawnRateSum < 0.8 || spawnRateSum > 1.2) {
      errors.push(
        `traitPools.${slotId} spawnRate sum is ${spawnRateSum.toFixed(3)}, expected approximately 1.0`
      );
    }
  }

  // 8. Check for conflicts with existing species
  const configDir = path.join(__dirname, "..", "config", "species");
  if (fs.existsSync(configDir)) {
    const existingFiles = fs.readdirSync(configDir).filter((f) => f.endsWith(".json"));
    for (const file of existingFiles) {
      try {
        const existing = JSON.parse(fs.readFileSync(path.join(configDir, file), "utf-8"));
        if (existing.id === data.id) {
          errors.push(`Species ID "${data.id}" conflicts with existing species in ${file}`);
        }
        if (existing.name.toLowerCase() === data.name.toLowerCase()) {
          errors.push(`Species name "${data.name}" conflicts with existing species in ${file}`);
        }
      } catch {
        // skip unreadable files
      }
    }
  }

  return { errors, data };
}

// --- CLI entry point ---

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/validate-species.js <path-to-species.json>");
  process.exit(1);
}

const inputPath = args[0];
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const result = validate(inputPath);

if (result.errors.length > 0) {
  console.error("Validation failed:\n");
  for (const err of result.errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

// Write to config/species/<id>.json
const outputPath = path.join(__dirname, "..", "config", "species", `${result.data.id}.json`);
fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2) + "\n");
console.log(`✓ Species "${result.data.name}" validated and saved to ${outputPath}`);
process.exit(0);
