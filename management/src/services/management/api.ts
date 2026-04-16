import { request } from '@umijs/max';

export type Locale = 'en' | 'zh';
export type Visibility = 'published' | 'draft';
export type MailTaskStatus = 'draft' | 'queued' | 'sent' | 'failed';

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}

export interface OverviewSummary {
  total: string;
  published?: string;
  draft?: string;
  queued?: string;
  failed?: string;
}

export interface OverviewPayload {
  products: OverviewSummary;
  seo: OverviewSummary;
  mail: OverviewSummary;
  recentProducts: ProductRecord[];
  recentSeo: SeoRecord[];
  recentMail: MailTaskRecord[];
}

export interface SeoRecord {
  seo_key: string;
  locale: Locale;
  title: string | null;
  description: string | null;
  keywords: string[];
  og_image: string | null;
  canonical: string | null;
  no_index: boolean;
  visibility: Visibility;
  targets?: string[];
  updated_at: string;
}

export interface ProductRecord {
  slug: string;
  locale: Locale;
  category_slug: string | null;
  category_name?: string | null;
  name: string;
  short_description: string | null;
  description: string | null;
  price: number | null;
  currency: string;
  tags: string[];
  visibility: Visibility;
  display_order: number;
  images?: string[];
  specifications?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  updated_at: string;
}

export interface CategoryRecord {
  slug: string;
  locale: Locale;
  name: string;
  visibility: Visibility;
}

export interface MailTaskRecord {
  id: string;
  recipient_email: string;
  subject: string;
  template_key: string | null;
  body_preview: string | null;
  status: MailTaskStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export async function getOverview() {
  return request<ApiEnvelope<OverviewPayload>>('/api/management/overview');
}

export async function listSeoRecords(params: Record<string, any>) {
  return request<ApiEnvelope<SeoRecord[]>>('/api/seo/records', {
    params,
  });
}

export async function saveSeoRecord(
  key: string,
  data: {
    locale: Locale;
    title?: string | null;
    description?: string | null;
    keywords?: string[];
    og_image?: string | null;
    canonical?: string | null;
    no_index?: boolean;
    visibility?: Visibility;
    targets?: string[];
    extra?: Record<string, unknown>;
  },
) {
  return request<ApiEnvelope<SeoRecord>>(`/api/seo/${key}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteSeoRecord(key: string, locale: Locale) {
  return request(`/api/seo/${key}/${locale}`, {
    method: 'DELETE',
  });
}

export async function listProducts(params: Record<string, any>) {
  return request<ApiEnvelope<ProductRecord[]>>('/api/products', {
    params,
  });
}

export async function listCategories(params: Record<string, any>) {
  return request<ApiEnvelope<CategoryRecord[]>>('/api/products/categories', {
    params,
  });
}

export async function createProduct(payload: {
  slug: string;
  locale: Locale;
  data: Record<string, unknown>;
}) {
  return request<ApiEnvelope<ProductRecord>>('/api/products', {
    method: 'POST',
    data: payload,
  });
}

export async function updateProduct(
  slug: string,
  payload: {
    slug?: string;
    locale: Locale;
    data: Record<string, unknown>;
  },
) {
  return request<ApiEnvelope<ProductRecord>>(`/api/products/${slug}`, {
    method: 'PUT',
    data: payload,
  });
}

export async function deleteProduct(slug: string, locale: Locale) {
  return request(`/api/products/${slug}`, {
    method: 'DELETE',
    params: { locale },
  });
}

export async function listMailTasks(params: Record<string, any>) {
  return request<ApiEnvelope<MailTaskRecord[]>>('/api/mail/tasks', {
    params,
  });
}

export async function createMailTask(data: Record<string, unknown>) {
  return request<ApiEnvelope<MailTaskRecord>>('/api/mail/tasks', {
    method: 'POST',
    data: { data },
  });
}

export async function updateMailTask(id: string, data: Record<string, unknown>) {
  return request<ApiEnvelope<MailTaskRecord>>(`/api/mail/tasks/${id}`, {
    method: 'PUT',
    data: { data },
  });
}

export async function queueMailTask(id: string) {
  return request<ApiEnvelope<MailTaskRecord>>(`/api/mail/tasks/${id}/queue`, {
    method: 'POST',
  });
}

export async function markMailTaskSent(id: string) {
  return request<ApiEnvelope<MailTaskRecord>>(`/api/mail/tasks/${id}/mark-sent`, {
    method: 'POST',
  });
}

export async function deleteMailTask(id: string) {
  return request(`/api/mail/tasks/${id}`, {
    method: 'DELETE',
  });
}
