// Simple smoke test for payments server Yoco create-checkout
const server = process.env.PAYMENTS_SERVER || 'http://localhost:4242';
const fetch = global.fetch || (await import('node-fetch')).default;

async function run() {
  const url = `${server.replace(/\/$/, '')}/yoco/create-checkout`;
  const userId = process.env.USER_ID || '00000000-0000-4000-8000-000000000000';
  const reference = process.env.REFERENCE || `test_purchase_${Date.now()}`;
  const kind = process.env.KIND || 'plan';
  const planId = process.env.PLAN_ID || 'standard';
  const applicationId = process.env.APPLICATION_ID || null;

  console.log('POST', url);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName: 'Test plan purchase',
        amount: 50.0,
        currency: 'ZAR',
        userId,
        email: 'test@example.com',
        reference,
        kind,
        planId,
        applicationId,
      }),
    });
    const data = await resp.json();
    console.log('Status:', resp.status);
    console.log('Response:', data);
    if (resp.ok && data.id) {
      console.log('Use CHECKOUT_ID=' + data.id + ' for webhook validation.');
      console.log('User metadata:', { userId, reference, kind, planId, applicationId });
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(2);
  }
}

run();
