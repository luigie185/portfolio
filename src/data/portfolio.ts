export interface ExperienceItem {
  questId: string;
  questRank: "S-Rank" | "A-Rank" | "B-Rank";
  role: string;
  company: string;
  companyUrl?: string;
  period: string;
  location: string;
  expReward: string;
  current?: boolean;
  description: string[];
  technologies: string[];
}

export interface ProjectItem {
  id: string;
  title: string;
  rarity: number;
  element: string;
  summary: string;
  category: string;
  featured?: boolean;
  metrics?: string;
  technologies: string[];
  liveUrl?: string;
  repoUrl?: string;
}

export const profile = {
  name: "Luigie Cyril Francis A. Posod",
  shortName: "Luigie",
  role: "Software Engineer",
  rpgClass: "Arcane Full-Stack Artificer",
  level: 25,
  guild: "Kingdom of Ding Dong Dell · Remote",
  tagline:
    "Weaving fast, resilient digital realms with clean architecture and modern web alchemy.",
  about:
    "A software engineer and digital artificer who crafts performant, accessible, and user-centric web applications. Armed with the Wizard's Companion and modern TypeScript mastery, I transform complex quests into elegant, maintainable solutions.",
  location: "Available Worldwide",
  availableForWork: true,
  email: "hello@example.com",
  socials: {
    github: "https://github.com/luigie185",
    linkedin: "https://linkedin.com",
    x: "https://x.com",
  },
  attributes: [
    { name: "Frontend Sorcery", stat: 94, color: "from-emerald-500 to-teal-400" },
    { name: "Backend Alchemy", stat: 89, color: "from-sky-500 to-indigo-400" },
    { name: "System Architecture", stat: 91, color: "from-amber-500 to-orange-400" },
    { name: "Speed & Optimization", stat: 96, color: "from-rose-500 to-amber-400" },
  ],
  highlights: [
    { label: "🛡️ Role", value: "Full-Stack & Web Performance" },
    { label: "🔮 Runes", value: "TypeScript, Astro, React, Node.js" },
    { label: "🌿 Trait", value: "Minimalist, accessible, fast by default" },
  ],
};

/* ------------------------------------------------------------------ */
/* Game layer: the visitor ("traveler") earns XP by exploring the page */
/* ------------------------------------------------------------------ */

export interface Quest {
  id: string;
  title: string;
  hint: string;
  xp: number;
  icon: string;
}

/** XP needed per traveler level. */
export const XP_PER_LEVEL = 100;

/** Acorns hidden around the page (ids must match <Acorn id="..."/> usages). */
export const ACORN_IDS = ["hero", "dialogue", "quests", "relics", "footer"] as const;

export const quests: Quest[] = [
  { id: "begin", icon: "🌱", title: "Begin the Journey", hint: "Press start on the title screen.", xp: 20 },
  { id: "greet", icon: "🍃", title: "Greet the Forest Spirit", hint: "Choose any dialogue option with Mori.", xp: 40 },
  { id: "quest-log", icon: "📜", title: "Read the Quest Log", hint: "Travel to the Work Experience chapter.", xp: 60 },
  { id: "relics", icon: "📖", title: "Enter the Relic Vault", hint: "Travel to the Projects chapter.", xp: 60 },
  { id: "nightfall", icon: "🌙", title: "Cast Time-Shift", hint: "Switch between day and night.", xp: 40 },
  { id: "journal", icon: "🗺️", title: "Open the Journal", hint: "Press J or tap the journal button.", xp: 20 },
  { id: "acorns", icon: "🌰", title: "Acorn Gatherer", hint: `Find all ${ACORN_IDS.length} acorns hidden across the forest.`, xp: 150 },
  { id: "pigeon", icon: "🕊️", title: "Send a Pigeon Post", hint: "Reach out through the email link.", xp: 80 },
];



