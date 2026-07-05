// react-i18next, initialized from the ACTIVE PROFILE's languagePref — never
// from browser-locale detection. A mixed household may want Bulgarian even
// on an English browser, so language only ever changes on profile switch.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../locales/en/common.json';
import enLevels from '../locales/en/levels.json';
import enUi from '../locales/en/ui.json';
import bgCommon from '../locales/bg/common.json';
import bgLevels from '../locales/bg/levels.json';
import bgUi from '../locales/bg/ui.json';

export const SUPPORTED_LANGUAGES = ['en', 'bg'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, levels: enLevels, ui: enUi },
    bg: { common: bgCommon, levels: bgLevels, ui: bgUi },
  },
  lng: 'en', // overridden immediately on app boot once the active profile (if any) is known
  fallbackLng: 'en',
  ns: ['common', 'levels', 'ui'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setActiveLanguage(lang: SupportedLanguage): void {
  void i18n.changeLanguage(lang);
}

export default i18n;
