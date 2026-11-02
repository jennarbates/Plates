// Plain language summaries of the draft Rental Agreement Package.
// Bracketed values in that draft are shown here as they stand, pending attorney review.
export const agreementVersion = "draft-2026-11-01";

export const faqGroups = [
  {
    title: "Setups",
    items: [
      { preview: true, question: "How long do we get the table?", answer: "A base package includes 2 hours on site. Each extra hour costs $25." },
      { preview: true, question: "Where can you set up?", answer: "Anywhere in the Amherst and Five College area that allows it. You need any park, campus or building permission, and we need to know about stairs, long walks or limited parking." },
      { preview: true, question: "Do I have to clean up?", answer: "No. We deliver, arrange and collect everything for a styled setup. If you clear the table before we arrive, just scrape off the food." },
      { preview: false, question: "Do you make the food?", answer: "No. When a package includes pastries or tea, we buy them from a licensed bakery or shop and serve them as packaged." },
      { preview: false, question: "Are real candles allowed?", answer: "Setups use LED candles by default. If you add real candles, you are responsible for them and for following dorm or campus fire rules." },
    ],
  },
  {
    title: "Rentals and kits",
    items: [
      { preview: false, question: "How long is a rental?", answer: "The standard rental period is 3 days. You can extend a pan or bake kit by 1 day for $2 per pan if no one else has booked it." },
      { preview: false, question: "How do pickup and return work?", answer: "You pick up and return at our pickup location. Look everything over at pickup and point out any damage right away." },
      { preview: false, question: "Do I wash everything before returning it?", answer: "Dinnerware only needs the food scraped off. Pans must come back clean, dry and free of batter in every crease." },
      { preview: false, question: "Can dishes go in the oven or dishwasher?", answer: "No. Only baking pans are meant for heat, and they follow the temperature on their tag. Everything is hand wash only." },
    ],
  },
  {
    title: "Damage and deposits",
    items: [
      { preview: false, question: "What if something breaks?", answer: "You pay the replacement price for that piece. We email an itemized list with photos before charging your card. Normal age and wear on our condition record is never charged." },
      { preview: true, question: "What does the damage waiver cover?", answer: "For 10% of the rental fee, we waive replacement charges for accidental damage to up to 2 pieces in Tier 1 or Tier 2. It does not cover Tier 3 or 4 pieces, lost items or misuse such as a dishwasher." },
      { preview: false, question: "When do you hold the security deposit?", answer: "We place a card hold the day before your event or pickup. It is released within 5 business days after inspection, minus any charges." },
    ],
  },
  {
    title: "Vintage and lead",
    items: [
      { preview: false, question: "Are vintage dishes lead free?", answer: "We can't promise that. Pieces made before 1971, and some later imports, may contain lead or cadmium in the glaze, decoration or gold trim. Read Addendum B on our policies page before you book." },
      { preview: false, question: "Can I use modern plates instead?", answer: "Yes. We can swap in modern pieces on request, or use vintage plates as chargers under modern ones." },
      { preview: false, question: "Are pans safe for allergies?", answer: "Pans are shared and washed by hand, so we can't promise one has never touched nuts, gluten, dairy, eggs or other allergens." },
    ],
  },
  {
    title: "Cancellations",
    items: [
      { preview: false, question: "What if I cancel a setup?", answer: "We keep the booking deposit and don't charge the balance. If you cancel less than 24 hours before or don't show, the full package price is owed." },
      { preview: false, question: "What if I cancel a pan or bake kit?", answer: "7 or more days before is a full refund. Under 7 days is a 50% refund. Under 24 hours or a no show gets no refund." },
      { preview: false, question: "Can I reschedule?", answer: "Once, at no charge, if you ask at least 7 days ahead and a new date is open within 60 days. Your deposit moves with you." },
      { preview: false, question: "What about bad weather?", answer: "If weather makes an outdoor setup unsafe, we offer an indoor setup at the same price or a new date." },
    ],
  },
];

export const agreementPoints = [
  "A booking is confirmed only after you sign and pay. The booking deposit is nonrefundable.",
  "You keep a card on file. We may charge it for replacement costs, late fees and cleaning fees above your security deposit, after emailing an itemized list with photos.",
  "No dishwasher, microwave, oven or freezer for dinnerware. Keep rental items away from open flames.",
  "Pans are hand wash only. Never bake above the temperature on the tag, and return them clean and dry.",
  "If you break, chip or lose a piece, you pay its replacement price. Broken pieces must be returned to us.",
  "You must be at least 18. You use rental items at your own risk and are responsible for your guests' safety and any food you make or bring.",
  "Our total liability will not exceed the fees you paid for the rental.",
];

export const addendumPoints = [
  "I have read Addendum B.",
  "I understand rental items have not been tested for lead or other metals.",
  "I will share this information with guests where it matters.",
  "I accept these risks for myself and my guests.",
];
