const base = String(process.env.PUBLIC_BASE_URL || process.env.SEO_AUDIT_URL || '').replace(/\/$/, '');
if (!/^https:\/\//i.test(base)) {
  console.error('Set PUBLIC_BASE_URL or SEO_AUDIT_URL to the real HTTPS domain, e.g. https://haatbazar.example');
  process.exit(2);
}
const get = async (url) => {
  try { const r = await fetch(url, {redirect:'follow', signal:AbortSignal.timeout(12000)}); return {r, body:await r.text()}; }
  catch (e) { return {error:String(e)}; }
};
let failed = false;
const robots = await get(`${base}/robots.txt`);
if (!robots.r?.ok || !robots.body.includes('/sitemap.xml')) { console.error('FAIL robots.txt or Sitemap directive', robots.error || robots.r?.status); failed=true; }
else console.log('OK robots.txt and sitemap directive');
const sm = await get(`${base}/sitemap.xml`);
if (!sm.r?.ok || !sm.body.includes('<urlset')) { console.error('FAIL sitemap.xml', sm.error || sm.r?.status); failed=true; }
else {
 const urls = [...sm.body.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
 console.log(`OK sitemap.xml: ${urls.length} URLs`);
 if (!urls.length) { console.error('FAIL sitemap is empty'); failed=true; }
 for (const url of urls.slice(0,30)) {
  const p = await get(url);
  if (!p.r?.ok) { console.error('FAIL URL',p.r?.status,url);failed=true;continue; }
  const html=p.body;
  if (!/<title>\s*[^<]{3,}<\/title>/i.test(html)) { console.error('WARN missing title',url); }
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']{30,}["']/i.test(html)) console.error('WARN missing/short description',url);
  if (!/<link\s+rel=["']canonical["']\s+href=/i.test(html)) { console.error('WARN missing canonical',url); }
 }
 if(urls.length>30) console.log('Only first 30 sitemap URLs inspected to keep audit light.');
}
if (failed) process.exit(1);
console.log('SEO technical smoke audit finished. This does not measure rankings or guarantee organic traffic.');
