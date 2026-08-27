export const LOGIN_PATH = '/user/login/';
export const DEFAULT_AUTHENTICATED_PATH = '/operations/dashboard/';

const LOGIN_PATH_ALIASES = ['/user/login', LOGIN_PATH];

export const isLoginPath = (pathname?: string) => (
  LOGIN_PATH_ALIASES.includes(pathname || '')
);

const withTrailingSlash = (pathname: string) => {
  if (pathname === '/' || pathname.endsWith('/')) return pathname;
  return `${pathname}/`;
};

export const normalizeInternalRedirect = (
  redirect?: string | null,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) => {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(redirect, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    if (isLoginPath(url.pathname)) return fallback;

    return `${withTrailingSlash(url.pathname)}${url.search}${url.hash}`;
  } catch (_error) {
    return fallback;
  }
};

export const buildLoginSearch = (redirect: string) => {
  return new URLSearchParams({
    redirect: normalizeInternalRedirect(redirect),
  }).toString();
};

export const buildLoginHref = (redirect: string) => {
  return `${LOGIN_PATH}?${buildLoginSearch(redirect)}`;
};
