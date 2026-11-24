import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const root = new URL(import.meta.env.BASE_URL, site ?? 'https://gyu-p.github.io/');
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const urls = ['', 'profile/', 'contact/'].map(path => `<url><loc>${escape(new URL(path, root).href)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
