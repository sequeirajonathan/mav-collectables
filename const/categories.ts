import { CategoryGroup } from "@interfaces";

interface SquareCategory {
  displayName: string;
  slug: string;
  squareCategoryId: string;
}

// --- Full TCG Categories (Production) ---
const FULL_CATEGORY_MAPPING: Record<string, SquareCategory> = {
  pokemon: {
    displayName: "Pokémon TCG",
    slug: "pokemon",
    squareCategoryId: "JLGE7O4IOUUW36IB6ZJYWKUU",
  },
  dragonball: {
    displayName: "Dragon Ball Super TCG",
    slug: "dragonball",
    squareCategoryId: "CQ3NSXZ4V3Q5ZHCMS4WS3YP6",
  },
  onepiece: {
    displayName: "One Piece Card Game",
    slug: "onepiece",
    squareCategoryId: "B6KGCQABXQDHFISWSRBS4QHF",
  },
  yugioh: {
    displayName: "Yu-Gi-Oh!",
    slug: "yugioh",
    squareCategoryId: "PLVAPCRCS4TJYIBC7CDALXYK",
  },
  magic: {
    displayName: "Magic The Gathering",
    slug: "magic",
    squareCategoryId: "LXZB7FOIRUA2YASQFGDHL2EF",
  },
  weiss: {
    displayName: "Weiss Schwarz",
    slug: "weiss",
    squareCategoryId: "LQFRABCCR6DAFY4PSUWMO224",
  },
  digimon: {
    displayName: "Digimon",
    slug: "digimon",
    squareCategoryId: "SGHRJGTL6NRQZ7KZ2MUTK2YA",
  },
  metazoo: {
    displayName: "Metazoo",
    slug: "metazoo",
    squareCategoryId: "ZIAZS6CHBXSSNYAZZFYHVXNL",
  },
  union: {
    displayName: "Union Arena",
    slug: "union",
    squareCategoryId: "4VRRPJ3MOQWD2SOCVTV6YD2X",
  },
  universe: {
    displayName: "Uni Verses",
    slug: "universe",
    squareCategoryId: "RWSUXUIFXXKHNGE4IZMECBBU",
  },
  lorcana: {
    displayName: "Lorcana",
    slug: "lorcana",
    squareCategoryId: "ULPV5UD3L5JKS52EYP7F64NX",
  },
  fleshblood: {
    displayName: "Flesh & Blood TCG",
    slug: "fleshblood",
    squareCategoryId: "Z4TJ2BADGYQJSUPJUH2Y3422",
  },
  starwars: {
    displayName: "Star Wars Unlimited",
    slug: "starwars",
    squareCategoryId: "VTABJTWESVYYHE5SXAH4NKJE",
  },
  grandarchive: {
    displayName: "Grand Archive",
    slug: "grandarchive",
    squareCategoryId: "5LEDQBMCJINSREERRQL4J2SG",
  },
  soulmasters: {
    displayName: "Soul Masters TCG",
    slug: "soulmasters",
    squareCategoryId: "GESEFRWGMQAWUAGSEDQ2WMLB",
  },
  pokemonsingles: {
    displayName: "Pokemon - Singles",
    slug: "pokemonsingles",
    squareCategoryId: "ZPLTFCCZRS3FENOS4324RK4E",
  },
  squareenix: {
    displayName: "Square Enix",
    slug: "squareenix",
    squareCategoryId: "2UYGU6IBT5CC2XHPOFISKRDC",
  },
};

// --- Sandbox TCG Categories (Only Pokémon) ---
const SANDBOX_CATEGORY_MAPPING: Record<string, SquareCategory> = {
  pokemon: {
    displayName: "Pokémon TCG",
    slug: "pokemon",
    squareCategoryId: "OSKD2GY6HCWDQS5UQDEXQ2NM",
  },
};

// --- Main TCG Categories (Environment-aware) ---
export const CATEGORY_MAPPING: Record<string, SquareCategory> = 
  process.env.SQUARE_ENVIRONMENT === 'production' 
    ? FULL_CATEGORY_MAPPING 
    : SANDBOX_CATEGORY_MAPPING;

// --- Collectibles ---
export const COLLECTIBLES_MAPPING: Record<string, SquareCategory> = {
  figures: {
    displayName: "Figures",
    slug: "figures",
    squareCategoryId: "HEUDTMZDNG5LLI3ZSCCC2KIL",
  },
  funko: {
    displayName: "Funko",
    slug: "funko",
    squareCategoryId: "DMXYKGGPUSSZZBZMRC5LNLPV",
  },
  plushies: {
    displayName: "Plushies",
    slug: "plushies",
    squareCategoryId: "Y3HB2FYHP74AAKQ3MNMOQRYU",
  },
  toys: {
    displayName: "Toys",
    slug: "toys",
    squareCategoryId: "Y5QMJDVTICGYS63MD5G3MIXA",
  },
  bandai: {
    displayName: "Bandai Namco",
    slug: "bandai",
    squareCategoryId: "2WGAXPFOCVU6E3YCKLENXCBZ",
  }
};

// --- Supplies & Grading ---
export const SUPPLIES_MAPPING: Record<string, SquareCategory> = {
  supplies: {
    displayName: "Hobby Supplies",
    slug: "supplies",
    squareCategoryId: "5PVJ4PTPSZQOWQAPNX2ABSZY",
  },
  psa: {
    displayName: "PSA Graded Slabs",
    slug: "psa",
    squareCategoryId: "POBB6MGCLVUC2DPPTPMLBLIL",
  },
  beckett: {
    displayName: "Beckett Graded Slabs",
    slug: "beckett",
    squareCategoryId: "E4QEHP25KV63OP5BVG6BAWN5",
  },
  cgc: {
    displayName: "CGC Graded Slabs",
    slug: "cgc",
    squareCategoryId: "QWH464QRNC725KULVO6XJAP5",
  },
  tag: {
    displayName: "Tag Graded Slabs",
    slug: "tag",
    squareCategoryId: "BDXDK3UHNCYVGDP7XTXEGGGV",
  },
  gradedguard: {
    displayName: "Graded Guard",
    slug: "gradedguard",
    squareCategoryId: "6RZANZZZ62FG33XW6AMMC5OI",
  },
};

// --- Grouped for Navigation/Filtering ---
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: "TCG",
    categories: Object.values(CATEGORY_MAPPING),
  },
  {
    name: "Collectibles",
    categories: Object.values(COLLECTIBLES_MAPPING),
  },
  {
    name: "Supplies & Grading",
    categories: Object.values(SUPPLIES_MAPPING),
  },
];

export const CATEGORY_GROUP_SLUGS: Record<string, string[]> = {
  tcg: Object.values(CATEGORY_MAPPING).map((cat) => cat.squareCategoryId),
  collectibles: Object.values(COLLECTIBLES_MAPPING).map(
    (cat) => cat.squareCategoryId
  ),
  supplies: Object.values(SUPPLIES_MAPPING).map((cat) => cat.squareCategoryId),
};
