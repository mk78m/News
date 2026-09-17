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
  iranintl:{page:'https://www.iranintl.com/', feeds:['https://www.iranintl.com/feed'], items:['article','.card','.story'], title:['h2','h3'], link:['a[href]'], desc:['p'], image:['img'], date:['time[datetime]','time']},
  euronews:{page:'https://www.euronews.com/', feeds:['https://www.euronews.com/rss?format=mrss&level=theme&name=news'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  france24:{page:'https://www.france24.com/en/', feeds:['https://www.france24.com/en/rss'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  nhk:{page:'https://www3.nhk.or.jp/nhkworld/', feeds:['https://www3.nhk.or.jp/rssxml/news/globalnewsroom.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  cbc:{page:'https://www.cbc.ca/news/world', feeds:['https://www.cbc.ca/webfeed/rss/rss-world'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  npr:{page:'https://www.npr.org/sections/world/', feeds:['https://feeds.npr.org/1004/rss.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  rfi:{page:'https://www.rfi.fr/en/', feeds:['https://www.rfi.fr/en/rss'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  upi:{page:'https://www.upi.com/Top_News/World-News/', feeds:['https://rss.upi.com/news/world-news.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  pbs:{page:'https://www.pbs.org/newshour/', feeds:['https://www.pbs.org/newshour/feeds/rss/headlines'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  cbs:{page:'https://www.cbsnews.com/world/', feeds:['https://www.cbsnews.com/latest/rss/main'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  abcau:{page:'https://www.abc.net.au/news/world/', feeds:['https://www.abc.net.au/news/feed/51120/rss.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  smh:{page:'https://www.smh.com.au/world', feeds:['https://www.smh.com.au/rss/feed.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  hindu:{page:'https://www.thehindu.com/news/international/', feeds:['https://www.thehindu.com/news/feeder/default.rss'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  indianexpress:{page:'https://indianexpress.com/section/world/', feeds:['https://indianexpress.com/section/world/feed/'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  scmp:{page:'https://www.scmp.com/world', feeds:['https://www.scmp.com/rss/2/feed'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  lemonde:{page:'https://www.lemonde.fr/en/international/', feeds:['https://www.lemonde.fr/en/international/rss_full.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  politico:{page:'https://www.politico.com/', feeds:['https://www.politico.com/rss/politicopicks.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  time:{page:'https://time.com/', feeds:['https://time.com/feed/'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  techcrunch:{page:'https://techcrunch.com/', feeds:['https://techcrunch.com/feed/'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  verge:{page:'https://www.theverge.com/', feeds:['https://www.theverge.com/rss/index.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  arstechnica:{page:'https://arstechnica.com/', feeds:['https://feeds.arstechnica.com/arstechnica/index'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  nature:{page:'https://www.nature.com/', feeds:['https://www.nature.com/nature.rss'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  spacenews:{page:'https://spacenews.com/', feeds:['https://spacenews.com/feed/'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  sciencedaily:{page:'https://www.sciencedaily.com/', feeds:['https://www.sciencedaily.com/rss/all.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']},
  economist:{page:'https://www.economist.com/', feeds:['https://www.economist.com/the-world-this-week/rss.xml'], items:['article','li','.card','.teaser'], title:['h2','h3','h4','.title'], link:['a[href]'], desc:['p','.description','.summary'], image:['img'], date:['time[datetime]','time']}
};


const ALL_STRATEGIES = ['rss','discover','html','jina','jinafeed','sitemap','google','proxyfeed','proxyhtml'];
// هر منبع چند مسیر مستقل دارد. هیچ مسیر جای مسیر دیگری را نمی‌گیرد.
const SOURCE_STRATEGIES = Object.fromEntries(Object.keys(SOURCES).map(id => [id, ALL_STRATEGIES]));

const FETCH_PROXIES = [
  {name:'allorigins', build:u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`},
  {name:'codetabs', build:u=>`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`},
  {name:'corsproxy', build:u=>`https://corsproxy.io/?url=${encodeURIComponent(u)}`},
  {name:'cors-eu', build:u=>`https://cors.eu.org/${u}`}
];

const ALLOWED_HOSTS = new Set(Object.values(SOURCES).flatMap(x=>[x.page,...x.feeds]).map(u=>{try{return new URL(u).hostname.toLowerCase()}catch{return ''}}).filter(Boolean));
function allowed(url){try{const h=new URL(url).hostname.toLowerCase();return [...ALLOWED_HOSTS].some(x=>h===x||h.endsWith('.'+x));}catch{return false;}}
function abs(base,v){try{return v?new URL(v,base).href:''}catch{return ''}}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function parseDate(v){const t=Date.parse(v||'');return Number.isFinite(t)?t:Date.now()}
function imageFrom($,el,base){
  for(const sel of ['img','source']){const n=$(el).find(sel).first(); if(n.length){for(const a of ['src','data-src','data-original','content']){const v=n.attr(a); if(v)return abs(base,v)} const ss=n.attr('srcset'); if(ss)return abs(base,ss.split(',')[0].trim().split(/\s+/)[0]);}}
  return '';
}
function metaImage($,base){return abs(base,$('meta[property="og:image"]').attr('content')||$('meta[name="twitter:image"]').attr('content')||'')}
function normalize(x,source,base){const title=clean(x.title);const link=abs(base,x.link||x.url);if(!title||!link)return null;return {id:`${source.id}|${link}`,title,link,summary:clean(x.summary||x.contentSnippet||x.content).slice(0,700),image:abs(base,x.image||''),published_ts:parseDate(x.published_ts||x.isoDate||x.pubDate||x.date),sourceId:source.id,sourceName:source.name,group:source.group||'global',method:x.method||'unknown'};}
async function getText(url,headers={},timeout=20000,retries=1){
  let lastErr;
  for(let attempt=0; attempt<=retries; attempt++){
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await fetch(url,{signal:c.signal,redirect:'follow',headers});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    }catch(e){
      lastErr=e;
      if(attempt<retries) await new Promise(r=>setTimeout(r,250*(attempt+1)));
    }finally{clearTimeout(t)}
  }
  throw lastErr || new Error('fetch failed');
}

const feedCache = new Map();
async function parseFeed(url,source){
  const prev=feedCache.get(url)||{};
  const headers={'User-Agent':'NewsAggregator/4.0 (+live-feed)','Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'};
  if(prev.etag) headers['If-None-Match']=prev.etag;
  if(prev.lastModified) headers['If-Modified-Since']=prev.lastModified;
  const c=new AbortController(); const timer=setTimeout(()=>c.abort(),12000);
  try{
    const r=await fetch(url,{signal:c.signal,redirect:'follow',headers});
    if(r.status===304 && prev.items) return prev.items;
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const text=await r.text();
    const feed=await parser.parseString(text);
    const items=(feed.items||[]).map(x=>normalize(x,source,url)).filter(Boolean).slice(0,50).map(x=>(x.method='rss',x));
    feedCache.set(url,{etag:r.headers.get('etag')||prev.etag||null,lastModified:r.headers.get('last-modified')||prev.lastModified||null,items});
    return items;
  }finally{clearTimeout(timer);}
}
function jsonLd($,source,page){const out=[];$('script[type="application/ld+json"]').each((_,el)=>{try{const raw=JSON.parse($(el).text());const arr=Array.isArray(raw)?raw:[raw];for(const obj of arr){const xs=obj?.itemListElement||[];for(const it of xs){const a=it.item||it;if(a?.headline||a?.name){out.push(normalize({title:a.headline||a.name,link:a.url||a['@id'],summary:a.description,image:a.image,published_ts:a.datePublished||a.dateModified},source,page));}}}}catch{}});return out.filter(Boolean)}
async function parseHtml(url,source,cfg){const body=await getText(url,{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36 NewsAggregator/3.0','Accept':'text/html,application/xhtml+xml'},22000);const $=cheerio.load(body);const out=[];const seen=new Set();
  const push=(el)=>{let title='';for(const s of cfg.title){title=clean($(el).find(s).first().text());if(title)break}let href='';for(const s of cfg.link){href=$(el).find(s).first().attr('href')||'';if(href)break}if(!title||!href||title.length<8)return;const link=abs(url,href);if(!link||seen.has(link))return;seen.add(link);let summary='';for(const s of cfg.desc){summary=clean($(el).find(s).first().text());if(summary)break}let date='';for(const s of cfg.date){const n=$(el).find(s).first();date=n.attr('datetime')||n.attr('content')||clean(n.text());if(date)break}out.push(normalize({title,link,summary,image:imageFrom($,el,url),published_ts:date},source,url));};
  for(const itemSel of cfg.items){$(itemSel).each((_,el)=>{if(out.length<50)push(el)});if(out.length>=12)break}
  if(out.length<5){for(const x of jsonLd($,source,url)){if(!seen.has(x.link)){seen.add(x.link);out.push(x)}}}
  if(out.length<5){const og=metaImage($,url);$('a[href]').each((_,a)=>{if(out.length>=30)return;const title=clean($(a).text());const href=$(a).attr('href');if(title.length>=30&&href){const link=abs(url,href);if(link&&!seen.has(link)&&new URL(link).hostname===new URL(url).hostname){seen.add(link);out.push(normalize({title,link,image:og},source,url))}}})}
  return out.filter(Boolean).slice(0,50).map(x=>(x.method='site-html',x));
}
function googleNewsFeedsFor(source){
  const domain=source.domain || (()=>{try{return new URL(source.page).hostname.replace(/^www\./,'')}catch{return ''}})();
  if(!domain) return [];
  const q=encodeURIComponent(`site:${domain}`);
  const lang=source.lang==='fa' ? 'fa' : 'en-US';
  const gl=source.group==='iran' ? 'IR' : 'US';
  const ceid=source.group==='iran' ? 'IR:fa' : 'US:en';
  return [
    `https://news.google.com/rss/search?q=${q}&hl=${lang}&gl=${gl}&ceid=${ceid}`,
    `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`
  ];
}
function googleNewsFeedFor(source){ return googleNewsFeedsFor(source)[0] || null; }

async function fetchViaJina(page,source){
  const target='https://r.jina.ai/http://'+page.replace(/^https?:\/\//,'');
  const body=await getText(target,{'User-Agent':'Mozilla/5.0 NewsAggregator/5.0','Accept':'text/plain,text/html;q=0.9'},18000);
  const $=cheerio.load(body);
  const out=[]; const seen=new Set();
  $('a').each((_,a)=>{
    if(out.length>=50) return;
    const title=clean($(a).text()); const href=$(a).attr('href');
    if(title.length<20 || !href) return;
    let link=abs(page,href); if(!link) return;
    try{if(new URL(link).hostname!==new URL(page).hostname) return;}catch{return;}
    if(seen.has(link)) return; seen.add(link);
    out.push(normalize({title,link},source,page));
  });
  return out.filter(Boolean).map(x=>(x.method='jina-reader',x));
}
async function discoverSitemaps(page){
  const origin=new URL(page).origin;
  const candidates=[`${origin}/sitemap.xml`,`${origin}/sitemap_index.xml`,`${origin}/news-sitemap.xml`,`${origin}/sitemap-news.xml`];
  const robots=`${origin}/robots.txt`;
  try{
    const txt=await getText(robots,{'User-Agent':'NewsAggregator/5.0'},7000);
    for(const line of txt.split(/\r?\n/)){const m=line.match(/^\s*Sitemap:\s*(\S+)/i);if(m)candidates.push(m[1]);}
  }catch{}
  return [...new Set(candidates)].slice(0,10);
}
async function parseSitemap(url,source){
  const text=await getText(url,{'User-Agent':'NewsAggregator/5.0','Accept':'application/xml,text/xml;q=0.9'},12000);
  const $=cheerio.load(text,{xmlMode:true}); const locs=[];
  $('url > loc, sitemap > loc').each((_,el)=>{const v=clean($(el).text());if(v)locs.push(v)});
  const articleLinks=locs.filter(u=>/\/(news|world|iran|politics|sport|business|technology|science|economy|international|article|story|202\d)[\/-]/i.test(u));
  const urls=(articleLinks.length?articleLinks:locs).slice(0,35);
  return urls.map(link=>normalize({title:link.split('/').filter(Boolean).pop()?.replace(/[-_]+/g,' ')||'خبر',link},source,url)).filter(Boolean).map(x=>(x.method='sitemap',x));
}

async function discoverFeeds(page,source){
  try{
    const html=await getText(page,{'User-Agent':'Mozilla/5.0 NewsAggregator/5.0'},10000);
    const $=cheerio.load(html);
    const out=new Set();
    $('link[rel="alternate"][type="application/rss+xml"],link[rel="alternate"][type="application/atom+xml"],link[type="application/rss+xml"],link[type="application/atom+xml"]').each((_,el)=>{const h=$(el).attr('href');if(h){const u=abs(page,h);if(u)out.add(u)}});
    return [...out].slice(0,6);
  }catch{return []}
}

async function parseFeedViaProxy(target, source, proxy){
  const text=await getText(proxy.build(target),{
    'User-Agent':'Mozilla/5.0 NewsAggregator/6.0',
    'Accept':'application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain;q=0.8, */*;q=0.5'
  },9000);
  if(!text || text.length<80) throw new Error(proxy.name+':empty');
  const items=(await parser.parseString(text).then(feed=>(feed.items||[]).map(x=>normalize(x,source,target)).filter(Boolean))).slice(0,50).map(x=>(x.method='proxy:'+proxy.name,x));
  if(!items.length) throw new Error(proxy.name+':no-items');
  return items;
}
async function htmlViaProxy(target, source, proxy){
  const text=await getText(proxy.build(target),{'User-Agent':'Mozilla/5.0 NewsAggregator/6.0','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'},10000);
  const cfg=SOURCES[source.id];
  if(!text || !cfg) throw new Error(proxy.name+':empty');
  const $=cheerio.load(text); const out=[]; const seen=new Set();
  const selectors=cfg.items||['article','li'];
  for(const itemSel of selectors){
    $(itemSel).each((_,el)=>{
      if(out.length>=35) return;
      let title=''; for(const sel of (cfg.title||['h2','h3'])){title=clean($(el).find(sel).first().text());if(title)break;}
      let href=''; for(const sel of (cfg.link||['a[href]'])){href=$(el).find(sel).first().attr('href')||'';if(href)break;}
      if(title.length<8||!href)return;
      const link=abs(target,href); if(!link||seen.has(link))return; seen.add(link);
      let summary=''; for(const sel of (cfg.desc||['p'])){summary=clean($(el).find(sel).first().text());if(summary)break;}
      let date=''; for(const sel of (cfg.date||['time[datetime]','time'])){const n=$(el).find(sel).first();date=n.attr('datetime')||n.attr('content')||clean(n.text());if(date)break;}
      const image=imageFrom($,el,target);
      const rec=normalize({title,link,summary,image,published_ts:date},source,target); if(rec) out.push(rec);
    });
    if(out.length>=12) break;
  }
  if(!out.length) throw new Error(proxy.name+':no-html-items');
  return out.map(x=>(x.method='proxy-html:'+proxy.name,x));
}
async function fetchViaJinaFeed(target,source){
  const jina='https://r.jina.ai/http://'+target.replace(/^https?:\/\//,'');
  const text=await getText(jina,{'User-Agent':'Mozilla/5.0 NewsAggregator/6.0','Accept':'text/plain,*/*;q=0.8'},12000);
  if(/<rss|<feed|<item[ >]/i.test(text)){
    const items=(await parser.parseString(text)).items||[];
    const out=items.map(x=>normalize(x,source,target)).filter(Boolean).slice(0,50).map(x=>(x.method='jina-feed',x));
    if(out.length) return out;
  }
  throw new Error('jina-feed:no-items');
}

function alternateFeedCandidates(source){
  const out=new Set();
  try{
    const u=new URL(source.page);
    const origin=u.origin;
    const host=u.hostname.toLowerCase();
    const common=['/rss','/rss.xml','/feed','/feed.xml','/atom.xml'];
    for(const path of common) out.add(origin+path);
    if(host.includes('tasnimnews')) out.add(origin+'/fa/rss/feed/0/7/0');
    if(host.includes('asriran')) out.add(origin+'/fa/rss/allnews');
    if(host.includes('tabnak')) out.add(origin+'/fa/rss/allnews');
    if(host.includes('mizanonline')) out.add(origin+'/fa/rss/allnews');
    if(host.includes('entekhab')) out.add(origin+'/fa/rss/allnews');
    if(host.includes('khabaronline')) out.add(origin+'/rss');
    if(host.includes('irna')) out.add(origin+'/rss');
    if(host.includes('isna')) out.add(origin+'/rss');
    if(host.includes('mehrnews')) out.add(origin+'/rss');
    if(host.includes('iranintl')) out.add(origin+'/feed');
    if(host.includes('bbc.')) out.add('https://feeds.bbci.co.uk/news/rss.xml');
    if(host.includes('guardian')) out.add(origin+'/world/rss');
    if(host.includes('cnn.')) out.add('https://rss.cnn.com/rss/cnn_topstories.rss');
    if(host.includes('nbcnews')) out.add('https://feeds.nbcnews.com/nbcnews/public/world');
    if(host.includes('npr.org')) out.add('https://feeds.npr.org/1004/rss.xml');
    if(host.includes('techcrunch')) out.add('https://techcrunch.com/feed/');
    if(host.includes('theverge')) out.add('https://www.theverge.com/rss/index.xml');
    if(host.includes('arstechnica')) out.add('https://feeds.arstechnica.com/arstechnica/index');
  }catch{}
  return [...out].slice(0,8);
}

async function fetchOneStrategy(kind,url,source){
  if(kind==='rss' || kind==='rss-alt') return await parseFeed(url,source);
  if(kind==='html') return await parseHtml(url,source,SOURCES[source.id]);
  if(kind==='google') return await parseFeed(url,source);
  if(kind==='jina') return await fetchViaJina(url,source);
  if(kind==='jinafeed') return await fetchViaJinaFeed(url,source);
  if(kind==='sitemap') {
    const maps=await discoverSitemaps(url);
    const rs=await Promise.allSettled(maps.map(m=>parseSitemap(m,source)));
    return rs.flatMap(x=>x.status==='fulfilled'?x.value:[]);
  }
  if(kind==='discover') {
    const feeds=await discoverFeeds(url,source);
    const rs=await Promise.allSettled(feeds.map(f=>parseFeed(f,source)));
    return rs.flatMap(x=>x.status==='fulfilled'?x.value:[]);
  }
  if(kind==='proxyfeed') return await parseFeedViaProxy(url,source,arguments[3]);
  if(kind==='proxyhtml') return await htmlViaProxy(url,source,arguments[3]);
  return [];
}

async function fetchSource(source){
  const cfg=SOURCES[source.id]; if(!cfg) throw new Error('Unknown source: '+source.id);
  const candidates=[];
  const push=(kind,url,extra)=>{if(url)candidates.push({kind,url,extra});};
  const enabled=new Set(SOURCE_STRATEGIES[source.id]||ALL_STRATEGIES);
  if(enabled.has('rss')) {
    for(const feed of (cfg.feeds||[])) push('rss',feed);
    for(const feed of alternateFeedCandidates(source)) push('rss-alt',feed);
  }
  if(enabled.has('discover') && cfg.page) push('discover',cfg.page);
  if(enabled.has('html') && cfg.page) push('html',cfg.page);
  if(enabled.has('jina') && cfg.page) push('jina',cfg.page);
  if(enabled.has('sitemap') && cfg.page) push('sitemap',cfg.page);
  if(enabled.has('google')) for(const gn of googleNewsFeedsFor(source)) push('google',gn);
  // مسیرهای مستقل proxy برای هر فید رسمی
  if(enabled.has('proxyfeed')) for(const feed of (cfg.feeds||[])) for(const proxy of FETCH_PROXIES) push('proxyfeed',feed,proxy);
  if(enabled.has('proxyfeed')) for(const gn of googleNewsFeedsFor(source)) for(const proxy of FETCH_PROXIES.slice(0,3)) push('proxyfeed',gn,proxy);
  if(enabled.has('jinafeed')) for(const feed of (cfg.feeds||[])) push('jinafeed',feed);
  if(enabled.has('proxyhtml') && cfg.page) for(const proxy of FETCH_PROXIES.slice(0,3)) push('proxyhtml',cfg.page,proxy);

  // همهٔ مسیرها مستقل و هم‌زمان اجرا می‌شوند؛ یک شکست هیچ مسیر دیگری را متوقف نمی‌کند.
  const results=await Promise.allSettled(candidates.map(c=>
    c.kind==='proxyfeed' || c.kind==='proxyhtml'
      ? fetchOneStrategy(c.kind,c.url,source,c.extra)
      : fetchOneStrategy(c.kind,c.url,source)
  ));
  const merged=[]; const seen=new Set(); const methods=[]; const errors=[];
  const canonical=u=>{try{const x=new URL(u);x.hash='';['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(k=>x.searchParams.delete(k));return x.href.replace(/\/$/,'')}catch{return String(u||'').trim()}};
  results.forEach((r,i)=>{
    if(r.status==='fulfilled'){
      const arr=Array.isArray(r.value)?r.value:[]; if(arr.length) methods.push(candidates[i].kind+(candidates[i].extra?':'+candidates[i].extra.name:''));
      for(const item of arr){const key=canonical(item?.link)||item?.id||item?.title;if(!key||seen.has(key))continue;seen.add(key);merged.push(item);}
    } else errors.push(`${candidates[i].kind}:${r.reason?.message||'failed'}`);
  });
  merged.sort((a,b)=>(b.published_ts||0)-(a.published_ts||0));
  if(!merged.length) throw new Error(errors.slice(0,8).join(' | ')||'No articles found');
  return {items:merged.slice(0,80),method:[...new Set(methods)].join('+'),sourceUrl:candidates.map(x=>x.url).join(' | ')};
}

app.get('/health',(_,res)=>res.json({ok:true,service:'news-fetcher-v3',time:new Date().toISOString(),sources:Object.keys(SOURCES).length}));
app.get('/api/sources',(_,res)=>res.json({ok:true,count:Object.keys(SOURCES).length,sources:Object.entries(SOURCES).map(([id,x])=>({id,page:x.page,feeds:x.feeds}))}));
app.get('/api/feed-status',(_,res)=>res.json({ok:true,time:new Date().toISOString(),sources:Object.keys(SOURCES).length,cachedFeeds:feedCache.size,strategies:['rss','rss-alt','autodiscovery','html','jina-reader','jina-feed','sitemap','google-news','proxyfeed','proxyhtml'],sourceStrategies:Object.fromEntries(Object.keys(SOURCES).map(id=>[id,SOURCE_STRATEGIES[id]||['rss','discover','html','jina','sitemap','google']]))}));
app.post('/api/fetch-all',async(req,res)=>{
  const started=Date.now();
  const entries=Object.entries(SOURCES);
  const results=await Promise.all(entries.map(async ([id,source])=>{
    try{const r=await fetchSource({id,...source});return {id,ok:true,items:r.items||[],method:r.method||'',sourceUrl:r.sourceUrl||''};}
    catch(e){return {id,ok:false,items:[],error:e.message};}
  }));
  res.json({ok:true,elapsed_ms:Date.now()-started,sources:results});
});

app.post('/api/fetch-source',async(req,res)=>{const source=req.body?.source;if(!source?.id)return res.status(400).json({ok:false,error:'source.id is required'});const started=Date.now();try{const r=await fetchSource(source);res.json({ok:true,elapsed_ms:Date.now()-started,...r})}catch(e){res.status(502).json({ok:false,error:e.message,elapsed_ms:Date.now()-started})}});


// ---------------- Web Push + background news monitor ----------------
const PUSH_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PUSH_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const PUSH_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';
const PUSH_ENABLED = Boolean(PUSH_PUBLIC_KEY && PUSH_PRIVATE_KEY);
if(PUSH_ENABLED) webpush.setVapidDetails(PUSH_EMAIL, PUSH_PUBLIC_KEY, PUSH_PRIVATE_KEY);
const pushSubscriptions = new Map();
const backgroundSeen = new Set();
let backgroundPrimed = false;
let backgroundRunning = false;
let backgroundLastRun = 0;

app.get('/api/push/public-key',(_,res)=>res.json({ok:PUSH_ENABLED,publicKey:PUSH_PUBLIC_KEY||null}));
app.post('/api/push/subscribe',(req,res)=>{
  const sub=req.body;
  if(!sub?.endpoint) return res.status(400).json({ok:false,error:'subscription.endpoint is required'});
  pushSubscriptions.set(sub.endpoint, sub);
  res.json({ok:true,subscribers:pushSubscriptions.size});
});
app.post('/api/push/unsubscribe',(req,res)=>{
  const endpoint=req.body?.endpoint;
  if(endpoint) pushSubscriptions.delete(endpoint);
  res.json({ok:true,subscribers:pushSubscriptions.size});
});

async function sendPushForArticle(item){
  if(!PUSH_ENABLED || !pushSubscriptions.size) return;
  const payload=JSON.stringify({
    title:`خبر جدید · ${item.sourceName || 'منبع خبری'}`,
    body:item.title,
    url:item.link,
    tag:`news-${item.id}`
  });
  for(const [endpoint,sub] of [...pushSubscriptions]){
    try{ await webpush.sendNotification(sub,payload); }
    catch(e){
      if(e.statusCode===404 || e.statusCode===410) pushSubscriptions.delete(endpoint);
    }
  }
}
async function backgroundPoll(){
  if(backgroundRunning) return;
  backgroundRunning=true;
  try{
    const results=await Promise.all(Object.entries(SOURCES).map(async ([id,source])=>{
      try{return await fetchSource({id,...source});}catch(e){return {items:[]};}
    }));
    const fresh=[];
    for(const result of results){
      for(const item of (result.items||[])){
        if(!item?.id || backgroundSeen.has(item.id)) continue;
        backgroundSeen.add(item.id);
        fresh.push(item);
      }
    }
    // اولین اجرای مانیتور فقط وضعیت فعلی را seed می‌کند؛ اعلان انبوه نمی‌فرستد.
    if(!backgroundPrimed){ backgroundPrimed=true; return; }
    fresh.sort((a,b)=>b.published_ts-a.published_ts);
    for(const item of fresh.slice(0,20)) await sendPushForArticle(item);
  }finally{ backgroundRunning=false; }
}

app.post('/api/background-poll',async(_,res)=>{
  await backgroundPoll();
  res.json({ok:true,primed:backgroundPrimed,subscribers:pushSubscriptions.size,seen:backgroundSeen.size,time:new Date().toISOString()});
});
setTimeout(()=>backgroundPoll().catch(()=>{}),15000);
setInterval(()=>{if(!backgroundRunning) backgroundPoll().catch(()=>{});},60*1000);

app.listen(PORT,()=>console.log(`News fetcher v4 + push listening on ${PORT}`));
