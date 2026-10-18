// Cloudflare Pages Function: POST /api/contact
const GOOGLE_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScpd46ezLkcLj5QMhAx0AdNtQSxM3kU08yRE5G6DP4pSXvbGg/formResponse';
const FIELDS = {
  name: 'entry.588998168', email: 'entry.476214014',
  service: 'entry.1610329698', message: 'entry.1646642689', time: 'entry.1091995575'
};
const reply = (status, data) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
});

export async function onRequestPost({ request }) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply(403, { success:false, code:'ORIGIN_REJECTED' });
  // Read a bounded body; do not log or store contact details.
  if (!request.body || !/application\/x-www-form-urlencoded/i.test(request.headers.get('Content-Type') || '')) {
    return reply(400, { success:false, code:'INVALID_BODY' });
  }
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 48000) { await reader.cancel(); return reply(413, { success:false, code:'BODY_TOO_LARGE' }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const incoming = new URLSearchParams(new TextDecoder().decode(bytes));
  const values = Object.fromEntries(Object.entries(FIELDS).map(([name, key]) => [name, (incoming.get(key) || '').trim()]));
  if (!values.name || values.name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 254 ||
      !['花禮','單堂花藝課','專業花藝課','場地佈置'].includes(values.service) ||
      !values.message || values.message.length > 3000 || !values.time || values.time.length > 100) {
    return reply(400, { success:false, code:'INVALID_FIELDS' });
  }
  const payload = new URLSearchParams();
  for (const [name, key] of Object.entries(FIELDS)) payload.set(key, values[name]);
  payload.set('fvv', '1');
  payload.set('pageHistory', '0');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);
  try {
    const result = await fetch(GOOGLE_ACTION, {
      method:'POST', body:payload, headers:{ 'Accept-Language':'en-US,en;q=0.9' },
      signal:controller.signal, redirect:'follow'
    });
    const html = await result.text();
    // A 200 or opaque iframe load alone does not prove acceptance.
    const hasReceipt = /class=["'][^"']*\b(?:vHW8K|freebirdFormviewerViewResponseConfirmationMessage)\b[^"']*["'][^>]*>\s*[^<\s]/i.test(html) ||
      /Your response has been recorded\.|你的回覆已記錄|您的回覆已記錄|已記錄你的回覆|已記錄您的回覆/.test(html);
    const isGoogleForms = new URL(result.url).origin === 'https://docs.google.com';
    if (!result.ok || !isGoogleForms || !hasReceipt || /accounts\.google\.com\/ServiceLogin/.test(result.url)) {
      return reply(502, { success:false, code:'NOT_CONFIRMED' });
    }
    return reply(200, { success:true });
  } catch {
    // Do not retry automatically: Google may already have accepted the response.
    return reply(502, { success:false, code:'NOT_CONFIRMED' });
  } finally {
    clearTimeout(timeout);
  }
}

export function onRequestGet() {
  return reply(405, { success:false, code:'METHOD_NOT_ALLOWED' });
}
