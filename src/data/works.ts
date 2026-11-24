import records from './works.json';

export type WorkKind = 'provided' | 'original';
export interface Work {
  id: string;
  number: string;
  title: string;
  artist?: string;
  credits?: { lyrics?: string; composition?: string; arrangement?: string; music?: string };
  roles?: string[];
  viewCount?: number | null;
  publishedAt?: string;
  syncedAt?: string;
  kind: WorkKind;
  /** 原案の掲載順。公開日を導入する場合はこの順序キーを置き換えます。 */
  latest: number;
  /** 人気順の手動スコア。アクセス数の自動取得は行いません。 */
  popularity: number;
  image: string;
  description: string;
  url: string | null;
  sample: boolean;
}

export function workRoles(work: Work): string[] {
  const fields = [['lyrics', '作詞'], ['composition', '作曲'], ['arrangement', '編曲']] as const;
  return fields.filter(([field]) => work.credits?.[field]?.split(/[・、,&／/]/).some(name =>
    name.normalize('NFKC').replace(/[\s-]/g, '').toUpperCase() === 'GYUP'
  )).map(([, label]) => label);
}

// JSONの誤入力はビルド時に発見し、壊れたページを公開しない。
const ids = new Set<string>();
export const works: Work[] = records.map(record => {
  if (!['provided', 'original'].includes(record.kind) || ids.has(record.id)) {
    throw new Error(`作品の種別またはIDが不正です: ${record.id}`);
  }
  if (!record.title || !record.image || !Number.isFinite(record.latest) || !Number.isFinite(record.popularity)) {
    throw new Error(`作品の必須項目が不正です: ${record.id}`);
  }
  if (record.url && !/^https:\/\//.test(record.url)) throw new Error(`作品URLにはHTTPSを指定してください: ${record.id}`);
  ids.add(record.id);
  return { ...record, kind: record.kind as WorkKind };
});
