/* ================================================================
   Visitor Tracker — 静默记录访客地理信息到 Supabase
   嵌入 index.html，对访客完全不可见
   ================================================================ */

// ====== 配置 ======
// TODO: 替换为你自己的 Supabase 项目信息
const SUPABASE_URL = 'https://dnujfnesbwpoutydjxdl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWSDsHUs2WJ0v_NfIJK3hg_LlzSl8TU';

(async function trackVisitor() {
  // 未配置则跳过
  if (SUPABASE_URL.startsWith('YOUR_')) return;
  if (!window.supabase) return;

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // 获取 IP 地理位置
    const res = await fetch('https://ipapi.co/json/');
    const geo = await res.json();
    if (geo.error) return;

    // IP 哈希（隐私保护）
    const encoder = new TextEncoder();
    const data = encoder.encode(geo.ip + '_visitor_salt_2025');
    const buf = await crypto.subtle.digest('SHA-256', data);
    const ipHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    // 24h 内同 IP 不重复记录
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: existing } = await sb
      .from('visits')
      .select('id')
      .eq('ip_hash', ipHash)
      .gte('visited_at', since)
      .limit(1);

    if (existing && existing.length > 0) return;

    // 记录访问
    await sb.from('visits').insert({
      ip_hash: ipHash,
      city: geo.city,
      country: geo.country_name,
      country_code: geo.country_code,
      lat: geo.latitude,
      lng: geo.longitude,
      page: window.location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch (e) {
    // 静默失败，不影响主页体验
  }
})();
