export type ScenarioId =
  | "first-10-minutes"
  | "energy-wall"
  | "first-breed"
  | "full-collection"
  | "quest-flow"
  | "returning-player"
  | "gold-decision";

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  prompt: string;
}

const REPORT_FORMAT = `
At the end, write a structured report with the following sections:

**Friction Points**: Specific moments where you were confused, slowed down, or had to guess.
**Dead Ends**: Commands or paths you tried that led nowhere or gave unhelpful feedback.
**Missing Information**: Things you wished the game had told you but didn't.
**Suggestions**: Concrete improvements that would make this scenario smoother for real players.`;

const SCENARIOS: Scenario[] = [
  {
    id: "first-10-minutes",
    name: "First 10 Minutes",
    description:
      "New player tries to figure out how to play with zero context.",
    prompt: `You are a brand-new player of Compi, a terminal creature collection game. You have never played before and have received no instructions. Your only starting knowledge is the name of the game and that it involves creatures.

Your goal is to figure out how to play the game entirely through exploration. Do not look at any documentation files or README. Only use the slash commands and tools available to you in the game.

Step through the following:
1. Start by trying at least 5 different commands or tools to orient yourself. Note what each one tells you and whether it was helpful.
2. Think aloud as you explore. What assumptions are you making? What are you unsure about?
3. Once you have a rough picture of the game loop, attempt to perform one complete action (e.g., scan for creatures, attempt a catch, or check your status).
4. Note every point where you felt lost, uncertain, or had to guess at what to do next.
5. Identify anything that felt like a dead end — a command that gave no useful feedback or seemed to go nowhere.
6. Consider what a real new player might give up on if they hit these friction points without guidance.

Be honest about confusion. If something is unclear, say so explicitly rather than guessing confidently. The goal is to surface real UX problems, not to demonstrate mastery.${REPORT_FORMAT}`,
  },
  {
    id: "energy-wall",
    name: "Energy Wall",
    description:
      "Player is at 0 energy with creatures nearby but cannot act.",
    prompt: `You are playing Compi and you've been active for a while. Your energy is currently at 0. You know there are creatures nearby because you spotted them recently, but you cannot remember exactly how energy works or how to get more.

Work through this scenario step by step:
1. Check your current status — note everything the status screen tells you about energy.
2. Use /scan to see what creatures are nearby.
3. Attempt to catch one of the nearby creatures. Note exactly what happens and what message you receive.
4. Try to understand from the game's feedback alone how energy depletion works and how to recover it.
5. If the game suggests a way to regain energy, follow that path. If it doesn't, note what information is absent.
6. Try the /energy command if available. Does it give you actionable next steps or just a number?
7. Evaluate how clear the game makes the energy system without you needing to consult external documentation.

Focus especially on: Does the game tell you WHY you're blocked? Does it tell you WHAT to do next? Does it give you a time estimate for recovery? Is the messaging sympathetic or just an error?${REPORT_FORMAT}`,
  },
  {
    id: "first-breed",
    name: "First Breed Attempt",
    description:
      "Player has two creatures of the same species and wants to breed them.",
    prompt: `You are playing Compi and you've built up a small collection. You notice you have two creatures of the same species and you've heard breeding is possible. You've never bred before.

Walk through the entire breeding process from discovery to completion:
1. Open your collection and identify a pair of same-species creatures. Note how easy or hard it is to spot potential breeding pairs.
2. Look for a breed command, option, or table. Try to find it without external help.
3. Before committing to a breed, attempt to preview or understand what you'll get. Is there a preview mechanic? Can you see the cost before confirming?
4. Note the exact syntax you need to use to initiate a breed. Was it obvious? Did you have to guess indices or IDs?
5. If a breed table or menu is shown, evaluate how understandable it is: Are trait inheritance probabilities shown? Are costs (gold, energy, time) visible upfront?
6. Complete the breed if you can, or note exactly where you got stuck if you couldn't.
7. After (or instead of) breeding, reflect on whether you felt confident about what you were doing or whether you were acting on guesswork.

Pay close attention to: syntax discoverability, cost visibility before commitment, and whether the outcome preview gives enough information for an informed decision.${REPORT_FORMAT}`,
  },
  {
    id: "full-collection",
    name: "Full Collection",
    description:
      "Player has 15 creatures and a new spawn appears — must manage space.",
    prompt: `You are playing Compi and your collection is full (15 creatures). You just received a notification that a new creature has spawned nearby — one you don't have yet.

Work through the space management problem:
1. Review your current collection. Try to evaluate which creatures are least valuable to you.
2. Use /scan to confirm the new creature is nearby and note what species it is.
3. Attempt to catch the new creature without first making space. Note the exact error message you receive.
4. Investigate the difference between /archive and /release (or equivalent commands). What does each one do? Are the consequences clearly explained?
5. Choose a creature to archive or release and execute that action. Note whether the game asks for confirmation and how it warns you about permanent consequences.
6. Attempt to catch the new creature again and see if it succeeds.
7. Reflect on how well the game communicated the collection limit, the options for making space, and the permanence of each option.

Focus on: How clear is the error when you're full? Does the game guide you toward a solution? Is the difference between archive and release adequately explained before you commit to an irreversible action?${REPORT_FORMAT}`,
  },
  {
    id: "quest-flow",
    name: "Quest Flow",
    description:
      "Player goes through the full quest lifecycle for the first time.",
    prompt: `You are playing Compi and you've heard quests are a way to earn rewards. You've never done a quest before.

Walk through the complete quest lifecycle:
1. Check /status or the relevant command to see if any quests are available.
2. Browse the quest options. Note how clearly requirements are communicated — which creatures are needed, what stats matter, how long it takes.
3. Pick a quest and select creatures to send on it. Note how you choose which creatures and whether the selection process is intuitive.
4. Observe the lock state: after sending creatures on a quest, try to use those same creatures for something else (catch, breed, upgrade). Note what happens and how clearly the locked state is communicated.
5. Check quest progress. How do you find out how far along the quest is? Is there a timer or progress indicator?
6. Wait for or simulate quest completion. Collect the rewards. Are the rewards clearly itemized?
7. Reflect on whether you understood the full lifecycle before starting, and whether the lock mechanic felt fair or punishing.

Focus on: quest discoverability, pre-commitment information, lock state clarity, and whether the reward felt worth the wait based on what was shown upfront.${REPORT_FORMAT}`,
  },
  {
    id: "returning-player",
    name: "Returning Player",
    description:
      "Player returning after a break tries to orient themselves and decide what to do next.",
    prompt: `You are a Compi player returning after a week away. You don't remember exactly where you left off. You have an existing game state with creatures, some gold, and some progress, but you need to re-orient yourself before deciding what to do.

Walk through your re-orientation process:
1. Start with /status. What does it tell you? Does it give you a sense of what you were doing before and what you should do next?
2. Check your /collection. Can you quickly understand the state of your creatures — their levels, traits, and readiness?
3. Check your energy and gold levels. Do they give you context about what actions are currently available to you?
4. Use /scan to see what's around. Does the scan output give you enough context to make a meaningful decision about whether to catch?
5. Based on everything you've seen, what would you do next? Was that decision obvious, or did you have to piece it together from multiple screens?
6. Note any information you wish had been surfaced more prominently to a returning player — things that would have helped you get back into flow faster.
7. Consider: if a real player came back after a week, what's the chance they'd feel motivated to continue vs. overwhelmed or confused?

Focus on: orientation speed, what-to-do-next clarity, whether the UI provides a natural "pick up where you left off" experience.${REPORT_FORMAT}`,
  },
  {
    id: "gold-decision",
    name: "Gold Decision",
    description:
      "Player has limited gold and must decide between upgrading a creature or breeding.",
    prompt: `You are playing Compi and you've accumulated a modest amount of gold — enough for either one upgrade or one breed, but not both. You need to decide how to spend it wisely.

Work through the decision-making process:
1. Check your current gold balance. Is the amount shown clearly? Do you know what it represents?
2. Review your collection and identify creatures that could benefit from an upgrade. Check the upgrade costs for each — are costs shown per slot, per rank, or as a total?
3. Assess the breeding options. Which pairs could breed? What would a breed cost? What could you potentially get from the offspring?
4. Try to compare these two options using only information the game provides in-context (no external calculations). Can you make a genuinely informed decision, or are you guessing?
5. Look for any guidance or recommendation the game provides. Does it nudge you toward one option? Does it explain the long-term value of each?
6. Make a decision and execute it. Did the information you gathered support your confidence in the choice?
7. Reflect: did the game give you what you needed to make a rational decision, or did you have to rely on intuition and incomplete information?

Focus on: information availability at the point of decision, comparative cost visibility, and whether the game provides enough economic context for players to make meaningful strategic choices.${REPORT_FORMAT}`,
  },
];

export function getAllScenarios(): Scenario[] {
  return SCENARIOS;
}

export function getScenario(id: ScenarioId): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
