import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { LOCALES, MESSAGES, type Lang, type Messages } from './messages';

interface I18n {
  lang: Lang;
  locale: string;
  t: Messages;
  setLang: (lang: Lang) => void;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ lang, setLang, children }: { lang: Lang; setLang: (l: Lang) => void; children: ReactNode }) {
  const value = useMemo(() => ({ lang, locale: LOCALES[lang], t: MESSAGES[lang], setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}
