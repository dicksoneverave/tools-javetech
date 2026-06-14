// POST /api/create-checkout
// Body: { priceId, userId, email }
// Returns: { transactionId }
//
// Creates a draft Paddle Billing transaction. The caller redirects the user to
// https://pay.javetech.online/tools?_ptxn={transactionId}, which opens the
// Paddle checkout overlay and handles success/error redirects.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userId, email } = req.body
  if (!priceId || !userId) return res.status(400).json({ error: 'Missing priceId or userId.' })

  const apiKey    = process.env.PADDLE_API_KEY
  const isSandbox = (process.env.PADDLE_ENV || 'sandbox') === 'sandbox'
  const baseUrl   = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'

  // pay.javetech.online will handle the overlay; it redirects back here on success
  const payPageUrl = 'https://pay.javetech.online/tools'

  if (!apiKey) return res.status(500).json({ error: 'Paddle API key not configured.' })

  const payload = {
    items: [{ price_id: priceId, quantity: 1 }],
    checkout: { url: payPageUrl },   // pay page reads ?_ptxn and opens overlay
    custom_data: { userId },
    ...(email ? { customer: { email } } : {}),
  }

  try {
    const paddleRes = await fetch(`${baseUrl}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await paddleRes.json()

    if (!paddleRes.ok) {
      console.error('[checkout] Paddle error:', JSON.stringify(data))
      return res.status(500).json({ error: data?.error?.detail || 'Failed to create Paddle checkout.' })
    }

    const transactionId = data?.data?.id
    if (!transactionId) return res.status(500).json({ error: 'No transaction ID from Paddle.' })

    return res.json({ transactionId })
  } catch (err) {
    console.error('[checkout] error:', err.message)
    return res.status(500).json({ error: 'Server error creating checkout.' })
  }
}
