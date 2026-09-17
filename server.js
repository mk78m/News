const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 10000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36 NewsAggregator/3.0' } });

app.use(cors({ origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN.split(',').map(s => s.trim()) }));
app.use(express.json({ limit: '256kb' }));

const SOURCES = {
  bbc:{page:'https://www.bbc.com/news', feeds:['https://feeds.bbci.co.uk/news/world/rss.xml'], items:['article'], title:['h2','[data-testid="card-headline"]'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  cnn:{page:'https://edition.cnn.com/world', feeds:['http://rss.cnn.com/rss/cnn_topstories.rss'], items:['article','.container__item','.card'], title:['.container__headline-text','h3','h2'], link:['a[href]'], desc:['.container__description','p'], image:['img'], date:['time[datetime]','time']},
  aljazeera:{page:'https://www.aljazeera.com/', feeds:['https://www.aljazeera.com/xml/rss/all.xml'], items:['article','.gc-item','.gc__content'], title:['h2','h3'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  guardian:{page:'https://www.theguardian.com/world', feeds:['https://www.theguardian.com/world/rss'], items:['article','.fc-item'], title:['h3','.fc-item__title','h2'], link:['a[href]'], desc:['.fc-item__standfirst','p'], image:['img'], date:['time[datetime]','time']},
  nyt:{page:'https://www.nytimes.com/section/world', feeds:['https://rss.nytimes.com/services/xml/rss/nyt/World.xml'], items:['article','li'], title:['h3','h2'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  skynews:{page:'https://news.sky.com/world', feeds:['https://feeds.skynews.com/feeds/rss/world.xml'], items:['article','.sdc-site-tile','.sdc-news-article'], title:['h3','h2'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  dw:{page:'https://www.dw.com/en/top-stories/s-9097', feeds:['https://rss.dw.com/rdf/rss-en-world'], items:['article','.teaser','.news'], title:['h2','h3','.news__title'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  nbc:{page:'https://www.nbcnews.com/world', feeds:['https://feeds.nbcnews.com/nbcnews/public/world'], items:['article','li','[data-testid="story-card"]'], title:['h2','h3'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  reuters:{page:'https://www.reuters.com/world/', feeds:[], items:['article','[data-testid="MediaStoryCard"]','.story-card'], title:['h3','h2','[data-testid="Heading"]'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  abc:{page:'https://abcnews.go.com/International', feeds:[], items:['article','.ContentList__Item','.Card'], title:['h2','h3'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  irna:{page:'https://www.irna.ir/', feeds:['https://www.irna.ir/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  isna:{page:'https://www.isna.ir/', feeds:['https://www.isna.ir/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  mehr:{page:'https://www.mehrnews.com/', feeds:['https://www.mehrnews.com/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  tasnim:{page:'https://www.tasnimnews.com/fa', feeds:['https://www.tasnimnews.com/fa/rss/feed/0/7/0/%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%A7%D8%B5%D9%84%DB%8C'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  fars:{page:'https://www.farsnews.ir/', feeds:['https://www.farsnews.ir/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  khabaronline:{page:'https://www.khabaronline.ir/', feeds:['https://www.khabaronline.ir/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  entekhab:{page:'https://www.entekhab.ir/', feeds:['https://www.entekhab.ir/fa/rss/allnews'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  etemadonline:{page:'https://www.etemadonline.com/', feeds:['https://www.etemadonline.com/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  jamaran:{page:'https://www.jamaran.news/', feeds:['https://www.jamaran.news/rss'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  asriran:{page:'https://www.asriran.com/', feeds:['https://www.asriran.com/fa/rss/allnews'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  tabnak:{page:'https://www.tabnak.ir/', feeds:['https://www.tabnak.ir/fa/rss/allnews'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  mizanonline:{page:'https://www.mizanonline.ir/', feeds:['https://www.mizanonline.ir/fa/rss/allnews'], items:['article','.item','.news-item','li'], title:['h2','h3','.title'], link:['a[href]'], desc:['.lead','p'], image:['img'], date:['time[datetime]','time']},
  iranintl:{page:'https://www.iranintl.com/', feeds:['https://www.iranintl.com/feed'], items:['article','.card','.story'], title:['h2','h3'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']}
};

const ALLOWED_HOSTS = new Set(Object.values(SOURCES).flatMap(x=>[x.page,...x.feeds]).map(u=>{try{return new URL(u).hostname.toLowerCase()}catch{return ''}}).filter(Boolean));
function allowed(url){try{const h=new URL(url).hostname.toLowerCase();return [...ALLOWED_HOSTS].some(x=>h===x||h.endsWith('.'+x));}catch{return false;}}
function abs(base,v){try{return v?new URL(v,base).href:''}catch{return ''}}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function parseDate(v){const t=Date.parse(v||'');return Number.isFinite(t)?t:Date.now()}
function imageFrom($,el,base){for(const sel of ['img','source']){const n=$(el).find(sel).first();if(n.length){for(const a of ['src','data-src','data-original','content']){const v=n.attr(a);if(v)return abs(base,v)}const ss=n.attr('srcset');if(ss)return abs(base,ss.split(',')[0].trim().split(/\s+/)[0]);}}return ''}
function metaImage($,base){return abs(base,$('meta[property="og:image"]').attr('content')||$('meta[name="twitter:image"]').attr('content')||'')}
function normalize(x,source,base){const title=clean(x.title);const link=abs(base,x.link||x.url);if(!title||!link)return null;return {id:`${source.id}|${link}`,title,link,summary:clean(x.summary||x.contentSnippet||x.content).slice(0,700),image:abs(base,x.image||''),published_ts:parseDate(x.published_ts||x.isoDate||x.pubDate||x.date),sourceId:source.id,sourceName:source.name,group:source.group||'global',method:x.method||'unknown'};}
async function getText(url,headers={},timeout=20000){const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.text()}finally{clearTimeout(t)}}
async function parseFeed(url,source){const feed=await parser.parseURL(url);return (feed.items||[]).map(x=>normalize(x,source,url)).filter(Boolean).slice(0,50).map(x=>(x.method='rss',x));}
function jsonLd($,source,page){const out=[];$('script[type="application/ld+json"]').each((_,el)=>{try{const raw=JSON.parse($(el).text());const arr=Array.isArray(raw)?raw:[raw];for(const obj of arr){const xs=obj?.itemListElement||[];for(const it of xs){const a=it.item||it;if(a?.headline||a?.name)out.push(normalize({title:a.headline||a.name,link:a.url||a['@id'],summary:a.description,image:a.image,published_ts:a.datePublished||a.dateModified},source,page));}}}catch{}});return out.filter(Boolean)}
async function parseHtml(url,source,cfg){const body=await getText(url,{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36 NewsAggregator/3.0','Accept':'text/html,application/xhtml+xml'},22000);const $=cheerio.load(body);const out=[];const seen=new Set();const push=(el)=>{let title='';for(const s of cfg.title){title=clean($(el).find(s).first().text());if(title)break}let href='';for(const s of cfg.link){href=$(el).find(s).first().attr('href')||'';if(href)break}if(!title||!href||title.length<8)return;const link=abs(url,href);if(!link||seen.has(link))return;seen.add(link);let summary='';for(const s of cfg.desc){summary=clean($(el).find(s).first().text());if(summary)break}let date='';for(const s of cfg.date){const n=$(el).find(s).first();date=n.attr('datetime')||n.attr('content')||clean(n.text());if(date)break}out.push(normalize({title,link,summary,image:imageFrom($,el,url),published_ts:date},source,url));};for(const itemSel of cfg.items){$(itemSel).each((_,el)=>{if(out.length<50)push(el)});if(out.length>=12)break}if(out.length<5){for(const x of jsonLd($,source,url)){if(!seen.has(x.link)){seen.add(x.link);out.push(x)}}}if(out.length<5){const og=metaImage($,url);$('a[href]').each((_,a)=>{if(out.length>=30)return;const title=clean($(a).text());const href=$(a).attr('href');if(title.length>=30&&href){const link=abs(url,href);if(link&&!seen.has(link)&&new URL(link).hostname===new URL(url).hostname){seen.add(link);out.push(normalize({title,link,image:og},source,url))}}})}return out.filter(Boolean).slice(0,50).map(x=>(x.method='site-html',x));}
async function fetchSource(source){const cfg=SOURCES[source.id];if(!cfg)throw new Error('Unknown source: '+source.id);const errors=[];for(const feed of cfg.feeds){try{const items=await parseFeed(feed,source);if(items.length)return {items,method:'rss',sourceUrl:feed}}catch(e){errors.push(`rss:${e.message}`)}}try{const items=await parseHtml(cfg.page,source,cfg);if(items.length)return {items,method:'site-html',sourceUrl:cfg.page}}catch(e){errors.push(`html:${e.message}`)}throw new Error(errors.join(' | ')||'No articles found');}

// ---------------- Web Push: افزوده شده بدون تغییر مسیر دریافت منابع ----------------
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BH2mX7YItPsAOWE0eKURROdqjWi2YXPp_Zyzh1HXgHwH2jBP5idEbpr1h67PwN9wvkUCIhRW4cNkhRrvrdGCYmE';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '89UuA1YgOM6eRf72-1j3H0VVqHLpkDAd6hg2DjTndME';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:news@example.com';
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const subscriptions = new Map();
const pushSeen = new Set();
let pushInitialized = false;
const PUSH_POLL_MS = 3 * 60 * 1000;
function subKey(sub){return sub?.endpoint || ''}
async function sendPushToAll(article){
  const payload=JSON.stringify({title:`خبر جدید · ${article.sourceName||'مرکز اخبار'}`,body:article.title||'خبر جدید دریافت شد',url:article.link||'/',tag:`news-${article.id}`});
  for(const [key,sub] of subscriptions){try{await webpush.sendNotification(sub,payload);}catch(e){if(e.statusCode===404||e.statusCode===410)subscriptions.delete(key);}}
}
async function backgroundNewsCheck(){
  const all=[];
  await Promise.all(Object.values(SOURCES).map(async src=>{try{const r=await fetchSource(src);for(const item of r.items||[])all.push(item)}catch(e){}}));
  all.sort((a,b)=>b.published_ts-a.published_ts);
  const fresh=all.filter(x=>x && x.link && !pushSeen.has(x.link));
  // اولین اجرا فقط وضعیت موجود را seed می‌کند؛ اعلان انبوه هنگام deploy ایجاد نمی‌شود.
  if(!pushInitialized){fresh.forEach(x=>pushSeen.add(x.link));pushInitialized=true;return;}
  for(const item of fresh.slice(0,80)){pushSeen.add(item.link);if(subscriptions.size)await sendPushToAll(item);}
}

app.get('/health',(_,res)=>res.json({ok:true,service:'news-fetcher-v3',time:new Date().toISOString(),sources:Object.keys(SOURCES).length,pushSubscribers:subscriptions.size,pushPolling:'3m'}));
app.get('/api/sources',(_,res)=>res.json({ok:true,sources:Object.entries(SOURCES).map(([id,x])=>({id,page:x.page,feeds:x.feeds}))}));
app.post('/api/fetch-source',async(req,res)=>{const source=req.body?.source;if(!source?.id)return res.status(400).json({ok:false,error:'source.id is required'});const started=Date.now();try{const r=await fetchSource(source);res.json({ok:true,elapsed_ms:Date.now()-started,...r})}catch(e){res.status(502).json({ok:false,error:e.message,elapsed_ms:Date.now()-started})}});
app.get('/api/push/config',(_,res)=>res.json({ok:true,publicKey:VAPID_PUBLIC_KEY}));
app.post('/api/push/subscribe',(req,res)=>{const sub=req.body?.subscription;if(!sub?.endpoint)return res.status(400).json({ok:false,error:'subscription.endpoint is required'});subscriptions.set(sub.endpoint,sub);res.json({ok:true,subscribers:subscriptions.size});});
app.post('/api/push/unsubscribe',(req,res)=>{const endpoint=req.body?.endpoint;if(endpoint)subscriptions.delete(endpoint);res.json({ok:true,subscribers:subscriptions.size});});

app.listen(PORT,()=>{
  console.log(`News fetcher v3 listening on ${PORT}`);
  // شروع پایش پس‌زمینه؛ مسیرهای RSS/HTML دقیقاً همان fetchSource قبلی هستند.
  backgroundNewsCheck().catch(e=>console.warn('[push initial check]',e));
  setInterval(()=>backgroundNewsCheck().catch(e=>console.warn('[push poll]',e)),PUSH_POLL_MS);
});
