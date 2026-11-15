export interface SkillGroup {
  slug: string;
  label: string;
  items: string[];
}

export interface ContactLinks {
  email: string;
  linkedin: string;
  github: string;
}

export interface ProfileData {
  intro: string[];
  about: string[];
  oneLine: string;
  skillGroups: SkillGroup[];
  contact: ContactLinks;
  disclaimer: string;
}

export const profile: ProfileData = {
  intro: [
    'Building LLM agents as an AI software engineer intern at **Tesla**.',
    'Computer science at **San Jose State**.',
    'Before that, I built a wafer analysis agent at **Micron** and Q&A and image-search tools at **Blue Dome**.',
    'I also built grant-research and reporting agents at **Hanna Center**.',
    'Outside of work I lead in **Alpha Kappa Psi** and **Spartan Analytics**.',
  ],
  about: [
    "I'm a computer science student at San Jose State. I'm passionate about making an impact, and I love building tools that people use every day.",
    'Outside of work, I love going hiking, hitting the gym, hanging out with friends, and following the stock market.',
  ],
  oneLine: 'Andrian Than — software engineer building LLM agents for real users.',
  skillGroups: [
    { slug: 'ai-llm', label: 'AI/LLM', items: ['LLM agents', 'tool calling', 'multi-agent orchestration', 'RAG', 'evals (golden sets, promptfoo, deepeval)', 'numeric grounding'] },
    { slug: 'languages', label: 'Languages', items: ['Python', 'TypeScript', 'JavaScript', 'SQL'] },
    { slug: 'backend-frontend', label: 'Backend/Frontend', items: ['FastAPI', 'Flask', 'REST API design', 'React', 'Vite', 'Zustand'] },
    { slug: 'data', label: 'Data', items: ['DuckDB', 'MySQL', 'MSSQL', 'Vertica', 'ClickHouse', 'Snowflake', 'SQLite', 'Parquet'] },
    { slug: 'infra-tools', label: 'Infra/tools', items: ['Kubernetes', 'Docker', 'GitHub Actions CI/CD', 'Git', 'Copilot', 'Power Automate'] },
  ],
  contact: {
    email: 'andrian.than.api@gmail.com',
    linkedin: 'https://www.linkedin.com/in/andrian-than',
    github: 'https://github.com/andrianthan',
  },
  disclaimer: 'Unaffiliated personal portfolio. Inspired by Claude Code. Not an Anthropic product.',
};
