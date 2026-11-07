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
  hp: { current: 980, max: 980 },
  mp: { current: 450, max: 450 },
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
    { label: "Primary Class", value: "Full-Stack & Web Performance" },
    { label: "Equipped Runes", value: "TypeScript, Astro, React, Node.js" },
    { label: "Guild Creed", value: "Minimalist, accessible, fast by default" },
  ],
};

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
