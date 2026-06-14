// POST /api/webhook
// Receives Paddle subscription lifecycle events.
// Verifies HMAC-SHA256 signature, then upserts user_subscriptions in Supabase.

import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

export const config = { api: { bodyParser: false } }

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const rawBody   = await getRawBody(req)
  const signature = req.headers['paddle-signature']
  const secret    = process.env.PADDLE_WEBHOOK_SECRET

  if (!signature || !secret) {
    console.warn('[webhook] missing signature or secret')
    return res.status(400).send('Bad request')
  }

  try {
    const [tsPart, h1Part] = signature.split(';')
    const ts               = tsPart.replace('ts=', '')
    const h1               = h1Part.replace('h1=', '')
    const signedPayload    = `${ts}:${rawBody.toString('utf8')}`
    const expectedSig      = createHmac('sha256', secret).update(signedPayload).digest('hex')

    if (!timingSafeEqual(Buffer.from(h1), Buffer.from(expectedSig))) {
      console.warn('[webhook] signature mismatch')
      return res.status(403).send('Forbidden')
    }
  } catch (err) {
    console.error('[webhook] signature error:', err)
    return res.status(400).send('Bad request')
  }

  const event = JSON.parse(rawBody.toString('utf8'))
  const { event_type, data } = event

  console.log(`[webhook] ${event_type} id=${data?.id}`)

  try {
    const userId  = data?.custom_data?.userId
    const subId   = data?.id
    const status  = data?.status
    const endDate = data?.current_billing_period?.ends_at
    const priceId = data?.items?.[0]?.price?.id || ''

    let tier = 'free'
    if (priceId === process.env.VITE_PADDLE_PRO_MONTHLY_PRICE_ID) tier = 'pro'

    if (!userId) {
      console.warn('[webhook] no userId in custom_data — skipping db update')
      return res.status(200).send('OK')
    }

    switch (event_type) {
      case 'subscription.created':
      case 'subscription.updated':
        await supabase.from('user_subscriptions').upsert(
          {
            user_id:                userId,
            tier,
            paddle_subscription_id: subId,
            paddle_plan_id:         priceId,
            status:                 status === 'active' ? 'active' : (status || 'active'),
            current_period_end:     endDate ?? null,
          },
          { onConflict: 'user_id' }
        )
        console.log(`[webhook] upserted ${tier} for user ${userId}`)
        break

      case 'subscription.cancelled':
        await supabase.from('user_subscriptions').upsert(
          {
            user_id:                userId,
            tier:                   'free',
            paddle_subscription_id: subId,
            status:                 'cancelled',
            current_period_end:     endDate ?? null,
          },
          { onConflict: 'user_id' }
        )
        console.log(`[webhook] cancelled → free for user ${userId}`)
        break

      case 'subscription.paused':
        await supabase.from('user_subscriptions').update({ status: 'paused' }).eq('user_id', userId)
        console.log(`[webhook] paused for user ${userId}`)
        break

      default:
        console.log(`[webhook] unhandled event: ${event_type}`)
    }
  } catch (err) {
    console.error('[webhook] processing error:', err)
  }

  return res.status(200).send('OK')
}
