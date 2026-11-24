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
  pageDescriptions: {
    works: 'GYU Pの公式サイト。作詞・作曲・編曲を手がける音楽クリエイターのオリジナル楽曲・提供楽曲、歌唱者と制作クレジットを紹介します。楽曲制作のご依頼も受け付けています。',
    profile: '2006年生まれの音楽クリエイター、GYU Pのプロフィール。生楽器を使った曲、ノリノリな曲、かわいい曲を制作。提供曲・オリジナル曲と作詞・作曲・編曲の担当実績を掲載しています。',
    contact: 'GYU Pへの楽曲制作・楽曲提供・作詞・作曲・編曲のご依頼やご相談はこちら。XのDMとメールの連絡先をご案内しています。',
  },
  avatar: localUrl('/images/avatar.png'),
  biography: '2006年生まれ\nオリジナル楽曲の投稿および楽曲提供など\n生楽器を使った楽曲、ノリノリな楽曲、かわいい楽曲の制作が得意です(詳細はWORKSをご覧ください)\n音楽制作に関するご依頼、お待ちしております！',
  contactIntro: '楽曲制作・楽曲提供などのお問い合わせはこちらから。',
  contactEmail: { name: 'gyup.2018', domain: 'gmail.com' },
  contactTwitter: 'https://x.com/GYUP_bokaroP',
};
