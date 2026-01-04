import { CardData } from '../types';

const API_URL = 'https://lorcanajson.org/files/current/en/allCards.json';
// Using a standard public CORS proxy. 
// If this fails, the app now gracefully degrades to "Text Mode" via CSS.
const PROXY_BASE = 'https://wsrv.nl/?url=';

const CACHE_KEY = 'deckforge_cards_v1';
const CACHE_TIMESTAMP_KEY = 'deckforge_timestamp_v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 Days

export const getProxiedImageUrl = (originalUrl: string): string => {
  if (!originalUrl) return '';
  let fullUrl = originalUrl;
  if (!fullUrl.startsWith('http')) {
      const cleanPath = fullUrl.startsWith('/') ? fullUrl.substring(1) : fullUrl;
      fullUrl = `https://lorcanajson.org/${cleanPath}`;
  }
  const cleanUrl = fullUrl.replace(/^https?:\/\//, '');
  return `${PROXY_BASE}${encodeURIComponent(cleanUrl)}`; 
};

export const getStarterDeck = (): CardData[] => {
  const deck: CardData[] = [];
  let i = 0;
  while (deck.length < 60) {
    const template = STARTER_DECK_TEMPLATES[i % STARTER_DECK_TEMPLATES.length];
    deck.push({
      ...template,
      Image: getProxiedImageUrl(template.Image)
    });
    i++;
  }
  return deck;
};

export const fetchFullLibrary = async (): Promise<CardData[]> => {
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp, 10);
      if (age < CACHE_DURATION) return JSON.parse(cachedData);
    }
  } catch (e) {
    console.warn("Cache read error", e);
  }

  try {
    const response = await fetch(API_URL); // Note: This might block on CORS if not proxied
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    const cards = data.cards || [];
    
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cards));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {}
    
    return cards;
  } catch (e) {
    return [];
  }
};

// ENHANCED STARTER DECK - Populated with text data for CSS Fallback
const STARTER_DECK_TEMPLATES: CardData[] = [
  {
    Set_Num: 1, Card_Num: 1, Name: "The Queen", Cost: 5, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 4, Willpower: 5, Lore: 2, Rarity: "Rare", 
    Image: "https://lorcanajson.org/images/cards/english/001/001.jpg",
    Abilities: ["Wicked and Vain: Exert - Opposing character gets -4 Strength this turn."],
    Flavor_Text: "Who is the fairest of them all?"
  },
  {
    Set_Num: 1, Card_Num: 12, Name: "Mickey Mouse", Cost: 3, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 3, Willpower: 3, Lore: 2, Rarity: "Uncommon", 
    Image: "https://lorcanajson.org/images/cards/english/001/012.jpg",
    Flavor_Text: "True Friend. Gosh, it sure is swell to see ya!"
  },
  {
    Set_Num: 1, Card_Num: 23, Name: "Stitch", Cost: 6, Inkable: true, Type: "Character", Class: "Floodborn", 
    Strength: 3, Willpower: 5, Lore: 3, Rarity: "Super Rare", 
    Image: "https://lorcanajson.org/images/cards/english/001/023.jpg",
    Abilities: ["Shift 4 (You may pay 4 ink to play this on top of one of your Stitch characters).", "Adoring Fans: When you play this character, you may exert all opposing characters."],
  },
  {
    Set_Num: 1, Card_Num: 66, Name: "Dr. Facilier", Cost: 7, Inkable: false, Type: "Character", Class: "Floodborn", 
    Strength: 4, Willpower: 5, Lore: 3, Rarity: "Rare", 
    Image: "https://lorcanajson.org/images/cards/english/001/066.jpg",
    Abilities: ["Shift 5", "Into the Shadows: Whenever one of your other characters is banished in a challenge, you may return that card to your hand."],
  },
  {
    Set_Num: 1, Card_Num: 36, Name: "Magic Broom", Cost: 2, Inkable: true, Type: "Character", Class: "Dreamborn", 
    Strength: 2, Willpower: 2, Lore: 1, Rarity: "Common", 
    Image: "https://lorcanajson.org/images/cards/english/001/036.jpg",
    Abilities: ["Sweep: When you play this character, you may shuffle a card from any discard into its player's deck."]
  },
  {
    Set_Num: 1, Card_Num: 106, Name: "Maleficent", Cost: 9, Inkable: false, Type: "Character", Class: "Storyborn", 
    Strength: 7, Willpower: 5, Lore: 2, Rarity: "Legendary", 
    Image: "https://lorcanajson.org/images/cards/english/001/112.jpg",
    Abilities: ["Dragon Fire: When you play this character, you may banish chosen opposing character."]
  },
  {
    Set_Num: 1, Card_Num: 142, Name: "Belle", Cost: 4, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 2, Willpower: 4, Lore: 3, Rarity: "Epic", 
    Image: "https://lorcanajson.org/images/cards/english/001/142.jpg",
    Abilities: ["Read a Book: During your turn, you may put an additional card from your hand into your inkwell face down."]
  },
  {
    Set_Num: 1, Card_Num: 196, Name: "Smash", Cost: 3, Inkable: true, Type: "Action", Rarity: "Uncommon", 
    Image: "https://lorcanajson.org/images/cards/english/001/196.jpg",
    Flavor_Text: "Deal 3 damage to chosen character.",
    Abilities: ["Deal 3 damage to chosen character."]
  },
  {
    Set_Num: 1, Card_Num: 128, Name: "Be Prepared", Cost: 7, Inkable: false, Type: "Song", Rarity: "Rare", 
    Image: "https://lorcanajson.org/images/cards/english/001/128.jpg",
    Abilities: ["Banish all characters.", "(A character with cost 7 or more can Exert to sing this song for free.)"]
  },
  {
    Set_Num: 1, Card_Num: 119, Name: "Robin Hood", Cost: 6, Inkable: true, Type: "Character", Class: "Storyborn", 
    Strength: 4, Willpower: 4, Lore: 2, Rarity: "Rare", 
    Image: "https://lorcanajson.org/images/cards/english/001/119.jpg",
    Abilities: ["Good Shot: During your turn, this character gains Evasive. (They can challenge characters with Evasive)."]
  }
];