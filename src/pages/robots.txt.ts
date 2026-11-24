import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL, site ?? 'https://gyu-p.github.io/');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', root).href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
