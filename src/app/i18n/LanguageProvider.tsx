import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type Language = 'en' | 'zh_TW';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, substitutions?: (string | number)[]) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Cache for loaded messages
const messagesCache: Record<Language, Record<string, { message: string; placeholders?: Record<string, { content: string }> }>> = {
  en: {},
  zh_TW: {},
};

// Load messages from _locales directory
async function loadMessages(lang: Language): Promise<typeof messagesCache.en> {
  if (Object.keys(messagesCache[lang]).length > 0) {
    return messagesCache[lang];
  }

  try {
    // In extension context, load from _locales
    const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
    const response = await fetch(url);
    const messages = await response.json();
    messagesCache[lang] = messages;
    return messages;
  } catch (e) {
    console.error(`Failed to load messages for ${lang}:`, e);
    return {};
  }
}

// Get translation with placeholder substitution
function getMessage(
  messages: typeof messagesCache.en,
  key: string,
  substitutions?: (string | number)[]
): string {
  const entry = messages[key];
  if (!entry) {
    return key; // Fallback to key if not found
  }

  let message = entry.message;

  // Handle placeholders like $COUNT$ or $FILE$
  if (substitutions && substitutions.length > 0 && entry.placeholders) {
    Object.entries(entry.placeholders).forEach(([name, config]) => {
      const match = config.content.match(/\$(\d+)/);
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        if (index >= 0 && index < substitutions.length) {
          const placeholder = `$${name.toUpperCase()}$`;
          message = message.replace(placeholder, String(substitutions[index]));
        }
      }
    });
  }

  return message;
}

const STORAGE_KEY = 'linktrove.language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [messages, setMessages] = useState<typeof messagesCache.en>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference and messages
  useEffect(() => {
    const init = async () => {
      try {
        // Try to get saved language from chrome.storage
        const result = await new Promise<{ [STORAGE_KEY]?: Language }>((resolve) => {
          try {
            chrome.storage?.local?.get?.([STORAGE_KEY], (res) => resolve(res as any));
          } catch {
            resolve({});
          }
        });

        const savedLang = result[STORAGE_KEY] || 'en';
        setLanguageState(savedLang);

        const loadedMessages = await loadMessages(savedLang);
        setMessages(loadedMessages);
      } catch (e) {
        console.error('Failed to initialize language:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    try {
      // Save to chrome.storage
      await new Promise<void>((resolve) => {
        try {
          chrome.storage?.local?.set?.({ [STORAGE_KEY]: lang }, () => resolve());
        } catch {
          resolve();
        }
      });

      // Load new messages
      const loadedMessages = await loadMessages(lang);
      setMessages(loadedMessages);
      setLanguageState(lang);
    } catch (e) {
      console.error('Failed to set language:', e);
    }
  }, []);

  const t = useCallback((key: string, substitutions?: (string | number)[]) => {
    return getMessage(messages, key, substitutions);
  }, [messages]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  // Show nothing while loading to prevent flash of untranslated content
  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}

// Export language options for UI
export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh_TW', label: '繁體中文' },
];
