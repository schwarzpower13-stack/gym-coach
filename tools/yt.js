// usage: node tools/yt.js "query" -> top results with channel
const q = process.argv[2];
const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&hl=en&gl=US';
const html = await (await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0', 'accept-language': 'en-US' } })).text();
const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
const data = JSON.parse(m[1]);
const out = [];
(function walk(o) {
  if (!o || typeof o !== 'object') return;
  if (o.videoRenderer) {
    const v = o.videoRenderer;
    out.push({ id: v.videoId, t: v.title?.runs?.map(r => r.text).join(''), ch: v.ownerText?.runs?.[0]?.text, len: v.lengthText?.simpleText });
  }
  for (const k in o) walk(o[k]);
})(data);
console.log(JSON.stringify(out.slice(0, 6)));
