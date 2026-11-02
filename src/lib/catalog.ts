// Catalog data from the website plan, bake kit menu and rental agreement drafts.
// Pan and bake kit prices come from the menu. Rental prices for individual
// pieces are DRAFTS, and the piece list holds auction lots that were winning on
// Nov 1, 2026. Swap in the Lots Won list and real prices before launch.

import type { PhotoKind } from "@/components/Photo";
import { money } from "@/lib/site";

export type Package = {
  slug: string;
  name: string;
  price: number;
  includes: string[];
};

const sharedIncludes = [
  "A vintage china table for two",
  "We set up, style and clear it all away",
  "2 hours on site and LED candles",
];

export const packages: Package[] = [
  { slug: "sweet-gesture", name: "Sweet Gesture", price: 95, includes: sharedIncludes },
  { slug: "full-tea", name: "Full Tea", price: 145, includes: sharedIncludes },
  { slug: "showstopper", name: "Showstopper", price: 225, includes: sharedIncludes },
];

export const packageDetailsNote = "[What each package adds: to fill from the setup checklists]";

export type AddOn = { id: string; name: string; price: number };

export const addOns: AddOn[] = [
  { id: "bouquet", name: "Bouquet", price: 35 },
  { id: "polaroid", name: "Polaroid", price: 20 },
  { id: "garland", name: "Balloon garland or sign", price: 40 },
  { id: "bake-together", name: "Bake it together", price: 15 },
  { id: "outdoor", name: "Outdoor setup", price: 25 },
  { id: "rush", name: "Rush booking", price: 20 },
];

export const extraHourPrice = 25;
export const feb14Surcharge = 25;
export const setupSecurityDeposit = 100;

export const groupOptions = {
  minGuests: 4,
  maxGuests: 10,
  setupOnly: 30,
  withPastries: 45,
  bakeBar: 8,
};

