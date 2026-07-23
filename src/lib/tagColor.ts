// Categories mirror whoami_cv's skills grouping (resumeData.{en,pt}.ts):
// Programming Languages, Frameworks, Cloud & Infrastructure, DevOps & IaC,
// Data Storage, Tools & Methodologies (the catch-all for everything else,
// same role it plays in the CV).
export type TagCategory = 'language' | 'framework' | 'cloud' | 'devops' | 'data' | 'tools';

const CATEGORY_BY_TAG: Record<string, TagCategory> = {
  // Programming Languages
  Python: 'language',
  Kotlin: 'language',
  'C#/.NET': 'language',
  Go: 'language',
  'C++': 'language',

  // Frameworks
  'Node.js': 'framework',
  React: 'framework',
  'React Native/Expo': 'framework',
  Django: 'framework',
  Flutter: 'framework',
  Qt: 'framework',

  // Cloud & Infrastructure
  Azure: 'cloud',
  'GCP Cloud Run': 'cloud',
  Firebase: 'cloud',

  // DevOps & IaC
  Docker: 'devops',
  Kubernetes: 'devops',
  Terraform: 'devops',

  // Data Storage
  MongoDB: 'data',
  PostgreSQL: 'data',
  MySQL: 'data',
};

const CATEGORY_COLORS: Record<TagCategory, string> = {
  language: '#3d5a80',
  framework: '#81b29a',
  cloud: '#0090c1',
  devops: '#e07a5f',
  data: '#c9a227',
  tools: '#9b5de5',
};

export function getTagCategory(tag: string): TagCategory {
  return CATEGORY_BY_TAG[tag] ?? 'tools';
}

export function getTagColor(tag: string): string {
  return CATEGORY_COLORS[getTagCategory(tag)];
}
