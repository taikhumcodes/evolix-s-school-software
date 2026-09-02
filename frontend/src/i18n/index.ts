import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEn from './locales/en/common.json';
import commonHi from './locales/hi/common.json';

const savedLanguage = localStorage.getItem('i18nextLng') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { common: commonEn },
    hi: { common: commonHi },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
