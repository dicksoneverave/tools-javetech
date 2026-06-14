# tools.javetech.online — Compress PDF Tool
## Setup guide

---

### 1. Install dependencies

```bash
npm create vite@latest tools-javetech -- --template react
cd tools-javetech
npm install
npm install pdf-lib @supabase/supabase-js react-router-dom
```

---

### 2. Environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these from: Supabase Dashboard → Settings → API

---

### 3. Set up the database

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run**

This creates:
- `user_subscriptions` table (tracks free/pro/business tier per user)
- `tool_usage` table (tracks daily usage per tool per user)
- `increment_tool_usage` RPC function (atomic upsert)
- Trigger to auto-create a free subscription row on user signup
- RLS policies so users can only see their own data

---

### 4. Copy the component files

```
src/
├── App.jsx                    ← copy App.jsx here
└── tools/
    └── CompressPDF.jsx        ← copy CompressPDF.jsx here
```

Update `main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

---

### 5. Add Google AdSense

1. Apply at https://adsense.google.com (requires 30+ days of live content)
2. Add the AdSense script to `index.html`:

```html
<head>
  <!-- ... -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
</head>
```

3. In `CompressPDF.jsx`, find the `AdSenseBanner` component and replace the
   dev placeholder div with your real `<ins>` tag:

```jsx
<ins
  className="adsbygoogle"
  style={{ display: "block" }}
  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"     // ← your publisher ID
  data-ad-slot="XXXXXXXXXX"                     // ← your ad unit slot ID
  data-ad-format="auto"
  data-full-width-responsive="true"
/>
```

**Ad placement strategy:**
- Top banner (728×90): shown before the drop zone — high impressions
- Result rectangle (336×280): shown after compression completes — high engagement

---

### 6. Set up Paddle checkout

In `CompressPDF.jsx`, replace the upgrade URL:
```jsx
// Find this line:
href="https://javetech.online/checkout/pro"

// Replace with your actual Paddle checkout link:
href="https://checkout.paddle.com/checkout/custom/YOUR_PADDLE_CHECKOUT_LINK"
```

**Paddle custom_data** — pass the Supabase user ID so the webhook can map
the payment to the right user. In your Paddle checkout setup:

```javascript
// When opening Paddle checkout
Paddle.Checkout.open({
  items: [{ priceId: "pri_pro_monthly", quantity: 1 }],
  customData: {
    supabase_user_id: supabase.auth.getUser().data.user.id
  }
});
```

---

### 7. Deploy Paddle webhook (Supabase Edge Function)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref your-project-ref

# Create function directory
mkdir -p supabase/functions/paddle-webhook

# Copy the webhook file
cp supabase-paddle-webhook.ts supabase/functions/paddle-webhook/index.ts

# Set secrets
supabase secrets set PADDLE_WEBHOOK_SECRET=pdl_ntfset_...

# Deploy
supabase functions deploy paddle-webhook --no-verify-jwt
```

Then in **Paddle Dashboard → Notifications → Add destination**:
- URL: `https://your-project-ref.supabase.co/functions/v1/paddle-webhook`
- Events: `subscription.created`, `subscription.updated`,
  `subscription.cancelled`, `subscription.paused`

---

### 8. Domain & routing

**Subdomain setup** (in your DNS / hosting provider):
```
tools.javetech.online → your Vite app host (Vercel / Netlify / Cloudflare Pages)
```

**Vercel** (recommended — free tier works):
```bash
npm install -g vercel
vercel
# Follow prompts → set environment variables in Vercel dashboard
```

Add `vercel.json` for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### 9. SEO — add to each tool's `index.html` or use React Helmet

```html
<!-- In index.html, or via react-helmet-async in CompressPDF.jsx -->
<title>Compress PDF Online Free — JAVE Tools</title>
<meta name="description"
  content="Compress your PDF file size online for free. 100% private — processed in your browser. No upload, no signup required." />
<link rel="canonical" href="https://tools.javetech.online/compress-pdf" />

<!-- FAQ Schema for rich snippets -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I compress a PDF file online for free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Upload your PDF to tools.javetech.online/compress-pdf, choose compression level, and click Compress PDF. Your compressed file downloads instantly — no email or signup required."
      }
    },
    {
      "@type": "Question",
      "name": "Is my PDF safe when I compress it here?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. JAVE Tools compresses PDFs entirely in your browser. Your file is never sent to a server."
      }
    }
  ]
}
</script>
```

---

### 10. Go-live checklist

- [ ] Supabase schema deployed and verified
- [ ] `.env.local` set (local) + environment variables set in Vercel/Netlify
- [ ] App builds without errors: `npm run build`
- [ ] Test compress flow as anonymous user (localStorage gate)
- [ ] Test compress flow as signed-in free user (Supabase gate)
- [ ] Test file size gate (upload >10 MB — upgrade modal should fire)
- [ ] Test daily limit gate (use tool 5× — upgrade modal should fire on 6th)
- [ ] AdSense `<ins>` tag added and site submitted for review
- [ ] Paddle checkout link is correct
- [ ] Paddle webhook deployed and receiving test events
- [ ] Google Search Console: add tools.javetech.online as a property
- [ ] Submit sitemap.xml to Search Console

---

### File structure summary

```
tools-javetech/
├── public/
│   └── sitemap.xml
├── src/
│   ├── main.jsx
│   ├── App.jsx                  ← router + tools home
│   └── tools/
│       └── CompressPDF.jsx      ← the full compress tool
├── supabase/
│   └── functions/
│       └── paddle-webhook/
│           └── index.ts         ← Paddle → Supabase webhook
├── supabase-schema.sql          ← run in Supabase SQL editor
├── .env.local                   ← VITE_SUPABASE_URL + ANON_KEY
├── vercel.json
├── vite.config.js
└── package.json
```
