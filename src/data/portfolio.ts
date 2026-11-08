import type { IconName } from '../scripts/icons';

export interface ExperienceItem {
  questId: string;
  questRank: "S" | "A" | "B";
  role: string;
  company: string;
  companyUrl?: string;
  period: string;
  location: string;
  /** One-line, story-flavoured summary shown under the title. */
  lore: string;
  current?: boolean;
  /** Plain, recruiter-friendly accomplishments. */
  description: string[];
  technologies: string[];
}

export type RelicEmblem = "orb" | "loom" | "clock" | "tome";
export type RelicSky = "dawn" | "noon" | "dusk" | "night";

export interface ProjectItem {
  id: string;
  title: string;
  /** What it actually is, in plain words. */
  kind: string;
  rarity: number;
  element: string;
  /** Short italic flavour line, like an item description in a game. */
  lore: string;
  summary: string;
  stats: string[];
  technologies: string[];
  emblem: RelicEmblem;
  sky: RelicSky;
  /** Optional real screenshot (in public/) shown as the card art instead of the painted vignette. */
  image?: string;
  imageAlt?: string;
  liveUrl?: string;
  repoUrl?: string;
}

/** Level = 1 + whole years since the date (e.g. LV 2 from the first anniversary). */
export function codingLevel(since: string, now: Date = new Date()): number {
  const [y, m, d] = since.split("-").map(Number);
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years--;
  return Math.max(1, years + 1);
}

/** Hover details for the level: exact start date, time coding, next level-up. */
export function codingDetails(since: string, now: Date = new Date()): string {
  const [y, m, d] = since.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const level = codingLevel(since, now);
  const next = new Date(y + level, m - 1, d);
  const day = 86400000;
  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / day));
  const months = Math.floor(days / 30.44);
  const span = months >= 12 ? `${Math.floor(months / 12)} yr ${months % 12} mo` : months >= 1 ? `${months} month${months > 1 ? "s" : ""}` : `${days} day${days === 1 ? "" : "s"}`;
  const toNext = Math.ceil((next.getTime() - now.getTime()) / day);
  return `Coding since ${fmt(start)} · ${span} in · LV ${level + 1} on ${fmt(next)} (${toNext} days)`;
}

