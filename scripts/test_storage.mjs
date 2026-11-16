const SUPABASE_URL = 'https://kqfmahrxjuqlvxngeurj.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZm1haHJ4anVxbHZ4bmdldXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDY2MTcsImV4cCI6MjA5MzgyMjYxN30.hQUfMD0TJIG-RE5SAlKaXBiR4HQQrH2JQZyQx4mASvs';

async function test() {
  const url = `${SUPABASE_URL}/storage/v1/object/cineplay-videos/test.txt`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'text/plain',
      'x-upsert': 'true'
    },
    body: 'CinePlay Video Storage OK!'
  });
  console.log('Status:', res.status, await res.text());
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/cineplay-videos/test.txt`;
  console.log('Public URL:', publicUrl);
  const check = await fetch(publicUrl);
  console.log('Fetch Public status:', check.status, await check.text());
}
test();
