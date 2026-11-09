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
  about: string[];
  oneLine: string;
  skillGroups: SkillGroup[];
  contact: ContactLinks;
  disclaimer: string;
}

export const profile: ProfileData = {
  about: [
    "I'm a computer science student at San Jose State (3.7 GPA, graduating Spring 2027) who builds LLM agents for real users: copilots grounded in data, tested against golden sets, and shipped with the infrastructure to keep them honest.",
    "I've also mentored 30+ people on working with AI coding tools like Cursor and Claude Code, including how to review and verify AI-generated changes.",
    'Outside of engineering I lead in Alpha Kappa Psi and Spartan Analytics.',
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
