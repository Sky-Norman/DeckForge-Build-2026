import { CardData } from '../types';

const API_URL = 'https://lorcanajson.org/files/current/en/allCards.json';

// LOGIC-FIRST MODE: No caching, No images. Pure Data Pipe.

export const getStarterDeck = (): CardData[] => {
  const deck: CardData[] = [];
  let i = 0;
  while (deck.length < 60) {
    const template = STARTER_DECK_TEMPLATES[i % STARTER_DECK_TEMPLATES.length];
    deck.push({
      ...template,
      Image: '' 
    });
    i++;
  }
  return deck;
};

export const fetchFullLibrary = async (): Promise<CardData[]> => {
  try {
    // Direct Fetch - No Local Storage Caching
    const response = await fetch(API_URL);
    
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
    
    const data = await response.json();
    let cards: CardData[] = data.cards || [];
    
    // Logic-First Mode: Strip Images & Hydrate
    return cards.map(card => ({
        ...card,
        Image: '' // Enforce No Images
    }));
  } catch (e) {
    console.error("Library fetch failed:", e);
    return [];
  }
};

// FALLBACK TEXT TEMPLATES
const STARTER_DECK_TEMPLATES: CardData[] = [
  {
    Set_Num: 1, Card_Num: 1, Name: "The Queen", Cost: 5, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 4, Willpower: 5, Lore: 2, Rarity: "Rare", 
    Image: "",
    Abilities: ["Wicked and Vain: Exert - Opposing character gets -4 Strength this turn."],
    Flavor_Text: "Who is the fairest of them all?"
  },
  {
    Set_Num: 1, Card_Num: 12, Name: "Mickey Mouse", Cost: 3, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 3, Willpower: 3, Lore: 2, Rarity: "Uncommon", 
    Image: "",
    Flavor_Text: "True Friend. Gosh, it sure is swell to see ya!"
  },
  {
    Set_Num: 1, Card_Num: 23, Name: "Stitch", Cost: 6, Inkable: true, Type: "Character", Class: "Floodborn", 
    Strength: 3, Willpower: 5, Lore: 3, Rarity: "Super Rare", 
    Image: "",
    Abilities: ["Shift 4 (You may pay 4 ink to play this on top of one of your Stitch characters).", "Adoring Fans: When you play this character, you may exert all opposing characters."],
  },
  {
    Set_Num: 1, Card_Num: 66, Name: "Dr. Facilier", Cost: 7, Inkable: false, Type: "Character", Class: "Floodborn", 
    Strength: 4, Willpower: 5, Lore: 3, Rarity: "Rare", 
    Image: "",
    Abilities: ["Shift 5", "Into the Shadows: Whenever one of your other characters is banished in a challenge, you may return that card to your hand."],
  },
  {
    Set_Num: 1, Card_Num: 36, Name: "Magic Broom", Cost: 2, Inkable: true, Type: "Character", Class: "Dreamborn", 
    Strength: 2, Willpower: 2, Lore: 1, Rarity: "Common", 
    Image: "",
    Abilities: ["Sweep: When you play this character, you may shuffle a card from any discard into its player's deck."]
  },
  {
    Set_Num: 1, Card_Num: 106, Name: "Maleficent", Cost: 9, Inkable: false, Type: "Character", Class: "Storyborn", 
    Strength: 7, Willpower: 5, Lore: 2, Rarity: "Legendary", 
    Image: "",
    Abilities: ["Dragon Fire: When you play this character, you may banish chosen opposing character."]
  },
  {
    Set_Num: 1, Card_Num: 142, Name: "Belle", Cost: 4, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 2, Willpower: 4, Lore: 3, Rarity: "Epic", 
    Image: "",
    Abilities: ["Read a Book: During your turn, you may put an additional card from your hand into your inkwell face down."]
  },
  {
    Set_Num: 1, Card_Num: 196, Name: "Smash", Cost: 3, Inkable: true, Type: "Action", Rarity: "Uncommon", 
    Image: "",
    Flavor_Text: "Deal 3 damage to chosen character.",
    Abilities: ["Deal 3 damage to chosen character."]
  },
  {
    Set_Num: 1, Card_Num: 128, Name: "Be Prepared", Cost: 7, Inkable: false, Type: "Song", Rarity: "Rare", 
    Image: "",
    Abilities: ["Banish all characters.", "(A character with cost 7 or more can Exert to sing this song for free.)"]
  },
  {
    Set_Num: 1, Card_Num: 119, Name: "Robin Hood", Cost: 6, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 4, Willpower: 4, Lore: 2, Rarity: "Rare", 
    Image: "",
    Abilities: ["Good Shot: During your turn, this character gains Evasive. (They can challenge characters with Evasive)."]
  }
];