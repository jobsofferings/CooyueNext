/**
 * SEO API Client
 * 
 * 从后端获取 SEO 元数据，支持服务端渲染时使用
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SeoData {
  key: string;
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

/**
 * 获取指定 key 和语言的 SEO 数据
 * 
 * @param key - SEO 键名 (如 'home', 'about', 'team' 等)
 * @param locale - 语言代码 ('en' 或 'zh')
 * @returns SEO 记录或 null
 */
export async function getSeoData(key: string, locale: string): Promise<SeoData | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/seo/${key}?locale=${locale}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 缓存策略：静态页面使用较长的缓存时间
        next: { revalidate: 3600 }, // 1小时重新验证
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`SEO API error: ${response.status}`);
    }

    const data = (await response.json()) as SeoData;
    return data;
  } catch (error) {
    console.error(`[SEO API] Failed to fetch SEO data for key "${key}" and locale "${locale}":`, error);
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

/**
 * 获取首页 SEO 数据
 */
export async function getHomeSeo(locale: string) {
  return getSeoData('home', locale);
}

/**
 * 获取关于页面 SEO 数据
 */
export async function getAboutSeo(locale: string) {
  return getSeoData('about', locale);
}

/**
 * 获取团队页面 SEO 数据
 */
export async function getTeamSeo(locale: string) {
  return getSeoData('team', locale);
}

/**
 * 获取单个团队成员 SEO 数据
 */
export async function getTeamMemberSeo(locale: string, memberId: string) {
  return getSeoData(`team-${memberId}`, locale);
}

/**
 * 获取新闻列表页 SEO 数据
 */
export async function getNewsSeo(locale: string) {
  return getSeoData('news', locale);
}

/**
 * 获取单条新闻 SEO 数据
 */
export async function getNewsItemSeo(locale: string, newsId: string) {
  return getSeoData(`news-${newsId}`, locale);
}

/**
 * 获取联系方式页面 SEO 数据
 */
export async function getContactSeo(locale: string) {
  return getSeoData('contact', locale);
}

/**
 * 获取招聘页面 SEO 数据
 */
export async function getCareersSeo(locale: string) {
  return getSeoData('careers', locale);
}

/**
 * 获取 FAQ 页面 SEO 数据
 */
export async function getFaqSeo(locale: string) {
  return getSeoData('faq', locale);
}

/**
 * 获取客户评价页面 SEO 数据
 */
export async function getTestimonialsSeo(locale: string) {
  return getSeoData('testimonials', locale);
}