export const categories = [
  { slug: "dinnerware", name: "Dinnerware" },
  { slug: "teaware", name: "Teaware" },
  { slug: "glassware", name: "Glassware" },
  { slug: "serveware", name: "Serveware" },
  { slug: "table-decor", name: "Table decor" },
  { slug: "baking-pans", name: "Baking pans" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

export type Filters = Record<string, string>;

type BaseItem = {
  slug: string;
  name: string;
  price: number | null;
  deposit: number | null; // null means it is set by order size.
  replacement: string;
  quantity: number;
  filters: Filters;
};

export type Piece = BaseItem & {
  kind: "piece";
  category: Exclude<CategorySlug, "baking-pans">;
  condition: string;
};

export type Pan = BaseItem & { kind: "pan"; category: "baking-pans"; tier: string };

export type KitType = "bake" | "event" | "activity";

export type Kit = BaseItem & {
  kind: "kit";
  kitType: KitType;
  contents: string[];
  serves?: string;
  howItWorks?: string;
  available: boolean;
};

export type RentalItem = Piece | Pan | Kit;

const everyday = "$12 per piece";
const fineCup = "$45 per cup and saucer set";
const serving = "Priced one by one on your order form";
const conditionNote = "Condition notes added after the pieces are inspected.";

function piece(
  slug: string,
  name: string,
  category: Piece["category"],
  quantity: number,
  price: number,
  replacement: string,
  filters: Filters,
): Piece {
  return {
    kind: "piece",
    slug,
    name,
    category,
    quantity,
    price,
    deposit: null,
    replacement,
    condition: conditionNote,
    filters,
  };
}

export const pieces: Piece[] = [
  piece("white-divided-plates", "White divided dinner plates", "dinnerware", 10, 1, everyday, { "Piece type": "Plate", Color: "White", Pattern: "Plain", Tier: "Everyday" }),
  piece("princess-house-vintage-garden", "Princess House Vintage Garden plates", "dinnerware", 4, 1, everyday, { "Piece type": "Plate", Color: "Green", Pattern: "Floral", Tier: "Everyday" }),
  piece("dansk-flora-plates", "Dansk Flora plates", "dinnerware", 2, 1, everyday, { "Piece type": "Plate", Color: "Blue", Pattern: "Floral", Tier: "Everyday" }),
  piece("botanical-dessert-plates", "Floral botanical dessert plates", "dinnerware", 2, 1, everyday, { "Piece type": "Plate", Color: "Blue", Pattern: "Floral", Tier: "Everyday" }),
  piece("painted-floral-stoneware", "Painted floral stoneware plates", "dinnerware", 8, 1, everyday, { "Piece type": "Plate", Color: "White", Pattern: "Floral", Tier: "Everyday" }),
  piece("seashell-snack-sets", "Seashell snack plates with cups", "dinnerware", 6, 1, everyday, { "Piece type": "Snack set", Color: "White", Pattern: "Shell", Tier: "Everyday" }),
  piece("painted-rice-bowls", "Hand-painted rice bowls", "dinnerware", 4, 1, everyday, { "Piece type": "Bowl", Color: "Blue", Pattern: "Floral", Tier: "Everyday" }),
  piece("asian-teapot-set", "Asian-style teapot with 8 cups", "teaware", 1, 8, serving, { "Piece type": "Teapot set", Color: "Blue", Pattern: "Floral", Tier: "Serving" }),
  piece("gareis-kuhnl-teapot", "Gareis, Kuhnl & Co. floral teapot", "teaware", 1, 8, serving, { "Piece type": "Teapot", Color: "Pink", Pattern: "Floral", Tier: "Serving" }),
  piece("winterling-gold-teacup", "Heinrich Winterling gold tone teacup", "teaware", 1, 2, fineCup, { "Piece type": "Cup and saucer", Color: "Gold", Pattern: "Gold tone", Tier: "Fine china" }),
  piece("bareuther-teacups", "Bareuther Waldsassen teacups", "teaware", 2, 2, fineCup, { "Piece type": "Cup and saucer", Color: "Purple", Pattern: "Floral", Tier: "Fine china" }),
  piece("bavarian-teacups", "Bavarian floral teacups and saucers", "teaware", 3, 2, fineCup, { "Piece type": "Cup and saucer", Color: "Pink", Pattern: "Floral", Tier: "Fine china" }),
  piece("stackable-white-cups", "China Seas stackable white cups", "teaware", 4, 1, everyday, { "Piece type": "Cup", Color: "White", Pattern: "Plain", Tier: "Everyday" }),
  piece("hexagonal-glasses", "Tall hexagonal drinking glasses", "glassware", 20, 1, everyday, { "Piece type": "Glass", Color: "Clear", Pattern: "Hexagonal", Tier: "Everyday" }),
  piece("balmoral-crystal-bowls", "Val Saint Lambert Balmoral dessert bowls", "glassware", 12, 3, serving, { "Piece type": "Bowl", Color: "Clear", Pattern: "Cut crystal", Tier: "Serving" }),
  piece("marigold-glass-bowl", "Imperial marigold glass bowl", "glassware", 1, 4, serving, { "Piece type": "Bowl", Color: "Orange", Pattern: "Pressed glass", Tier: "Serving" }),
  piece("avon-ruby-platter", "Avon Cape Cod ruby platter and dessert pieces", "serveware", 1, 8, serving, { "Piece type": "Platter", Color: "Red", Pattern: "Cape Cod", Tier: "Serving" }),
  piece("avon-ruby-tiered-server", "Avon Cape Cod ruby 2-tiered server", "serveware", 1, 8, serving, { "Piece type": "Tiered server", Color: "Red", Pattern: "Cape Cod", Tier: "Serving" }),
  piece("floral-gold-cake-plate", "Floral and gold cake plate", "serveware", 1, 6, serving, { "Piece type": "Cake plate", Color: "Pink", Pattern: "Floral", Tier: "Serving" }),
  piece("glass-square-tray", "Square footed glass tray", "serveware", 1, 4, serving, { "Piece type": "Tray", Color: "Clear", Pattern: "Plain", Tier: "Serving" }),
  piece("silverplate-cake-set", "Princess House silverplated cake set", "serveware", 1, 6, serving, { "Piece type": "Cake server", Color: "Silver", Pattern: "Silverplate", Tier: "Serving" }),
  piece("evesham-ramekins", "Royal Worcester Evesham ramekins", "serveware", 6, 1, everyday, { "Piece type": "Ramekin", Color: "White", Pattern: "Fruit", Tier: "Everyday" }),
  piece("apilco-ramekins", "Apilco porcelain ramekins", "serveware", 4, 1, everyday, { "Piece type": "Ramekin", Color: "White", Pattern: "Vegetable", Tier: "Everyday" }),
  piece("elkington-tray", "Elkington & Co. tray", "serveware", 1, 8, serving, { "Piece type": "Tray", Color: "Silver", Pattern: "Engraved", Tier: "Serving" }),
  piece("pressed-glass-bud-vases", "Pressed glass bud vases", "table-decor", 4, 2, "$15 to $40, listed on your order form", { "Piece type": "Vase", Color: "Clear", Pattern: "Pressed glass", Tier: "Props" }),
];

const pan1 = { price: 5, deposit: 20, replacement: "$25", tier: "Standard" };
const pan2 = { price: 8, deposit: 20, replacement: "$40", tier: "Vintage specialty" };
const pan3Low = { price: 12, deposit: 40, replacement: "$60 to $90, listed on your order form", tier: "Premium and sets" };
const pan3High = { ...pan3Low, price: 15 };

function pan(
  slug: string,
  name: string,
  terms: typeof pan1,
  shape: string,
  occasion: string,
): Pan {
  return {
    kind: "pan",
    category: "baking-pans",
    slug,
    name,
    quantity: 1,
    ...terms,
    filters: { Shape: shape, Tier: terms.tier, Occasion: occasion },
  };
}

export const pans: Pan[] = [
  pan("heart-pan", "Heart pan", pan1, "Heart", "Valentine's"),
  pan("springform-pan", "Springform pan", pan1, "Round", "Any occasion"),
  pan("mini-muffin-pan", "Mini muffin pan", pan1, "Mini", "Any occasion"),
  pan("number-letter-pan", "Number and letter pan", pan1, "Number", "Birthdays"),
  pan("vintage-bundt", "Vintage Nordic Ware bundt", pan2, "Bundt", "Brunch"),
  pan("madeleine-pan", "Madeleine pan", pan2, "Mini", "Tea parties"),
  pan("lamb-bunny-mold", "Lamb or bunny mold", pan2, "Mold", "Spring"),
  pan("fluted-tart-pan", "Fluted tart pan", pan2, "Round", "Any occasion"),
  pan("glass-gelatin-mold", "Glass gelatin mold", pan2, "Mold", "Retro parties"),
  pan("tiered-round-set", "6, 8 and 10 inch tiered round set", pan3High, "Round", "Showers"),
  pan("cast-aluminum-bundt", "Cast aluminum Nordic Ware", pan3Low, "Bundt", "Brunch"),
  pan("gingerbread-house-pan", "Gingerbread house pan", pan3High, "House", "Holidays"),
];

function kit(
  slug: string,
  name: string,
  kitType: KitType,
  price: number | null,
  deposit: number | null,
  contents: string[],
  filters: Filters,
  extra: Partial<Pick<Kit, "serves" | "howItWorks" | "available">> = {},
): Kit {
  const band = price === null ? "To be priced" : price < 25 ? "Under $25" : price < 50 ? "$25 to $49" : "$50 and up";
  return {
    kind: "kit",
    slug,
    name,
    kitType,
    price,
    deposit,
    contents,
    replacement: "Each piece follows the replacement price list",
    quantity: 1,
    available: true,
    filters: { ...filters, Price: band },
    ...extra,
  };
}

export const kits: Kit[] = [
  kit("galentines-heart", "Galentine's Heart Kit", "bake", 20, 60, ["Heart pan", "Vintage cake plate", "6 dessert plates", "Cake server", "Paper doilies", "Recipe card"], { Season: "January to February" }),
  kit("tea-party-madeleine", "Tea Party Madeleine Kit", "bake", 22, 60, ["Madeleine pan", "Serving plate", "4 vintage teacups and saucers", "Loose tea sampler", "Recipe card"], { Season: "January to February" }),
  kit("bundt-brunch", "Bundt Brunch Kit", "bake", 15, 40, ["Vintage bundt pan", "Cake stand", "Cake server", "Glaze recipe card"], { Season: "November to December" }),
  kit("birthday-number", "Birthday Number Kit", "bake", 15, 40, ["Number or letter pan", "Cake stand", "Cake server", "Candles", "Recipe card"], { Season: "Year round" }),
  kit("gingerbread-house", "Gingerbread House Kit", "bake", 18, 40, ["Gingerbread house pan", "Cake board", "2 piping bags", "Dough and icing recipe card"], { Season: "November to December" }, { available: false }),
  kit("retro-gelatin-mold", "Retro Gelatin Mold Kit", "bake", 12, 30, ["Vintage metal or glass mold", "Serving platter", "Recipe card"], { Season: "November to December" }),
  kit("galentines-table", "Galentine's Table", "event", 40, null, ["6 dessert plates", "6 teacups and saucers", "Avon ruby pieces", "Cake stand", "Cake server", "Doilies"], { Occasion: "Galentine's", "Guest count": "6" }, { serves: "6 guests" }),
  kit("shower-tea", "Shower Tea", "event", 65, null, ["10 teacups and saucers", "10 dessert plates", "2 teapots", "Avon 2-tiered server", "Doilies"], { Occasion: "Showers", "Guest count": "10" }, { serves: "10 guests" }),
  kit("seaside-supper", "Seaside Supper", "event", null, null, ["Lobster plates", "Corn plates", "Corn covered dish", "Seashell snack sets", "Fish dishes"], { Occasion: "Summer suppers", "Guest count": "6" }, { serves: "6 guests", available: false }),
  kit("dessert-table", "Dessert Table", "event", 50, null, ["10 ramekins", "Crystal dessert bowls", "Cake plate", "Glass tray", "Hexagonal glasses", "Candles"], { Occasion: "Birthdays", "Guest count": "10" }, { serves: "10 guests", available: false }),
  kit("friendsgiving-table", "Friendsgiving Table", "event", 55, null, ["8 dinner plates", "8 dessert plates", "2 platters", "Serving pieces"], { Occasion: "Friendsgiving", "Guest count": "8" }, { serves: "8 guests", available: false }),
  kit("tea-leaf-reading", "Tea Leaf Reading", "activity", 25, null, ["4 teacups and saucers", "Teapot", "Loose tea sampler", "Playful reading guide"], { Occasion: "Date night", "Group size": "2 to 4" }, { serves: "2 to 4 people", howItWorks: "Brew the tea, drink most of a cup, then read the leaves with the guide. No oven needed." }),
  kit("bud-vase-bar", "Bud Vase Bar", "activity", 30, null, ["Pressed glass bud vases", "Snips", "Floral tape", "How-to card"], { Occasion: "Showers", "Group size": "4 to 6" }, { serves: "4 to 6 people", howItWorks: "Bring your own flowers, trim them and build a tiny arrangement in each vase. No oven needed." }),
  kit("tea-tasting", "Tea Tasting", "activity", null, null, ["Asian-style teapot with 8 cups", "Loose tea sampler"], { Occasion: "Group nights", "Group size": "8" }, { serves: "8 people", howItWorks: "Brew each tea in turn and compare as you go. No oven needed.", available: false }),
  kit("card-night", "Card Night", "activity", null, null, ["Card suit decanter and glasses", "Playing card dishes", "2 decks of cards"], { Occasion: "Game night", "Group size": "Up to 7" }, { serves: "Up to 7 people", howItWorks: "Fill the suit dishes with snacks, deal the cards and settle in. No oven needed.", available: false }),
  kit("cookie-decorating", "Cookie Decorating Night", "activity", 25, null, ["6 dessert plates", "Small bowls", "Piping bags", "Icing recipe card"], { Occasion: "Group nights", "Group size": "6" }, { serves: "6 people", howItWorks: "Bring plain cookies, mix the icing and decorate. No oven needed.", available: false }),
  kit("still-life-sketch", "Still Life Sketch Night", "activity", 20, null, ["Vintage vase", "Teacup", "Small dish", "Sketch paper", "Pencils", "Prompt card"], { Occasion: "Date night", "Group size": "2 to 4" }, { serves: "2 to 4 people", howItWorks: "Arrange the pieces, follow the prompts and compare your drawings. No oven needed.", available: false }),
];

export const kitTypes: { slug: KitType; name: string; blurb: string; filterKeys: string[] }[] = [
  { slug: "bake", name: "Bake kits", blurb: "A pan plus everything you need to serve the bake, packed in a tote.", filterKeys: ["Season", "Price"] },
  { slug: "event", name: "Event kits", blurb: "A ready-to-style table you pick up and host yourself.", filterKeys: ["Occasion", "Guest count", "Price"] },
  { slug: "activity", name: "Activity kits", blurb: "Something to do together, and none of them need an oven.", filterKeys: ["Occasion", "Group size", "Price"] },
];

export const pieceFilterKeys = ["Piece type", "Color", "Pattern", "Tier"];
export const panFilterKeys = ["Shape", "Tier", "Occasion"];

export type ShopPiece = { slug: string; name: string; maker: string };

export const shopPieces: ShopPiece[] = [
  { slug: "pouyat-limoges", name: "Jean Pouyat Limoges, green and gold", maker: "Jean Pouyat" },
  { slug: "royal-copenhagen-sugar", name: "Royal Copenhagen Blue Flowers sugar bowl", maker: "Royal Copenhagen" },
  { slug: "hammersley-hand-bell", name: "Hammersley floral hand bell", maker: "Hammersley" },
];

// Catalog items inside a kit. Reserving the kit reserves these too.
// Add the rest once each kit's real pieces are assigned.
export const kitComponents: Record<string, { slug: string; quantity: number }[]> = {
  "galentines-heart": [{ slug: "heart-pan", quantity: 1 }],
  "tea-party-madeleine": [{ slug: "madeleine-pan", quantity: 1 }],
  "bundt-brunch": [{ slug: "vintage-bundt", quantity: 1 }],
  "birthday-number": [{ slug: "number-letter-pan", quantity: 1 }],
  "gingerbread-house": [{ slug: "gingerbread-house-pan", quantity: 1 }],
  "retro-gelatin-mold": [{ slug: "glass-gelatin-mold", quantity: 1 }],
  "galentines-table": [{ slug: "avon-ruby-platter", quantity: 1 }],
  "shower-tea": [{ slug: "avon-ruby-tiered-server", quantity: 1 }],
  "bud-vase-bar": [{ slug: "pressed-glass-bud-vases", quantity: 4 }],
  "tea-tasting": [{ slug: "asian-teapot-set", quantity: 1 }],
};

export const allRentals: RentalItem[] = [...pieces, ...pans, ...kits];

export function findRental(slug: string) {
  return allRentals.find((item) => item.slug === slug);
}

export function itemsInCategory(category: CategorySlug): (Piece | Pan)[] {
  return category === "baking-pans" ? pans : pieces.filter((item) => item.category === category);
}

// The agreement sets a $50 to $150 deposit by order size. The breakpoints are drafts.
export function orderDeposit(subtotal: number) {
  if (subtotal <= 0) return 0;
  if (subtotal < 50) return 50;
  return subtotal < 100 ? 100 : 150;
}

export function photoKind(item: RentalItem): PhotoKind {
  if (item.kind === "kit") return "kit";
  if (item.kind === "pan") return "pan";
  const type = item.filters["Piece type"];
  if (type?.startsWith("Teapot")) return "teapot";
  if (type === "Vase") return "vase";
  if (type === "Tiered server") return "tier";
  if (item.category === "glassware") return "glass";
  if (item.category === "teaware") return "cup";
  return "plate";
}

export function priceLabel(item: RentalItem) {
  if (item.price === null) return "Price to come";
  if (item.kind === "piece") return `${money(item.price)} each`;
  return money(item.price);
}