export const profile = {
  name: "Luigie Cyril Francis A. Posod",
  shortName: "Luigie",
  role: "Software Engineer",
  rpgClass: "Arcane Full-Stack Artificer",
  /** Coding journey start. The level is 1 in the first year and goes up by one each
   *  year after (computed live, so it rises on its own). Only the year is shown. */
  codingSince: "2026-08-01",
  get level() {
    return codingLevel(this.codingSince);
  },
  get codingYear() {
    return Number(this.codingSince.slice(0, 4));
  },
  guild: "Kingdom of Ding Dong Dell · Remote",
  tagline:
    "Weaving fast, resilient digital realms with clean architecture and modern web alchemy.",
  about:
    "A software engineer and digital artificer who crafts performant, accessible, and user-centric web applications. Armed with the Wizard's Companion and modern TypeScript mastery, I transform complex quests into elegant, maintainable solutions.",
  location: "Available Worldwide",
  availableForWork: true,
  email: "luigie185@gmail.com",
  socials: {
    github: "https://github.com/luigie185",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  attributes: [
    { name: "Frontend Sorcery", stat: 94, icon: "brush", note: "Interfaces that feel effortless" },
    { name: "Backend Alchemy", stat: 89, icon: "gear", note: "APIs, data & reliable services" },
    { name: "System Architecture", stat: 91, icon: "compass", note: "Clear structure that scales" },
    { name: "Speed & Optimization", stat: 96, icon: "feather", note: "Fast on every device" },
  ] as { name: string; stat: number; icon: "brush" | "gear" | "compass" | "feather"; note: string }[],
  highlights: [
    { icon: "shield" as IconName, label: "Role", value: "Full-Stack & Web Performance" },
    { icon: "gem" as IconName, label: "Runes", value: "TypeScript, Astro, React, Node.js" },
    { icon: "leaf" as IconName, label: "Creed", value: "Minimalist, accessible, fast by default" },
  ],
};

/* ------------------------------------------------------------------ */
/* Game layer: quests and acorns the visitor can complete while exploring */
/* ------------------------------------------------------------------ */

export interface Quest {
  id: string;
  title: string;
  hint: string;
  icon: IconName;
}

/** Acorns hidden around the page (ids must match <Acorn id="..."/> usages). */
export const ACORN_IDS = ["hero", "dialogue", "quests", "relics", "footer"] as const;

/** Every weather the forest knows — drawn from Japan's seasons. */
export const WEATHERS = [
  { id: "clear", icon: "clear", label: "Clear skies" },
  { id: "sakura", icon: "sakura", label: "Sakura petal storm" },
  { id: "haze", icon: "haze", label: "Spring haze" },
  { id: "sunshower", icon: "sunshower", label: "Sunshower" },
  { id: "drizzle", icon: "drizzle", label: "Tsuyu drizzle" },
  { id: "rain", icon: "rain", label: "Rain" },
  { id: "mist", icon: "mist", label: "Morning mist" },
  { id: "heat", icon: "heat", label: "Summer heat haze" },
  { id: "storm", icon: "storm", label: "Evening thunderstorm" },
  { id: "breeze", icon: "wind", label: "Gusty wind" },
  { id: "typhoon", icon: "typhoon", label: "Typhoon" },
  { id: "momiji", icon: "momiji", label: "Falling maple leaves" },
  { id: "snow", icon: "snow", label: "Snow" },
  { id: "blizzard", icon: "blizzard", label: "Blizzard" },
] as const satisfies readonly { id: string; icon: IconName; label: string }[];

export type WeatherId = (typeof WEATHERS)[number]["id"];

/**
 * Japan's seasons, in order. The site cycles through them: each plays a few of
 * its own weathers, then the next season arrives (and the countryside repaints).
 */
export const SEASONS = [
  { id: "spring", label: "Spring", jp: "haru", weathers: ["clear", "sakura", "haze", "sunshower"] },
  { id: "tsuyu", label: "Rainy season", jp: "tsuyu", weathers: ["drizzle", "rain", "mist"] },
  { id: "summer", label: "Summer", jp: "natsu", weathers: ["clear", "heat", "storm", "sunshower"] },
  { id: "typhoon", label: "Typhoon season", jp: "taifū", weathers: ["breeze", "rain", "typhoon"] },
  { id: "autumn", label: "Autumn", jp: "aki", weathers: ["clear", "momiji", "mist", "rain"] },
  { id: "winter", label: "Winter", jp: "fuyu", weathers: ["clear", "snow", "blizzard", "breeze"] },
] as const satisfies readonly { id: string; label: string; jp: string; weathers: readonly WeatherId[] }[];

export type SeasonId = (typeof SEASONS)[number]["id"];

export const quests: Quest[] = [
  { id: "begin", icon: "compass", title: "Begin the Journey", hint: "Press start on the title screen." },
  { id: "greet", icon: "leaf", title: "Greet the Forest Spirit", hint: "Choose any dialogue option with Mori." },
  { id: "quest-log", icon: "scroll", title: "Read the Quest Log", hint: "Travel to the Work Experience chapter." },
  { id: "relics", icon: "book", title: "Enter the Relic Vault", hint: "Travel to the Projects chapter." },
  { id: "nightfall", icon: "moon", title: "Cast Time-Shift", hint: "Switch between day and night." },
  { id: "pat", icon: "sprout", title: "Befriend Mori", hint: "Give the forest spirit a gentle pat." },
  { id: "weather", icon: "clear", title: "Change the Weather", hint: "Tap the weather charm or press R." },
  { id: "all-weather", icon: "rainbow", title: "Through the Year", hint: "Live through all six seasons of the forest." },
  { id: "journal", icon: "map", title: "Open the Journal", hint: "Press J or tap the journal button." },
  { id: "acorns", icon: "acorn", title: "Acorn Gatherer", hint: `Find all ${ACORN_IDS.length} acorns hidden across the forest.` },
  { id: "pigeon", icon: "bird", title: "Send a Pigeon Post", hint: "Reach out through the email link." },
];



export const experiences: ExperienceItem[] = [
  {
    questId: "Quest III",
    questRank: "S",
    role: "Senior Software Engineer",
    company: "TechNova Studio",
    companyUrl: "https://example.com",
    period: "2024 — Present",
    location: "Remote",
    lore: "Tending the studio's busiest web apps, and the people who build them.",
    current: true,
    description: [
      "Architected and shipped core customer-facing web apps serving 100k+ monthly active users at 99.9% uptime.",
      "Cut initial bundle size by 42% and brought Core Web Vitals to green across every key product page.",
      "Mentor junior engineers; set up automated CI/CD quality gates and shared design-system standards.",
    ],
    technologies: ["TypeScript", "React", "Next.js", "Tailwind CSS", "PostgreSQL"],
  },
  {
    questId: "Quest II",
    questRank: "A",
    role: "Full-Stack Developer",
    company: "Vertex Digital",
    companyUrl: "https://example.com",
    period: "2022 — 2024",
    location: "Hybrid",
    lore: "Building the roads between data and the people who need it.",
    description: [
      "Built scalable REST and GraphQL APIs and the responsive interfaces on top of them for B2B SaaS clients.",
      "Delivered real-time analytics dashboards and workflow automation that saved clients 10+ hours a week.",
      "Partnered with designers to turn Figma designs into reusable, accessible UI components.",
    ],
    technologies: ["Node.js", "TypeScript", "Astro", "Docker", "Redis"],
  },
  {
    questId: "Quest I",
    questRank: "B",
    role: "Frontend Developer",
    company: "PixelCraft Agency",
    companyUrl: "https://example.com",
    period: "2021 — 2022",
    location: "On-site",
    lore: "Where the journey began — learning to make the web feel fast.",
    description: [
      "Shipped high-converting marketing sites and interactive web apps with sub-second load times.",
      "Standardized component libraries and WCAG 2.1 AA accessibility audits across client projects.",
    ],
    technologies: ["JavaScript", "HTML/CSS", "Tailwind CSS", "Vite"],
  },
];

export const projects: ProjectItem[] = [
  {
    id: "No. 01",
    title: "PMNA Clothing",
    kind: "Streetwear brand website",
    rarity: 5,
    element: "Heritage · Streetwear",
    lore: "A tree of heritage — its roots in local artists, its branches worn on the street.",
    summary:
      "PMNA Clothing offers culturally infused, unique streetwear designed by talented local artists, showcasing their creativity and heritage. Visitors browse the available pieces, and Order takes them straight to the brand's Facebook page.",
    stats: ["SEO-optimized homepage", "Orders via Facebook"],
    technologies: ["Astro", "CSS", "JavaScript", "HTML"],
    emblem: "loom",
    sky: "night",
    image: "/projects/pmna-clothing.webp",
    imageAlt: "PMNA Clothing homepage with the black-and-white PAMANA tree emblem",
    liveUrl: "https://pmnaclothing.vercel.app/",
  },
  {
    id: "No. 02",
    title: "Kinetix UI",
    kind: "Open-source design system",
    rarity: 5,
    element: "Sunstone · Design System",
    lore: "Tiles woven on a sunlit loom, each one fits beside any other.",
    summary:
      "Accessible, zero-dependency component primitives built for dense developer tools.",
    stats: ["100 Lighthouse", "WCAG AA"],
    technologies: ["TypeScript", "Tailwind CSS", "CSS Grid", "Storybook"],
    emblem: "loom",
    sky: "noon",
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
  {
    id: "No. 03",
    title: "Chronos",
    kind: "Distributed job scheduler",
    rarity: 4,
    element: "Chrono · Backend",
    lore: "A brass pocket watch that never forgets a promise — and retries if it does.",
    summary:
      "Background job scheduler and workflow monitor with automatic retries, dead-letter queues, and webhook alerts.",
    stats: ["< 15 ms dispatch"],
    technologies: ["Node.js", "TypeScript", "Redis", "Docker"],
    emblem: "clock",
    sky: "night",
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
  {
    id: "No. 04",
    title: "NoteFlow",
    kind: "Local-first knowledge base",
    rarity: 4,
    element: "Sylph · Productivity",
    lore: "A field journal that remembers where every thought was planted.",
    summary:
      "Markdown notes with instant fuzzy search, bi-directional links, and full keyboard navigation — works offline.",
    stats: ["Offline-first", "Instant search"],
    technologies: ["Astro", "TypeScript", "IndexedDB", "Tailwind CSS"],
    emblem: "tome",
    sky: "dawn",
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
];

export interface DialogueOption {
  label: string;
  text: string;
  scroll?: string;
}

export const dialogue = {
  speaker: "Mori · Spirit of the Camphor Tree",
  greeting: `Mmm~ a visitor! Welcome, traveler, to ${profile.shortName}'s forest sanctuary. Collect acorns, finish quests, and you might learn a secret or two. Where shall we wander first?`,
  options: [
    {
      label: `Who is ${profile.shortName}?`,
      text: `${profile.name} is a ${profile.role.toLowerCase()} — an ${profile.rpgClass} who works with ${profile.highlights[1].value}. ${profile.highlights[2].value}.`,
    },
    {
      label: "Show Quest Log",
      text: `To the Quest Log! ${experiences.length} campaigns completed so far — the most recent at ${experiences[0].company}.`,
      scroll: "#experience",
    },
    {
      label: "Inspect Relics",
      text: `Behold the Relic Vault: ${projects.length} artifacts forged with care. Each card links to its demo portal and source scroll.`,
      scroll: "#projects",
    },
  ] satisfies DialogueOption[],
  pats: [
    "Hehe~ that tickles! My sprout grew a little.",
    "Mmm, warm hands. The camphor tree says hello too.",
    "Did you know? Acorns taste best after a summer shower.",
    "Shh… listen. You can hear the rice fields whispering in the wind.",
    "At night I carry a lantern so lost travelers can find the path home.",
  ],
  weather: {
    clear: "The clouds part. Sunlight on the rice again — my favourite.",
    sakura: "Hanafubuki! A blizzard of cherry petals — quick, catch one and make a wish.",
    haze: "Spring haze — kasumi. The mountains have gone soft and dreamy.",
    sunshower: "Rain falling while the sun shines… they say a fox is getting married somewhere!",
    drizzle: "Tsuyu has begun. A fine drizzle that never quite stops — the frogs are delighted.",
    rain: "Pitter-patter… watch the ripples dance across the paddies.",
    mist: "Morning mist is rolling over the fields. Everything feels like a secret.",
    heat: "Phew, midsummer! Can you hear the cicadas singing in the heat?",
    storm: "A yūdachi — the evening thunderstorm! Stay close, the camphor tree will keep us dry.",
    breeze: "Whoosh! A big gust — hold on to your hat, the leaves are going on an adventure.",
    typhoon: "A typhoon is passing! Hold on tight — I've tucked myself behind my stone.",
    momiji: "The maples are letting go of their red leaves. Momiji season is so pretty.",
    snow: "Snow! The fields are turning white. Let's make tiny footprints.",
    blizzard: "Fubuki — a whirling blizzard! Brrr, I can barely see the farmhouse.",
  } as Record<string, string>,
  seasons: {
    spring: "Spring is here! The cherry trees are blooming and the paddies are filling with water.",
    tsuyu: "Tsuyu, the rainy season, has arrived. Everything turns deep green and dripping.",
    summer: "Summer! Long bright days, tall grass, and evening thunder.",
    typhoon: "Typhoon season… the wind is restless. Keep an eye on the sky.",
    autumn: "Autumn has come. Golden rice, red maples, and crisp, clear air.",
    winter: "Winter settles over the forest. Quiet fields, frosty mornings… and maybe snow.",
  } as Record<string, string>,
  acornsComplete: `You found every acorn! The forest is grateful. Here's the secret: ${profile.shortName} reads every pigeon post — send one and say hi!`,
};
