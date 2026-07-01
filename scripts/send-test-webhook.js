import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const server = process.env.PAYMENTS_SERVER || 'http://localhost:4242';
const webhookSecret = process.env.YOCO_WEBHOOK_SECRET || process.env.YOCO_WEBHOOK_SECRET_ENV || 'whsec_RTNGNENBOTQxN0I2REMwOTk3RjJENTNFOTc1Mjc4MjQ=';

const checkoutId = process.env.CHECKOUT_ID || 'ch_9g0yrv9pv3oSJwwizRJcyGAx';
const userId = process.env.USER_ID || '00000000-0000-4000-8000-000000000000';
const reference = process.env.REFERENCE || `test_ref_${Date.now()}`;
const kind = process.env.KIND || 'plan';
const planId = process.env.PLAN_ID || 'standard';
const applicationId = process.env.APPLICATION_ID || null;

const event = {
  id: `evt_test_${Date.now()}`,
  type: 'payment.succeeded',
  payload: {
    id: checkoutId,
    checkoutId: checkoutId,
    amount: 1000,
    currency: 'ZAR',
    metadata: {
      userId,
      reference,
      kind,
      planId,
      applicationId,
      checkoutId,
    },
  },
};

const rawBody = JSON.stringify(event);
const webhookId = event.id;
const webhookTimestamp = Math.floor(Date.now() / 1000).toString();

// secretBytes: base64 part after the underscore
const parts = webhookSecret.split('_');
const secretBytes = Buffer.from(parts[1], 'base64');
const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
const expectedSignature = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
const headerVal = `v1,${expectedSignature}`;

console.log('Posting webhook to', `${server}/yoco/webhook`);
console.log('Headers:', { 'webhook-id': webhookId, 'webhook-timestamp': webhookTimestamp, 'webhook-signature': headerVal });

const resp = await fetch(`${server.replace(/\/$/, '')}/yoco/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'webhook-id': webhookId,
    'webhook-timestamp': webhookTimestamp,
    'webhook-signature': headerVal,
  },
  body: rawBody,
});

console.log('Response status:', resp.status);
console.log(await resp.text());

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: rows, error: dbError } = await supabase.from('payments').select('*').eq('checkout_id', checkoutId).limit(1);
  console.log('Supabase query error:', dbError);
  console.log('Supabase payments row:', JSON.stringify(rows, null, 2));
} else {
  console.warn('SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set; skipping Supabase verification.');
}
