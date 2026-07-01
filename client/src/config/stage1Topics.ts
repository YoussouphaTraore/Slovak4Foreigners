export interface LessonTopic {
  id: string;
  title: string;
  icon: string;
  lessonIds: string[];
}

export const stage1Topics: LessonTopic[] = [
  // Block 1 - Core Communication
  { id: 'topic-first-words',     title: 'First Words',        icon: '\u{1F4AC}', lessonIds: ['s1-polite-basics', 's1-help-repair'] },
  { id: 'topic-common-verbs',    title: 'Common Verbs',       icon: '\u{26A1}',  lessonIds: ['s1-to-be', 's1-need-want', 's1-speak-understand', 's1-moving-living', 's1-food-money-actions'] },
  { id: 'topic-greetings',       title: 'Greetings',          icon: '\u{1F44B}', lessonIds: ['s1-greetings', 's1-how-are-you'] },
  { id: 'topic-dont-understand', title: "I Don't Understand", icon: '\u{1F937}', lessonIds: ['s1-i-dont-understand', 's1-make-it-clearer'] },
  { id: 'topic-basic-questions', title: 'Basic Questions',    icon: '\u{2753}',  lessonIds: ['s1-question-words'] },

  // Block 2 - Identity
  { id: 'topic-who-i-am',            title: 'About Me',           icon: '\u{1F64B}', lessonIds: ['s1-name-origin', 's1-country-of-origin', 's1-gender-age-status', 's1-height-appearance'] },
  { id: 'topic-body',                title: 'Parts of Body',      icon: '\u{1F4AA}', lessonIds: ['s1-head-area', 's1-limbs', 's1-body', 's1-body-pain'] },
  { id: 'topic-colors',              title: 'Colors',             icon: '\u{1F3A8}', lessonIds: ['s1-basic-colors', 's1-more-colors', 's1-describing-colors'] },
  { id: 'topic-family',              title: 'Family',             icon: '\u{1F46A}', lessonIds: ['s1-partner-children', 's1-parents-siblings', 's1-extended-family', 's1-in-laws-status'] },

  // Block 3 - Numbers & Time
  { id: 'topic-numbers', title: 'Numbers',         icon: '\u{1F522}', lessonIds: ['s1-numbers-0-5', 's1-numbers-6-10', 's1-teen-numbers', 's1-bigger-numbers', 's1-order-1-5', 's1-order-6-10'] },
  { id: 'topic-money',   title: 'Money',           icon: '\u{1F4B6}', lessonIds: ['s1-prices-cost', 's1-paying', 's1-bills-receipts'] },
  { id: 'topic-time',     title: 'Time',     icon: '\u{1F551}', lessonIds: ['s1-parts-of-day', 's1-clock-time', 's1-today-plans'] },
  { id: 'topic-speaking-time', title: 'Speaking in Time', icon: '\u{23F3}', lessonIds: ['s1-speaking-future', 's1-speaking-past'] },
  { id: 'topic-calendar', title: 'Calendar', icon: '\u{1F4C5}', lessonIds: ['s1-days', 's1-weeks', 's1-weeks-in-month', 's1-months-jan-jun', 's1-months-jul-dec', 's1-talking-about-months'] },
  { id: 'topic-say-your-age', title: 'Say Your Age',     icon: '\u{1F382}', lessonIds: ['s1-say-your-age'] },
  { id: 'topic-weather',  title: 'Weather',  icon: '\u{1F327}', lessonIds: ['s1-weather-words', 's1-weather-outside'] },

  // Block 4 - Where You Are
  { id: 'topic-address',    title: 'My Address', icon: '\u{1F3E0}', lessonIds: ['s1-street-city', 's1-apartment-details', 's1-address-on-forms'] },
  { id: 'topic-directions', title: 'Directions', icon: '\u{1F9ED}', lessonIds: ['s1-basic-directions', 's1-here-there', 's1-go-this-way'] },
  { id: 'topic-positions',  title: 'Positions',  icon: '\u{1F4CD}', lessonIds: ['s1-inside-outside', 's1-around-a-place', 's1-above-below-between'] },

  // Block 5 - Emergency & Medical
  { id: 'topic-emergency',  title: 'Emergency',  icon: '\u{1F6A8}', lessonIds: ['s1-emergency-numbers', 's1-emergency-people', 's1-what-happened'] },
  { id: 'topic-medical', title: 'Medical', icon: '\u{1F3E5}', lessonIds: ['s1-hospital-check-in', 's1-symptoms', 's1-talking-to-doctor', 's1-medicine-words', 's1-asking-at-pharmacy', 's1-medicine-instructions'] },

  // Block 6 - Food
  { id: 'topic-food',          title: 'Food',          icon: '\u{1F355}', lessonIds: ['s1-food-basics', 's1-fruit', 's1-vegetables', 's1-more-food-meals', 's1-food-descriptions', 's1-dietary-needs'] },
  { id: 'topic-ordering-food', title: 'Ordering Food', icon: '\u{1F374}',       lessonIds: ['s1-restaurant-basics', 's1-paying-after-meal', 's1-food-delivery'] },
  { id: 'topic-supermarket',   title: 'Supermarket',   icon: '\u{1F6D2}',       lessonIds: ['s1-supermarket-basics', 's1-shop-quantities', 's1-supermarket-checkout'] },

  // Block 7 - Getting Around
  { id: 'topic-transport',        title: 'Getting Around',    icon: '\u{1F68C}', lessonIds: ['s1-transport-modes', 's1-going-by', 's1-travel-basics'] },
  { id: 'topic-public-transport', title: 'Public Transport',  icon: '\u{1F68A}', lessonIds: ['s1-tickets-passes', 's1-stops-routes', 's1-on-board'] },
  { id: 'topic-taxi',             title: 'Taxi',              icon: '\u{1F695}', lessonIds: ['s1-booking-taxi', 's1-taxi-destination-price', 's1-during-taxi-ride'] },

  // Block 8 - At Home
  { id: 'topic-home',        title: 'Home Items',  icon: '\u{1F3E1}', lessonIds: ['s1-rooms-at-home', 's1-furniture-appliances', 's1-home-problems'] },
  { id: 'topic-pets',        title: 'Pets',        icon: '\u{1F43E}', lessonIds: ['s1-common-pets', 's1-pet-care-rules'] },
  { id: 'topic-beverages',   title: 'Beverages',   icon: '\u{2615}', lessonIds: ['s1-common-drinks', 's1-offering-drinks'] },

  // Block 9 - Shopping & Clothes
  { id: 'topic-shopping-basics', title: 'Shopping Basics', icon: '\u{1F6D2}', lessonIds: ['s1-shopping-basics', 's1-at-the-shop'] },
  { id: 'topic-clothes',         title: 'Clothes',         icon: '\u{1F455}', lessonIds: ['s1-common-clothes', 's1-shoes-accessories'] },
  { id: 'topic-size-fit',        title: 'Size & Fit',      icon: '\u{1F4CF}', lessonIds: ['s1-sizes-fit'] },
  { id: 'topic-returns',         title: 'Returns',         icon: '\u{21A9}',  lessonIds: ['s1-returns-receipts'] },
];

export const topicById: Record<string, LessonTopic> = Object.fromEntries(
  stage1Topics.map(t => [t.id, t]),
);

export const block1TopicIds = ['topic-first-words', 'topic-common-verbs', 'topic-greetings', 'topic-dont-understand', 'topic-basic-questions'];
export const block2TopicIds = ['topic-who-i-am', 'topic-body', 'topic-colors', 'topic-family'];
export const block3TopicIds = ['topic-numbers', 'topic-money', 'topic-time', 'topic-speaking-time', 'topic-calendar', 'topic-say-your-age', 'topic-weather'];
export const block4TopicIds = ['topic-address', 'topic-directions', 'topic-positions'];
export const block5TopicIds = ['topic-emergency', 'topic-medical'];
export const block6TopicIds = ['topic-food', 'topic-ordering-food', 'topic-supermarket'];
export const block7TopicIds = ['topic-transport', 'topic-public-transport', 'topic-taxi'];
export const block8TopicIds = ['topic-home', 'topic-pets', 'topic-beverages'];
export const block9TopicIds = ['topic-shopping-basics', 'topic-clothes', 'topic-size-fit', 'topic-returns'];


























