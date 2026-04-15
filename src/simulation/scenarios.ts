export type ScenarioId =
  | "first-10-minutes"
  | "energy-wall"
  | "first-breed"
  | "full-collection"
  | "returning-player"
  | "companion-mode";

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
5. If a breed table or menu is shown, evaluate how understandable it is: Are trait inheritance probabilities shown? Are energy costs visible upfront?
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
    id: "returning-player",
    name: "Returning Player",
    description:
      "Player returning after a break tries to orient themselves and decide what to do next.",
    prompt: `You are a Compi player returning after a week away. You don't remember exactly where you left off. You have an existing game state with creatures and some progress, but you need to re-orient yourself before deciding what to do.

Walk through your re-orientation process:
1. Start with /status. What does it tell you? Does it give you a sense of what you were doing before and what you should do next?
2. Check your /collection. Can you quickly understand the state of your creatures — their levels, traits, and readiness?
3. Check your energy level. Does it give you context about what actions are currently available to you?
4. Use /scan to see what's around. Does the scan output give you enough context to make a meaningful decision about whether to catch?
5. Based on everything you've seen, what would you do next? Was that decision obvious, or did you have to piece it together from multiple screens?
6. Note any information you wish had been surfaced more prominently to a returning player — things that would have helped you get back into flow faster.
7. Consider: if a real player came back after a week, what's the chance they'd feel motivated to continue vs. overwhelmed or confused?

Focus on: orientation speed, what-to-do-next clarity, whether the UI provides a natural "pick up where you left off" experience.${REPORT_FORMAT}`,
  },
  {
    id: "companion-mode",
    name: "Companion Mode (/play)",
    description:
      "Player discovers and uses the /play companion mode instead of individual commands.",
    prompt: `You are a Compi player who has just started playing. Instead of using individual slash commands, you've heard there's a /play command that gives you an interactive companion to guide you through the game.

Walk through the companion experience:
1. Start by running /play to launch the companion mode. Note your first impression — does the companion greet you well? Does it orient you immediately?
2. Try interacting conversationally — ask the companion what you should do, what's nearby, or how the game works. Does it respond naturally and use the actual game tools (scan, catch, etc.) on your behalf?
3. Ask the companion to show you nearby creatures. Does it call /scan and display the real ASCII art and catch rates, or does it just describe things in text?
4. Ask the companion to help you catch something. Does it guide you through the process step by step? Does it celebrate or react to the outcome?
5. Try asking a strategic question like "which creature should I breed?" or "what should I do next?" — does the companion give useful, personalized advice based on your actual game state?
6. Try a vague or casual request like "yeah do it" or "the rare one" — does the companion parse your intent correctly?
7. Test whether the companion keeps the session going with follow-up suggestions, or if it feels like a dead end after each action.
8. Evaluate the overall experience: Is /play a better entry point for new players than using individual commands? Does it reduce friction and make the game more engaging?

Focus on: onboarding quality, conversational fluency, whether the companion actually calls game tools vs. just narrating, advice quality, session flow and momentum, and whether /play makes the game feel more alive than raw slash commands.${REPORT_FORMAT}`,
  },
];

export function getAllScenarios(): Scenario[] {
  return SCENARIOS;
}

export function getScenario(id: ScenarioId): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
