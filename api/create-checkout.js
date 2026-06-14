// POST /api/create-checkout
// Body: { priceId, userId, email }
// Returns: { checkoutUrl }
// Creates a Paddle Billing transaction and returns the hosted checkout URL.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { priceId, userId, email } = req.body
  if (!priceId || !userId) return res.status(400).json({ error: 'Missing priceId or userId.' })

  const apiKey    = process.env.PADDLE_API_KEY
  const isSandbox = (process.env.PADDLE_ENV || 'sandbox') === 'sandbox'
  const baseUrl   = isSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
  const returnUrl = 'https://tools.javetech.online/compress-pdf?success=1'

  if (!apiKey) return res.status(500).json({ error: 'Paddle API key not configured.' })

  const payload = {
    items: [{ price_id: priceId, quantity: 1 }],
    checkout: { url: returnUrl },
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

    // Paddle Billing returns the hosted checkout URL in data.checkout.url
    const checkoutUrl = data?.data?.checkout?.url
    if (!checkoutUrl) {
      // Fallback: manual construction using the transaction ID
      const transactionId = data?.data?.id
      if (!transactionId) return res.status(500).json({ error: 'No checkout URL from Paddle.' })
      return res.json({ checkoutUrl: `${returnUrl}&_ptxn=${transactionId}` })
    }

    return res.json({ checkoutUrl })
  } catch (err) {
    console.error('[checkout] error:', err.message)
    return res.status(500).json({ error: 'Server error creating checkout.' })
  }
}
