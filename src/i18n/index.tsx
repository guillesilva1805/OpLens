import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Lang, type TFn } from './translations';

const STORAGE_KEY = 'opslens_lang';

function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'es') return stored;
  // First visit: follow the browser language
  return navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TFn;
  /** BCP 47 locale for date formatting */
  locale: string;
}

export const I18nContext = createContext<I18nValue>({
  lang: 'en',
  setLang: () => {},
  t: (key, params) => translate('en', key, params),
  locale: 'en-US',
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translate(lang, 'app.metaTitle');
  }, [lang]);

  const value = useMemo<I18nValue>(() => ({
    lang,
    setLang,
    t: (key, params) => translate(lang, key, params),
    locale: lang === 'es' ? 'es-PE' : 'en-US',
  }), [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

export type { Lang, TFn, TKey } from './translations';
