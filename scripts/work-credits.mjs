export function creditsFrom(description) {
  const credits = {};
  let artist;
  const append = (field, value) => {
    const names = new Set([...(credits[field]?.split('・') ?? []), ...value.split('・')]);
    credits[field] = [...names].join('・');
  };
  for (const raw of description.normalize('NFKC').split(/\r?\n/)) {
    const line = raw.trim().replace(/^[・●■◇◆○◎✦\s]+/, '');
    const match = line.match(/^((?:(?:作詞|作曲|編曲|歌唱|歌手|ボーカル|音楽|曲|歌|絵|動画|映像)|(?:lyrics|lyricist|composition|composer|arrangement|arranger|music|vocals?|illust|movie|mix|produce))(?:(?:[・、,&/\s]*(?:作詞|作曲|編曲|絵|動画|映像|illust|movie|mix|produce)))*)(?:\s*[:→/_]+\s*|\s+)(.+)$/i);
    if (!match) continue;
    const label = match[1].toLowerCase();
    const value = match[2].replace(/[\u200b-\u200f\u202a-\u202e]/g, '').replace(/\s*@\S+.*$/, '').replace(/\(?\s*https?:\/\/.*$/, '').replace(/\s*[/／]\s*$/, '').replace(/\s*様$/, '').trim();
    if (!value || /^[┈─━ー-]+$/.test(value)) continue;
    const name = value.replace(/gyu[\s-]*p/gi, 'GYU P').replace(/^GYU P\([^)]*\)$/, 'GYU P');
    if (/作詞|lyrics|lyricist/.test(label)) append('lyrics', name);
    if (/作曲|composition|composer/.test(label)) append('composition', name);
    if (/編曲|arrangement|arranger/.test(label)) append('arrangement', name);
    if (/音楽|music|^曲(?:$|[・/\s])/.test(label)) append('music', name);
    if (/^(歌唱|歌手|歌|ボーカル|vocals?)(?:$|[&\s])/.test(label)) artist = name;
  }
  if (credits.music) {
    for (const field of ['lyrics', 'composition', 'arrangement']) {
      credits[field] ??= credits.music;
    }
  }
  return { credits, artist, roles: [] };
}
