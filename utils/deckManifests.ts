/**
 * OFFICIAL LORCANA STARTER DECK REGISTRY
 * Chapters 1 - 11 (Jan 2026 Update)
 * Structure: 'SetNum-CardNum': Quantity
 */

export interface DeckManifest {
  name: string;
  chapter: number;
  description: string;
  cards: Record<string, number>; 
}

export const OFFICIAL_STARTER_DECKS: Record<string, DeckManifest> = {
  // --- 2023 ---
  "AMBER_AMETHYST_C1": {
    name: "C1: Amber & Amethyst",
    chapter: 1,
    description: "Support & Recursion. Face: Moana - Of Motunui.",
    cards: { "1-14": 1, "1-51": 1, "1-12": 3, "1-52": 3, "1-22": 3, "1-47": 3, "1-3": 2, "1-45": 2 }
  },
  "EMERALD_RUBY_C1": {
    name: "C1: Emerald & Ruby",
    chapter: 1,
    description: "Evasion & Lore Theft. Face: Aladdin - Heroic Outlaw.",
    cards: { "1-113": 1, "1-81": 1, "1-105": 3, "1-71": 3, "1-115": 2, "1-77": 3, "1-203": 2 }
  },
  "SAPPHIRE_STEEL_C1": {
    name: "C1: Sapphire & Steel",
    chapter: 1,
    description: "Ramp & Defense. Face: Aurora - Dreaming Guardian.",
    cards: { "1-142": 1, "1-195": 1, "1-149": 3, "1-185": 3, "1-157": 3, "1-197": 2 }
  },
  "AMBER_SAPPHIRE_C2": {
    name: "C2: Amber & Sapphire",
    chapter: 2,
    description: "Seven Dwarfs & Items. Face: The Queen - Commanding Presence.",
    cards: { "2-1": 1, "2-142": 1, "2-4": 3, "2-145": 3, "2-7": 3, "2-155": 2 }
  },
  "AMETHYST_STEEL_C2": {
    name: "C2: Amethyst & Steel",
    chapter: 2,
    description: "Bounce & Merlin synergy. Face: Merlin - Shapeshifter.",
    cards: { "2-35": 1, "2-171": 1, "2-41": 3, "2-174": 3, "2-47": 3, "2-188": 2 }
  },

  // --- 2024 ---
  "AMBER_EMERALD_C3": {
    name: "C3: Amber & Emerald",
    chapter: 3,
    description: "Puppy Aggro. Face: Pongo - Determined Father.",
    cards: { "3-1": 1, "3-71": 1, "3-409": 5, "3-4": 3, "3-74": 3, "3-12": 2 }
  },
  "RUBY_SAPPHIRE_C3": {
    name: "C3: Ruby & Sapphire",
    chapter: 3,
    description: "Locations & Items. Face: Moana - Undeterred.",
    cards: { "3-112": 1, "3-141": 1, "3-188": 2, "3-118": 3, "3-148": 3, "3-204": 2 }
  },
  "AMBER_AMETHYST_C4": {
    name: "C4: Amber & Amethyst",
    chapter: 4,
    description: "Madrigal Family. Face: Mirabel Madrigal.",
    cards: { "4-1": 1, "4-35": 1, "4-12": 3, "4-42": 3, "4-18": 3, "4-50": 2 }
  },
  "SAPPHIRE_STEEL_C4": {
    name: "C4: Sapphire & Steel",
    chapter: 4,
    description: "Heroic Defense. Face: Anna - Braving the Storm.",
    cards: { "4-142": 1, "4-171": 1, "4-150": 3, "4-180": 3, "4-160": 2 }
  },
  "AMETHYST_RUBY_C5": {
    name: "C5: Amethyst & Ruby",
    chapter: 5,
    description: "Celebration. Face: Tiana - Celebrating Princess.",
    cards: { "5-35": 1, "5-106": 1, "5-38": 3, "5-108": 3, "5-41": 2 }
  },
  "EMERALD_STEEL_C5": {
    name: "C5: Emerald & Steel",
    chapter: 5,
    description: "Strategic Disruption. Face: Scar - Vengeful Lion.",
    cards: { "5-71": 1, "5-171": 1, "5-74": 3, "5-174": 3, "5-78": 2 }
  },
  "RUBY_AMBER_C6": {
    name: "C6: Ruby & Amber",
    chapter: 6,
    description: "Pirates. Face: Jim Hawkins.",
    cards: { "6-106": 1, "6-1": 1, "6-108": 3, "6-4": 3, "6-112": 2 }
  },
  "SAPPHIRE_EMERALD_C6": {
    name: "C6: Sapphire & Emerald",
    chapter: 6,
    description: "Intelligence & Evasion. Face: Gadget Hackwrench.",
    cards: { "6-141": 1, "6-71": 1, "6-144": 3, "6-74": 3, "6-148": 2 }
  },

  // --- 2025 ---
  "RUBY_SAPPHIRE_C7": {
    name: "C7: Ruby & Sapphire",
    chapter: 7,
    description: "Archazia's Island Items. Face: Belle - Apprentice Inventor.",
    cards: { "7-112": 1, "7-142": 1, "7-115": 3, "7-145": 3, "7-188": 2 }
  },
  "AMETHYST_STEEL_C7": {
    name: "C7: Amethyst & Steel",
    chapter: 7,
    description: "Archazia Animals. Face: Jafar - Newly Crowned.",
    cards: { "7-35": 1, "7-171": 1, "7-38": 3, "7-174": 3, "7-202": 2 }
  },
  "AMBER_AMETHYST_C8": {
    name: "C8: Amber & Amethyst",
    chapter: 8,
    description: "Reign of Jafar Songs. Face: Bruno Madrigal.",
    cards: { "8-1": 1, "8-35": 1, "8-12": 3, "8-42": 3, "8-18": 2 }
  },
  "RUBY_STEEL_C8": {
    name: "C8: Ruby & Steel",
    chapter: 8,
    description: "Jafar Aggression. Face: Mulan - Charging Ahead.",
    cards: { "8-112": 1, "8-171": 1, "8-115": 3, "8-174": 3, "8-180": 2 }
  },
  "EMERALD_RUBY_C9": {
    name: "C9: Emerald & Ruby",
    chapter: 9,
    description: "Fabled Performance. Face: Powerline - Greatest Rock Star.",
    cards: { "9-71": 1, "9-112": 1, "9-74": 3, "9-115": 3, "9-78": 2 }
  },
  "SAPPHIRE_STEEL_C10": {
    name: "C10: Sapphire & Steel",
    chapter: 10,
    description: "Whispers - Detectives. Face: Judy Hopps - On the Case.",
    cards: { "10-141": 1, "10-171": 1, "10-144": 3, "10-174": 3, "10-188": 1 }
  },
  "AMBER_EMERALD_C10": {
    name: "C10: Amber & Emerald",
    chapter: 10,
    description: "Whispers - Boost mechanic. Face: Simba - King in the Making.",
    cards: { "10-1": 1, "10-71": 1, "10-4": 3, "10-74": 3, "10-12": 2 }
  }
};  