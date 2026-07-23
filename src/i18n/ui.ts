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
  },
  pt: {
    'nav.home': 'Início',
    'nav.projects': 'Projetos',
    'nav.about': 'Sobre',
    'nav.contact': 'Contacto',
  },
} as const;

export type Locale = keyof typeof ui;
export type UiKey = keyof (typeof ui)[typeof defaultLang];
