// Separate the song name and performer from common YouTube title formats.
// Ambiguous titles can be corrected by video ID in work-overrides.json.
export function songMetadata(videoTitle) {
  let text = videoTitle.replace(/【[^】]*】|〖[^〗]*〗/g, '').trim();
  text = text.replace(/\s*\((?:Official Music Video|Dance Practice)\)\s*$/i, '').trim();
  text = text.replace(/^\d+(?:st|nd|rd|th)オリジナル曲\s*/i, '');
  text = text.replace(/^GYU\s*P\s*[-－]\s*/i, '');
  text = text.replace(/^[『「]|[』」]$/g, '').trim();
  const split = text.split(/\s*[/／]\s*/);
  const title = split[0].replace(/^[『「]|[』」]$/g, '').trim();
  const performer = split.slice(1).join(' / ').replace(/^[『「]|[』」]$/g, '').trim();
  const artist = performer.replace(/^GYU\s*P\s+feat[.．]?\s*/i, '').trim();
  return { title, artist };
}
