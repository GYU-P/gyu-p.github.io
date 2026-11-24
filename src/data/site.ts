import { localUrl } from '../utils/url';
export type PageId = 'works' | 'profile' | 'contact';

export const navigation: { id: PageId; label: string; href: string }[] = [
  { id: 'works', label: 'WORKS', href: localUrl('/') },
  { id: 'profile', label: 'PROFILE', href: localUrl('/profile/') },
  { id: 'contact', label: 'CONTACT', href: localUrl('/contact/') },
];

export const site = {
  name: 'GYU P',
  title: 'GYU P 公式サイト',
  description: 'GYU Pの音楽ポートフォリオ。楽曲作品、プロフィール、お問い合わせ。',
  avatar: localUrl('/images/avatar.png'),
  biography: '2006年生まれ\nオリジナル楽曲の投稿および楽曲提供など\n生楽器を使った楽曲、ノリノリな楽曲、かわいい楽曲の制作が得意です(詳細はWORKSをご覧ください)\n音楽制作に関するご依頼、お待ちしております！',
  contactIntro: '楽曲制作・楽曲提供などのお問い合わせはこちらから。',
  contactEmail: { name: 'gyup.2018', domain: 'gmail.com' },
  contactTwitter: 'https://x.com/GYUP_bokaroP',
};
