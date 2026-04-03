// src/config/creatures.ts

import { CreatureDefinition } from "../types";

export const CREATURES: CreatureDefinition[] = [
  // === COMMON (8 base + 8 evolved = 16) ===
  {
    id: "mousebyte",
    name: "Mousebyte",
    description: "A tiny field mouse that nests in warm circuit boards",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
      rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "  ⢈⠖⠲⡁  "],
    },
    spawnCondition: {},
    evolution: { targetId: "circuitmouse", fragmentCost: 5 },
  },
  {
    id: "circuitmouse",
    name: "Circuitmouse",
    description: "Its legs have fused with copper traces, skittering across PCBs",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "⢀⢄⢈⠖⠲⡁⡠⡀", " ⠁    ⠈ "],
      rich: ["⠰⡱⢀⠤⠤⡀⢎⠆", "  ⡇⠂⣐⢸  ", "⢀⢄⢈⠖⠲⡁⡠⡀", " ⠁    ⠈ "],
    },
    spawnCondition: {},
  },
  {
    id: "buglet",
    name: "Buglet",
    description: "A caterpillar that feeds on lines of code",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: ["⢀⠧⠧⡀    ", "⠘⠬⡬⡪⠤⡀  ", "  ⠑⠗⠔⠁  "],
      rich: ["⢀⠧⠧⡀    ", "⠘⠬⡬⡪⠤⡀  ", "  ⠑⠗⠔⠁  "],
    },
    spawnCondition: {},
    evolution: { targetId: "malworm", fragmentCost: 5 },
  },
  {
    id: "malworm",
    name: "Malworm",
    description: "Its body segments replicate endlessly, spreading through systems",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["⢀⠧⠧⡀    ", "⠘⠬⡥⡣⠥⡀  ", "  ⠑⠗⠔⡕⠒⡄", "     ⠈⠉ "],
      rich: ["⢀⠧⠧⡀    ", "⠘⠬⡥⡣⠥⡀  ", "  ⠑⠗⠔⡕⠒⡄", "     ⠈⠉ "],
    },
    spawnCondition: {},
  },
  {
    id: "sparkit",
    name: "Sparkit",
    description: "A firefly whose glow pulses in binary patterns",
    rarity: "common",
    baseCatchRate: 0.75,
    art: {
      simple: ["  ⠰⣉⠆   ", "⠪⠂⡎⠉⢱⠐⠕ ", "  ⠜⠉⠣   "],
      rich: ["  ⠰⣉⠆   ", "⠪⠂⡎⠉⢱⠐⠕ ", "  ⠜⠉⠣   "],
    },
    spawnCondition: {},
    evolution: { targetId: "voltarc", fragmentCost: 5 },
  },
  {
    id: "voltarc",
    name: "Voltarc",
    description: "Lightning crackles between its wings in precise sine waves",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["⠐⠕⠰⣉⠆⠪⠂ ", "⠪⠂⡎⠉⢱⠐⠕ ", "⠠⡢⢸⠉⡇⢔⠄ "],
      rich: ["⠐⠕⠰⣉⠆⠪⠂ ", "⠪⠂⡎⠉⢱⠐⠕ ", "⠠⡢⢸⠉⡇⢔⠄ "],
    },
    spawnCondition: {},
  },
  {
    id: "frogling",
    name: "Frogling",
    description: "A small frog that croaks in modem handshake tones",
    rarity: "common",
    baseCatchRate: 0.85,
    art: {
      simple: ["⠰⡩⠢⣀⠄⢔⠍⠂", " ⢣⣀⣀⣀⡜  ", " ⠘ ⠁⠈⠊  "],
      rich: ["⠰⡩⠢⣀⠄⢔⠍⠂", " ⢣⣀⣀⣀⡜  ", " ⠘ ⠁⠈⠊  "],
    },
    spawnCondition: {},
    evolution: { targetId: "datafrog", fragmentCost: 5 },
  },
  {
    id: "datafrog",
    name: "Datafrog",
    description: "Its skin displays scrolling data packets when startled",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["⠰⡩⢢⣀⢄⢔⠍⠂", " ⢣⣘⣚⣈⡜  ", " ⠜⠄⠁⠨⠪  "],
      rich: ["⠰⡩⢢⣀⢄⢔⠍⠂", " ⢣⣘⣚⣈⡜  ", " ⠜⠄⠁⠨⠪  "],
    },
    spawnCondition: {},
  },
  {
    id: "batbit",
    name: "Batbit",
    description: "Navigates by echolocation through data streams",
    rarity: "common",
    baseCatchRate: 0.75,
    art: {
      simple: ["⠳⣄⢀⠤⡀⣠⠞ ", " ⠘⢌⣀⡡⠃  ", "   ⠉    "],
      rich: ["⠳⣄⢀⠤⡀⣠⠞ ", " ⠘⢌⣀⡡⠃  ", "   ⠉    "],
    },
    spawnCondition: { timeOfDay: ["night", "evening"] },
    evolution: { targetId: "echoshade", fragmentCost: 5 },
  },
  {
    id: "echoshade",
    name: "Echoshade",
    description: "Its sonar has evolved into a grid of scanning beams",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["⠳⣄⢀⠤⡀⣠⠞ ", " ⠘⢌⣀⡡⠃  ", "⠪⠂ ⣿ ⠐⠕ "],
      rich: ["⠳⣄⢀⠤⡀⣠⠞ ", " ⠘⢌⣀⡡⠃  ", "⠪⠂ ⣿ ⠐⠕ "],
    },
    spawnCondition: {},
  },
  {
    id: "snailshell",
    name: "Snailshell",
    description: "Carries a spiral cache of compressed memories on its back",
    rarity: "common",
    baseCatchRate: 0.85,
    art: {
      simple: ["  ⡔⢝⠍⢢  ", "⡠⢄⠬⠶⠮⠥⡀ ", "⠈⠒⠒⠒⠒⠒⠊ "],
      rich: ["  ⡔⢝⠍⢢  ", "⡠⢄⠬⠶⠮⠥⡀ ", "⠈⠒⠒⠒⠒⠒⠊ "],
    },
    spawnCondition: {},
    evolution: { targetId: "cacheslug", fragmentCost: 5 },
  },
  {
    id: "cacheslug",
    name: "Cacheslug",
    description: "Its shell now displays a loading bar that never quite finishes",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["  ⡔⢝⠍⢢  ", "⡠⢄⠬⢶⡮⠥⡀ ", "⠈⠒⠛⠊⠑⠛⠚ "],
      rich: ["  ⡔⢝⠍⢢  ", "⡠⢄⠬⢶⡮⠥⡀ ", "⠈⠒⠛⠊⠑⠛⠚ "],
    },
    spawnCondition: {},
  },
  {
    id: "antwork",
    name: "Antwork",
    description: "A solitary ant that builds tiny logic gates from sand",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: ["  ⠰⣭⠆   ", "⠪⠂⠸⣭⠇⠐⠕ ", "  ⠊ ⠑   "],
      rich: ["  ⠰⣭⠆   ", "⠪⠂⠸⣭⠇⠐⠕ ", "  ⠊ ⠑   "],
    },
    spawnCondition: {},
    evolution: { targetId: "botswarm", fragmentCost: 5 },
  },
  {
    id: "botswarm",
    name: "Botswarm",
    description: "A networked colony of drone ants, sharing one distributed mind",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: ["  ⠰⣭⠆   ", "⠪⠂⠸⣭⠇⠐⠕ ", "⠪⠂⠊ ⠑⠐⠕ "],
      rich: ["  ⠰⣭⠆   ", "⠪⠂⠸⣭⠇⠐⠕ ", "⠪⠂⠊ ⠑⠐⠕ "],
    },
    spawnCondition: {},
  },
  {
    id: "rabbitick",
    name: "Rabbitick",
    description: "Twitchy ears pick up WiFi signals from three rooms away",
    rarity: "common",
    baseCatchRate: 0.8,
    art: {
      simple: [" ⢀⣿⡀⢀⣿⡀ ", " ⡇⠘⣐⠂⢣⠘ ", " ⢈⡖⠒⢲⡁  "],
      rich: [" ⢀⣿⡀⢀⣿⡀ ", " ⡇⠘⣐⠂⢣⠘ ", " ⢈⡖⠒⢲⡁  "],
    },
    spawnCondition: {},
    evolution: { targetId: "lagomorph", fragmentCost: 5 },
  },
  {
    id: "lagomorph",
    name: "Lagomorph",
    description: "Its ears have become antenna arrays, broadcasting on all bands",
    rarity: "common",
    baseCatchRate: 0,
    art: {
      simple: [" ⢃⣿⡀⢀⣿⡘ ", " ⡇⠘⣐⠂⢣⠘ ", "⢀⢌⡖⠒⢲⡡⡀ ", " ⠁    ⠈ "],
      rich: [" ⢃⣿⡀⢀⣿⡘ ", " ⡇⠘⣐⠂⢣⠘ ", "⢀⢌⡖⠒⢲⡡⡀ ", " ⠁    ⠈ "],
    },
    spawnCondition: {},
  },

  // === UNCOMMON (4 base + 4 evolved = 8) ===
  {
    id: "foxfire",
    name: "Foxfire",
    description: "A quick fox whose tail leaves phosphorescent trails",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: ["⠪⠂⡀⠤⠤⢀⠐⠕", "  ⠣⣡⣌⠜  ", "  ⠔⠁⠈⠢  "],
      rich: ["⠪⠂⡀⠤⠤⢀⠐⠕", "  ⠣⣡⣌⠜  ", "  ⠔⠁⠈⠢  "],
    },
    spawnCondition: {},
    evolution: { targetId: "proxyfox", fragmentCost: 7 },
  },
  {
    id: "proxyfox",
    name: "Proxyfox",
    description: "Circuit traces glow beneath its fur, rerouting nearby signals",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["⠪⠂⡀⠤⠤⢀⠐⠕", "  ⠣⣡⣌⠜  ", "⠐⠕⠔⠁⠈⠢⠪⠂"],
      rich: ["⠪⠂⡀⠤⠤⢀⠐⠕", "  ⠣⣡⣌⠜  ", "⠐⠕⠔⠁⠈⠢⠪⠂"],
    },
    spawnCondition: {},
  },
  {
    id: "owlscan",
    name: "Owlscan",
    description: "Its enormous eyes scan in infrared and ultraviolet",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: ["⢠⠒⣭⠉⣭⠒⡄ ", " ⠣⣨⣭⣅⠜  ", " ⠐⠃ ⠘⠂  "],
      rich: ["⢠⠒⣭⠉⣭⠒⡄ ", " ⠣⣨⣭⣅⠜  ", " ⠐⠃ ⠘⠂  "],
    },
    spawnCondition: { timeOfDay: ["night", "evening"] },
    evolution: { targetId: "firewowl", fragmentCost: 7 },
  },
  {
    id: "firewowl",
    name: "Firewowl",
    description: "Antenna feathers intercept and filter malicious packets",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["⠘⡔⢫⡍⢩⡔⢣⠂", " ⠣⣨⣭⣅⠜  ", "⠐⠕⠃ ⠘⠊⠢ "],
      rich: ["⠘⡔⢫⡍⢩⡔⢣⠂", " ⠣⣨⣭⣅⠜  ", "⠐⠕⠃ ⠘⠊⠢ "],
    },
    spawnCondition: {},
  },
  {
    id: "wolfping",
    name: "Wolfping",
    description: "Howls at frequencies that ping every device on the network",
    rarity: "uncommon",
    baseCatchRate: 0.5,
    art: {
      simple: ["⠰⡱⡀⠤⠤⢀⢎⠆", "  ⠣⣡⣌⠜  ", " ⠠⠊⠈⠁⠑⠄ "],
      rich: ["⠰⡱⡀⠤⠤⢀⢎⠆", "  ⠣⣡⣌⠜  ", " ⠠⠊⠈⠁⠑⠄ "],
    },
    spawnCondition: { timeOfDay: ["night", "morning"] },
    evolution: { targetId: "packethowl", fragmentCost: 7 },
  },
  {
    id: "packethowl",
    name: "Packethowl",
    description: "Its howl carries encoded data, heard across every subnet",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["⠰⡱⡀⠤⠤⢀⢎⠆", "  ⠣⣡⣌⠜  ", "⠪⠢⠊⠈⠁⠑⠔⠕"],
      rich: ["⠰⡱⡀⠤⠤⢀⢎⠆", "  ⠣⣡⣌⠜  ", "⠪⠢⠊⠈⠁⠑⠔⠕"],
    },
    spawnCondition: {},
  },
  {
    id: "crablock",
    name: "Crablock",
    description: "Snaps its claws to toggle bits in nearby memory",
    rarity: "uncommon",
    baseCatchRate: 0.55,
    art: {
      simple: ["⠫⠂⡠⡤⢤⢄⠐⠝", " ⢀⠕⠲⠖⠪⡀ ", " ⠁    ⠈ "],
      rich: ["⠫⠂⡠⡤⢤⢄⠐⠝", " ⢀⠕⠲⠖⠪⡀ ", " ⠁    ⠈ "],
    },
    spawnCondition: { timeOfDay: ["afternoon", "evening"] },
    evolution: { targetId: "shellwall", fragmentCost: 7 },
  },
  {
    id: "shellwall",
    name: "Shellwall",
    description: "Its shell has hardened into an impenetrable firewall",
    rarity: "uncommon",
    baseCatchRate: 0,
    art: {
      simple: ["⠫⠂⡠⡤⢤⢄⠐⠝", "⢀⢄⠕⠲⠖⠪⡠⡀", " ⠁    ⠈ "],
      rich: ["⠫⠂⡠⡤⢤⢄⠐⠝", "⢀⢄⠕⠲⠖⠪⡠⡀", " ⠁    ⠈ "],
    },
    spawnCondition: {},
  },

  // === RARE (2 base + 2 evolved = 4) ===
  {
    id: "hawktrace",
    name: "Hawktrace",
    description: "Soars on thermal currents from overclocked processors",
    rarity: "rare",
    baseCatchRate: 0.35,
    art: {
      simple: ["⠳⣄⢀⠤⠤⡀⣠⠞", " ⠈⢎⠊⠑⡱⠁ ", "  ⠠⠋⠙⠄  "],
      rich: ["⠳⣄⢀⠤⠤⡀⣠⠞", " ⠈⢎⠊⠑⡱⠁ ", "  ⠠⠋⠙⠄  "],
    },
    spawnCondition: { timeOfDay: ["morning", "afternoon"] },
    evolution: { targetId: "raptornet", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "raptornet",
    name: "Raptornet",
    description: "Its wings form a mesh network, relaying signals across the sky",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: ["⠳⣄⢀⠤⠤⡀⣠⠞", "⢀⠈⢎⠊⠑⡱⠁⡀", "⠑⠁⠠⠋⠙⠄⠈⠊"],
      rich: ["⠳⣄⢀⠤⠤⡀⣠⠞", "⢀⠈⢎⠊⠑⡱⠁⡀", "⠑⠁⠠⠋⠙⠄⠈⠊"],
    },
    spawnCondition: {},
  },
  {
    id: "cobrascript",
    name: "Cobrascript",
    description: "A cobra whose hood displays hypnotic scrolling code",
    rarity: "rare",
    baseCatchRate: 0.3,
    art: {
      simple: [" ⢠⠊⠍⠩⠑⡄ ", "  ⠑⡖⢲⠊  ", " ⡠⠊  ⠑⢄ "],
      rich: [" ⢠⠊⠍⠩⠑⡄ ", "  ⠑⡖⢲⠊  ", " ⡠⠊  ⠑⢄ "],
    },
    spawnCondition: { timeOfDay: ["night", "evening"] },
    evolution: { targetId: "pythoncore", fragmentCost: 10, catalystItemId: "shard" },
  },
  {
    id: "pythoncore",
    name: "Pythoncore",
    description: "Its body is pure interpreted logic, executing as it slithers",
    rarity: "rare",
    baseCatchRate: 0,
    art: {
      simple: [" ⢠⠊⠍⠩⠑⡄ ", " ⡄⠑⡖⢲⠊⢠ ", "⠈⡪⠊  ⠑⢕⠁"],
      rich: [" ⢠⠊⠍⠩⠑⡄ ", " ⡄⠑⡖⢲⠊⢠ ", "⠈⡪⠊  ⠑⢕⠁"],
    },
    spawnCondition: {},
  },

  // === EPIC (1 base + 1 evolved = 2) ===
  {
    id: "stagram",
    name: "Stagram",
    description: "A majestic stag whose antlers crackle with static discharge",
    rarity: "epic",
    baseCatchRate: 0.15,
    art: {
      simple: ["⠪⠈⣢⣠⣄⣔⠁⠕", " ⢸⠐⣀⣀⠂⡇ ", " ⢀⠕⠲⠖⠪⡀ "],
      rich: ["⠪⠈⣢⣠⣄⣔⠁⠕", " ⢸⠐⣀⣀⠂⡇ ", " ⢀⠕⠲⠖⠪⡀ "],
    },
    spawnCondition: { minTotalTicks: 200 },
    evolution: { targetId: "kernelstag", fragmentCost: 15, catalystItemId: "prism" },
  },
  {
    id: "kernelstag",
    name: "Kernelstag",
    description: "Its antlers are antenna towers, broadcasting kernel-level commands",
    rarity: "epic",
    baseCatchRate: 0,
    art: {
      simple: ["⠋⠎⣂⣄⣤⣰⠑⠹", " ⢸⠐⣀⣀⠂⡇ ", "⠐⢕⠕⠲⠖⠪⡪⠂"],
      rich: ["⠋⠎⣂⣄⣤⣰⠑⠹", " ⢸⠐⣀⣀⠂⡇ ", "⠐⢕⠕⠲⠖⠪⡪⠂"],
    },
    spawnCondition: {},
  },

  // === LEGENDARY (1, no evolution) ===
  {
    id: "leviathrex",
    name: "Leviathrex",
    description: "A sea dragon forged from corrupted data streams, older than the network itself",
    rarity: "legendary",
    baseCatchRate: 0.05,
    art: {
      simple: ["⠰⡉⡱⠤⠴⠶⢦ ", " ⠸⡀⠥⠤⢈⠎ ", "⡠⠊⠉⢻⡟⠉⠑⢄", "   ⠚⠓   "],
      rich: ["⠰⡉⡱⠤⠴⠶⢦ ", " ⠸⡀⠥⠤⢈⠎ ", "⡠⠊⠉⢻⡟⠉⠑⢄", "   ⠚⠓   "],
    },
    spawnCondition: { minTotalTicks: 500, timeOfDay: ["night"] },
  },
];

export function getCreatureMap(): Map<string, CreatureDefinition> {
  const map = new Map<string, CreatureDefinition>();
  for (const c of CREATURES) {
    map.set(c.id, c);
  }
  return map;
}

export function getSpawnableCreatures(): CreatureDefinition[] {
  return CREATURES.filter((c) => c.baseCatchRate > 0);
}