export const experiences: ExperienceItem[] = [
  {
    questId: "MAIN QUEST #03",
    questRank: "S-Rank",
    role: "Senior Software Engineer",
    company: "TechNova Studio",
    companyUrl: "https://example.com",
    period: "2024 — Present",
    location: "Remote Realm",
    expReward: "+5,000 EXP",
    current: true,
    description: [
      "Architected and shipped core customer-facing web applications serving 100k+ monthly active adventurers with 99.9% uptime.",
      "Reduced initial bundle size by 42% and improved Core Web Vitals to green across all key kingdom portals.",
      "Mentored junior apprentices and established automated CI/CD quality wards and design system standards.",
    ],
    technologies: ["TypeScript", "React", "Next.js", "Tailwind CSS", "PostgreSQL"],
  },
  {
    questId: "MAIN QUEST #02",
    questRank: "A-Rank",
    role: "Full-Stack Developer",
    company: "Vertex Digital",
    companyUrl: "https://example.com",
    period: "2022 — 2024",
    location: "HybridCitadel",
    expReward: "+3,400 EXP",
    description: [
      "Developed scalable REST and GraphQL APIs alongside responsive frontend interfaces for B2B SaaS guilds.",
      "Built real-time analytics scrying dashboards and automated workflows that saved clients 10+ hours weekly.",
      "Collaborated closely with designers to translate Figma scrolls into reusable, accessible UI components.",
    ],
    technologies: ["Node.js", "TypeScript", "Astro", "Docker", "Redis"],
  },
  {
    questId: "MAIN QUEST #01",
    questRank: "B-Rank",
    role: "Frontend Developer",
    company: "PixelCraft Agency",
    companyUrl: "https://example.com",
    period: "2021 — 2022",
    location: "On-site Guild",
    expReward: "+2,100 EXP",
    description: [
      "Delivered high-converting marketing sites and interactive web applications with sub-second load times.",
      "Standardized component grimoires and accessibility audits (WCAG 2.1 AA) across client deliverables.",
    ],
    technologies: ["JavaScript", "HTML/CSS", "Tailwind CSS", "Vite"],
  },
];

export const projects: ProjectItem[] = [
  {
    id: "ARTIFACT-01",
    title: "PulseMetrics Scrying Orb",
    rarity: 5,
    element: "Aether · Full-Stack",
    summary:
      "A lightweight, privacy-first web analytics platform with real-time event streaming, custom funnels, and zero cookie banners.",
    category: "SaaS / Full-Stack",
    featured: true,
    metrics: "< 1.5KB script • 10k+ events/sec",
    technologies: ["TypeScript", "Astro", "ClickHouse", "Tailwind CSS"],
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
  {
    id: "ARTIFACT-02",
    title: "Kinetix Grimoire UI",
    rarity: 5,
    element: "Sunstone · Design System",
    summary:
      "An accessible, zero-dependency design system and component primitives library built for high-density developer tools.",
    category: "Open Source / UI Kit",
    featured: true,
    metrics: "100% Lighthouse • WCAG AA",
    technologies: ["TypeScript", "Tailwind CSS", "CSS Grid", "Storybook"],
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
  {
    id: "ARTIFACT-03",
    title: "Chronos Clockwork Engine",
    rarity: 4,
    element: "Chrono · Backend",
    summary:
      "Distributed background job scheduler and workflow monitor with automatic retries, dead-letter queues, and webhook alerts.",
    category: "Backend & DevTools",
    featured: false,
    metrics: "Sub-15ms dispatch latency",
    technologies: ["Node.js", "TypeScript", "Redis", "Docker"],
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/luigie185",
  },
  {
    id: "ARTIFACT-04",
    title: "NoteFlow Wizard's Tome",
    rarity: 4,
    element: "Sylph · Productivity",
    summary:
      "Local-first knowledge base and markdown grimoire featuring instant fuzzy search, bi-directional links, and keyboard-only navigation.",
    category: "Productivity App",
    featured: false,
    metrics: "Offline-first • Instant search",
    technologies: ["Astro", "TypeScript", "IndexedDB", "Tailwind CSS"],
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
  acornsComplete: `You found every acorn! The forest is grateful. Here's the secret: ${profile.shortName} reads every pigeon post — send one and say hi!`,
};
