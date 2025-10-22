import type { Request } from 'express';

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
  request: Request;
}

export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const buildPageUrl = (req: Request, page: number): string => {
  const protocol = (req.headers['x-forwarded-proto'] as string) ?? req.protocol ?? 'http';
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.originalUrl ?? req.url, `${protocol}://${host}`);
  url.searchParams.set('page', String(page));
  return url.toString();
};

export const buildPagination = <T>(items: T[], options: PaginationOptions): PaginatedResult<T> => {
  const { page, pageSize, total, request } = options;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const next = page < totalPages ? buildPageUrl(request, page + 1) : null;
  const previous = page > 1 ? buildPageUrl(request, page - 1) : null;

  return {
    count: total,
    next,
    previous,
    results: items,
  };
};
