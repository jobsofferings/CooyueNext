/**
 * SEO API Client
 * 
 * 从后端获取 SEO 元数据，支持服务端渲染时使用
 */
const DEFAULT_API_URL = 'http://43.139.70.61:3001';

const getApiBaseUrl = (): string | null => {
  const apiUrl = process.env.SEO_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  if (!apiUrl) {
    return null;
  }

  return apiUrl.replace(/\/+$/, '');
};

const loggedMessages = new Set<string>();

function logSeoWarningOnce(message: string) {
  if (loggedMessages.has(message)) {
    return;
  }

  loggedMessages.add(message);
  console.warn(message);
}

export interface SeoData {
  key: string;
  target?: string;
  locale: string;
  title: string | null;
  description: string | null;
  keywords: string[];
  og_image: string | null;
  canonical: string | null;
  no_index: boolean;
  visibility: 'published' | 'draft';
  created_at: string;
  updated_at: string;
  extra?: Record<string, unknown>;
}

function normalizeRoutePath(routePath: string): string {
  if (!routePath) return '/';
  if (routePath === '/') return routePath;
  return routePath.replace(/\/+$/, '');
}

/**
 * 按页面 route path 获取 SEO 数据。
 * routePath 不包含语言前缀，例如 "/", "/about", "/team/1"。
 */
export async function getSeoByPath(routePath: string, locale: string): Promise<SeoData | null> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return null;
  }

  try {
    const normalizedPath = normalizeRoutePath(routePath);
    const response = await fetch(
      `${apiBaseUrl}/api/seo/by-path?path=${encodeURIComponent(normalizedPath)}&locale=${locale}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`SEO API error: ${response.status}`);
    }

    return (await response.json()) as SeoData;
  } catch (error) {
    const message = `[SEO API] Falling back to local metadata for path "${routePath}" and locale "${locale}".`;
    void error;
    logSeoWarningOnce(message);
    return null;
  }
}

/**
 * 提取 SEO 记录的 title 和 description
 * 返回安全默认值以防止 undefined
 */
export function extractSeoMeta(seoResponse: SeoData | null, defaults: {
  title?: string;
  description?: string;
}): {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
} {
  const record = seoResponse;

  if (record && record.visibility === 'published') {
    return {
      title: record.title || defaults.title || '',
      description: record.description || defaults.description || '',
      keywords: record.keywords?.length > 0 ? record.keywords : undefined,
      ogImage: record.og_image || undefined,
      canonical: record.canonical || undefined,
      noIndex: record.no_index,
    };
  }

  // 回退到默认值
  return {
    title: defaults.title || '',
    description: defaults.description || '',
  };
}
