import { CardData } from '../types';

const REMOTE_URL = 'https://lorcanajson.org/files/current/en/allCards.json';
const LOCAL_URL = './allCards.json'; // Relative path for robustness
const CACHE_KEY = 'deckforge_library_v3'; // Bumped version to invalidate old/empty cache
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 Days

// LOGIC-FIRST MODE: No caching images, Pure Data Pipe.

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
  let cachedData: { timestamp: number, cards: CardData[] } | null = null;

  // 1. Attempt to Load from Cache
  try {
    const cachedString = localStorage.getItem(CACHE_KEY);
    if (cachedString) {
      cachedData = JSON.parse(cachedString);
    }
  } catch (e) {
    console.warn("DeckForge: Cache corrupted. Clearing.", e);
    localStorage.removeItem(CACHE_KEY);
    cachedData = null;
  }

  // 2. Evaluate Cache Freshness
  if (cachedData) {
    if (Date.now() - cachedData.timestamp < CACHE_EXPIRY && cachedData.cards.length > 0) {
      console.log("DeckForge: Cache Hit (Fresh).");
      return cachedData.cards;
    }
    console.log("DeckForge: Cache Hit (Stale or Empty). Attempting refresh...");
  }

  // 3. Network Fetch Chain
  let fetchedCards: CardData[] = [];
  let sourceUsed = 'None';

  // Attempt 1: Remote (LorcanaJSON)
  try {
    console.log(`[System] Contacting Remote Library (${REMOTE_URL})...`);
    // Add cache buster to prevent browser from serving 404s from disk cache
    const response = await fetch(REMOTE_URL);
    if (response.ok) {
        const data = await response.json();
        if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
            fetchedCards = data.cards;
            sourceUsed = 'Remote (LorcanaJSON)';
            console.log("[System] Remote fetch successful.");
        }
    } else {
        console.warn(`[System] Remote fetch returned ${response.status}`);
    }
  } catch (e) {
    console.warn("[System] Remote fetch failed (CORS/Network):", e);
  }

  // Attempt 2: Local Fallback (if Remote failed)
  if (fetchedCards.length === 0) {
    try {
        console.log(`[System] Falling back to local asset (${LOCAL_URL})...`);
        const response = await fetch(LOCAL_URL);
        if (response.ok) {
            const data = await response.json();
            if (data.cards && Array.isArray(data.cards) && data.cards.length > 0) {
                fetchedCards = data.cards;
                sourceUsed = 'Local Asset (allCards.json)';
                console.log("[System] Local fetch successful.");
            } else {
               console.warn("[System] Local asset found but data structure invalid or empty.");
            }
        } else {
            console.warn(`[System] Local fetch failed with status: ${response.status}`);
        }
    } catch (e) {
        console.warn("[System] Local fetch failed:", e);
    }
  }

  // Attempt 3: Hardcoded Templates (if both failed)
  if (fetchedCards.length === 0) {
     console.warn("[System] Critical Failure. Using Starter Deck Templates.");
     
     // Recovery: Use Stale Cache if available and better than templates
     if (cachedData && cachedData.cards.length > 0) {
         console.warn("[System] Serving Stale Cache as last resort.");
         return cachedData.cards;
     }

     // Final Fallback
     return STARTER_DECK_TEMPLATES.map(c => ({...c, Image: ''}));
  }

  // Logic-First Mode: Strip Images & Hydrate
  const processedCards = fetchedCards.map(card => ({
      ...card,
      Image: '' // Enforce No Images
    }));

  // Update Cache (Only if we got real data)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      cards: processedCards
    }));
    console.log(`DeckForge: Cache Updated from ${sourceUsed}.`);
  } catch (writeError) {
    console.warn("DeckForge: Cache Write Failed (Quota Exceeded?)", writeError);
  }
  
  return processedCards;
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