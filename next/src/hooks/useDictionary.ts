import { useEffect, useState, useMemo } from "react"
import { i18n, Locale } from "@/i18n-config"
import { usePathname } from "next/navigation"
import ZH_CONFIG from '../dictionaries/zh.json'
import EN_CONFIG from '../dictionaries/en.json'

export const useLocale = () => {
  const pathName = usePathname()
  if (!pathName) return i18n.defaultLocale
  return pathName.split('/')[1] as Locale
}

export const useDictionary = () => {
  const locale = useLocale()
  const ossResult = useDictionaryByOss();

  return useMemo(() => {
    if (ossResult) {
      return createDictionaryFunction(ossResult);
    }

    if (i18n.locales.includes(locale)) {
      const dict_map = {
        'zh': ZH_CONFIG,
        'en': EN_CONFIG,
      }
      const dict = dict_map[locale] as Record<string, string>
      return createDictionaryFunction(dict);
    }

    return createDictionaryFunction({});
  }, [locale, ossResult]);
}

const dictionaryCache = new Map<string, Record<string, string>>();

const useDictionaryByOss = () => {
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const locale = useLocale()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_I18N_HOSTS) return;

    if (dictionaryCache.has(locale)) {
      setResult(dictionaryCache.get(locale)!);
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_I18N_HOSTS}/article/${locale}.json`
    fetch(url, {
      cache: 'force-cache',
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          dictionaryCache.set(locale, data);
          setResult(data);
        } else {
          setResult(null);
        }
      })
      .catch((error) => {
        console.error('[I18N] Failed to fetch from OSS:', error);
        setResult(null);
      })
  }, [locale])
  return result
}

// 创建字典函数
const createDictionaryFunction = (dictionary: Record<string, string>) => {
  return (key: string, variables?: Record<string, string>): string => {
    const template = dictionary[key] || key; // 如果没有找到则返回 key
    return interpolate(template, variables);
  };
};

const interpolate = (template: string, variables?: Record<string, string>): string => {
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] || '');
};