export const languages = {
  en: 'English',
  pt: 'Português',
} as const;

export const defaultLang = 'en';

export const ui = {
  en: {
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'projects.title': 'Projects',
    'projects.filterHint': 'Click a tag to filter — select as many as you like.',
    'projects.caseStudySoon': 'Case study coming soon.',
  },
  pt: {
    'nav.home': 'Início',
    'nav.projects': 'Projetos',
    'nav.about': 'Sobre',
    'nav.contact': 'Contacto',
    'projects.title': 'Projetos',
    'projects.filterHint': 'Clica numa tag para filtrar — podes selecionar várias.',
    'projects.caseStudySoon': 'Case study brevemente.',
  },
} as const;

export type Locale = keyof typeof ui;
export type UiKey = keyof (typeof ui)[typeof defaultLang];
