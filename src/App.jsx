/**
 * App.jsx — tools.javetech.online
 * Router + homepage for the JAVE Tools suite.
 */

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import CompressPDF from "./tools/CompressPDF";
import { supabase } from "./supabaseClient";

// ─── Shared nav ───────────────────────────────────────────────────────────────
function Nav({ crumb }) {
  return (
    <nav style={S.nav} aria-label="Site navigation">
      <div style={S.navInner}>
        <Link to="/" style={S.navLogo}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#1A56DB" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#1A56DB" opacity=".6" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#1A56DB" opacity=".6" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#1A56DB" opacity=".35" />
          </svg>
          <span>JAVE Tools</span>
        </Link>
        {crumb && (
          <>
            <span style={S.navSep} aria-hidden="true">›</span>
            <span style={S.navCrumb}>{crumb}</span>
          </>
        )}
        <Link to="/app/pricing" style={S.navCta}>
          Go Pro · $5/mo
        </Link>
      </div>
    </nav>
  );
}

// ─── Coming-soon placeholder ──────────────────────────────────────────────────
function ComingSoon({ name }) {
  return (
    <>
      <Nav crumb={name} />
      <div style={S.comingSoon}>
        <span style={{ fontSize: 40 }}>🚧</span>
        <h1 style={S.comingTitle}>{name}</h1>
        <p style={S.comingBody}>This tool is being built — check back soon.</p>
        <Link to="/" style={S.comingBack}>← Back to all tools</Link>
      </div>
    </>
  );
}

// ─── Tool catalogue ───────────────────────────────────────────────────────────
const TOOLS = [
  {
    category: "PDF Tools",
    items: [
      { name: "Compress PDF",  path: "/compress-pdf",  icon: "📦", desc: "Reduce PDF file size",            ready: true  },
      { name: "Merge PDF",     path: "/merge-pdf",     icon: "📎", desc: "Combine multiple PDFs",           ready: false },
      { name: "Split PDF",     path: "/split-pdf",     icon: "✂️",  desc: "Extract pages from a PDF",       ready: false },
      { name: "PDF to Word",   path: "/pdf-to-word",   icon: "📝", desc: "Convert PDF to .docx",            ready: false },
      { name: "Word to PDF",   path: "/word-to-pdf",   icon: "🔄", desc: "Convert .docx to PDF",            ready: false },
      { name: "PDF to JPG",    path: "/pdf-to-jpg",    icon: "🖼️", desc: "Export PDF pages as images",      ready: false },
      { name: "JPG to PDF",    path: "/jpg-to-pdf",    icon: "📄", desc: "Create a PDF from images",        ready: false },
    ],
  },
  {
    category: "Image Tools",
    items: [
      { name: "Compress Image",      path: "/compress-image",     icon: "🗜️", desc: "Shrink JPG, PNG & WebP",          ready: false },
      { name: "Resize Image",        path: "/resize-image",       icon: "📐", desc: "Change image dimensions",         ready: false },
      { name: "Convert Image",       path: "/convert-image",      icon: "🔃", desc: "JPG ↔ PNG ↔ WebP ↔ AVIF",        ready: false },
      { name: "Crop Image",          path: "/crop-image",         icon: "✂️",  desc: "Trim and crop images",           ready: false },
      { name: "Remove Background",   path: "/remove-background",  icon: "🪄", desc: "AI background removal",           ready: false },
    ],
  },
  {
    category: "Text Tools",
    items: [
      { name: "Word Counter",        path: "/word-counter",       icon: "🔢", desc: "Count words, characters & lines", ready: false },
      { name: "Character Counter",   path: "/character-counter",  icon: "🔡", desc: "Precise character counts",        ready: false },
      { name: "Case Converter",      path: "/case-converter",     icon: "Aa", desc: "Upper, lower, title case & more", ready: false },
    ],
  },
];

// ─── Pricing tiers ────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    cta: "Get started",
    ctaHref: "/",
    highlight: false,
    features: [
      "5 compressions per day",
      "Up to 10 MB per file",
      "All free tools",
      "Ad-supported",
    ],
  },
  {
    name: "Pro",
    price: "$5",
    period: "/month",
    cta: "Upgrade to Pro",
    highlight: true,
    features: [
      "Unlimited uses per day",
      "Up to 50 MB per file",
      "Batch processing (5 files)",
      "No advertisements",
      "Access to all 20+ tools",
      "Priority support",
    ],
  },
];

// ─── Homepage ─────────────────────────────────────────────────────────────────
function ToolsHome() {
  return (
    <div style={S.page}>
      <Nav />

      {/* Hero */}
      <header style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroBadge}>Free · Private · No sign-up required</div>
          <h1 style={S.heroTitle}>
            Online tools for PDFs,<br />images & text
          </h1>
          <p style={S.heroSub}>
            Every tool runs entirely in your browser — your files never leave your device.
            Fast, private, and free.
          </p>
          <div style={S.heroStats}>
            <span style={S.heroStat}><strong>15+</strong> tools</span>
            <span style={S.heroStatDivider} />
            <span style={S.heroStat}><strong>100%</strong> in-browser</span>
            <span style={S.heroStatDivider} />
            <span style={S.heroStat}><strong>0</strong> uploads to servers</span>
          </div>
        </div>
      </header>

      <main style={S.main}>
        {/* Tool categories */}
        {TOOLS.map((cat) => (
          <section key={cat.category} style={S.section}>
            <h2 style={S.sectionTitle}>{cat.category}</h2>
            <div style={S.toolGrid}>
              {cat.items.map((tool) => (
                <ToolCard key={tool.path} tool={tool} />
              ))}
            </div>
          </section>
        ))}

        {/* Pricing */}
        <section style={S.section} id="pricing">
          <h2 style={S.sectionTitle}>Simple pricing</h2>
          <p style={S.sectionSub}>
            Start free — upgrade when you need more.
          </p>
          <div style={S.pricingGrid}>
            {PLANS.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section style={S.trustStrip}>
          {[
            { icon: "🔒", label: "Files stay on your device" },
            { icon: "⚡", label: "No upload, instant results" },
            { icon: "🌐", label: "Works in any browser" },
            { icon: "🆓", label: "Core tools always free" },
          ].map((t) => (
            <div key={t.label} style={S.trustItem}>
              <span style={S.trustIcon}>{t.icon}</span>
              <span style={S.trustLabel}>{t.label}</span>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <span style={S.footerLogo}>JAVE Tools</span>
          <span style={S.footerCopy}>
            © {new Date().getFullYear()} JAVE IT Solutions ·{" "}
            <a href="https://javetech.online" style={S.footerLink}>javetech.online</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

function ToolCard({ tool }) {
  const inner = (
    <div style={{ ...S.toolCard, ...(tool.ready ? {} : S.toolCardDim) }}>
      <span style={S.toolIcon} aria-hidden="true">{tool.icon}</span>
      <div style={S.toolInfo}>
        <p style={S.toolName}>{tool.name}</p>
        <p style={S.toolDesc}>{tool.desc}</p>
      </div>
      {tool.ready ? (
        <span style={S.toolBadgeReady}>Open →</span>
      ) : (
        <span style={S.toolBadgeSoon}>Soon</span>
      )}
    </div>
  );

  return tool.ready ? (
    <Link to={tool.path} style={{ textDecoration: "none" }}>{inner}</Link>
  ) : (
    <div style={{ cursor: "default" }}>{inner}</div>
  );
}

// Steps: 'cta' → 'email' → 'otp' → 'redirecting'
function PricingCard({ plan }) {
  const [step, setStep]     = useState("cta");
  const [email, setEmail]   = useState("");
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!supabase || !plan.highlight) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setStep("checkout");
    });
  }, [plan.highlight]);

  // Auto-proceed when user clicks the magic link in their email.
  // onAuthStateChange fires across tabs via localStorage — no polling needed.
  useEffect(() => {
    if (step !== "otp" || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        runCheckout(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [step]);

  async function sendOtp() {
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    setLoading(true); setError("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.href,
      },
    });
    if (e) { setError(e.message); setLoading(false); return; }
    setStep("otp"); setLoading(false);
  }

  async function verifyOtp() {
    if (otp.length < 6) { setError("Enter the 6-digit code from your email."); return; }
    setLoading(true); setError("");
    const { data, error: e } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (e) { setError("Invalid or expired code."); setLoading(false); return; }
    await runCheckout(data.user);
  }

  async function runCheckout(u) {
    const priceId = import.meta.env.VITE_PADDLE_PRO_MONTHLY_PRICE_ID;
    if (!priceId) { setError("Checkout not configured — missing price ID."); setLoading(false); return; }
    setStep("redirecting"); setLoading(true);
    try {
      const res  = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId: u.id, email: u.email }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 300)); }
      if (!res.ok) throw new Error(data.error || "Could not create checkout.");
      window.location.href = `https://pay.javetech.online/tools?_ptxn=${data.transactionId}`;
    } catch (err) {
      setError(err.message); setStep("checkout"); setLoading(false);
    }
  }

  async function handleCtaClick() {
    if (!supabase) { setError("Not configured."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) { await runCheckout(session.user); }
    else { setStep("email"); }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    fontSize: 14, border: "1.5px solid #E5E7EB", borderRadius: 8,
    outline: "none", fontFamily: "inherit", marginBottom: 8,
    color: "#111827", background: "#fff",
  };

  return (
    <div style={{ ...S.planCard, ...(plan.highlight ? S.planCardHighlight : {}) }}>
      {plan.highlight && <div style={S.planBadge}>Most popular</div>}
      <p style={S.planName}>{plan.name}</p>
      <div style={S.planPriceRow}>
        <span style={{ ...S.planPrice, ...(plan.highlight ? S.planPriceHighlight : {}) }}>
          {plan.price}
        </span>
        {plan.period && <span style={S.planPeriod}>{plan.period}</span>}
      </div>
      <ul style={S.planFeatures}>
        {plan.features.map((f) => (
          <li key={f} style={S.planFeatureItem}>
            <span style={{ ...S.planCheck, ...(plan.highlight ? S.planCheckHighlight : {}) }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {error && <p style={{ fontSize: 11, color: "#C81E1E", margin: "0 0 8px" }}>{error}</p>}

      {plan.highlight ? (
        <>
          {step === "cta" && (
            <button onClick={handleCtaClick} style={{ ...S.planCta, ...S.planCtaHighlight, border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" }}>
              {plan.cta}
            </button>
          )}
          {step === "checkout" && (
            <button onClick={handleCtaClick} style={{ ...S.planCta, ...S.planCtaHighlight, border: "none", width: "100%", cursor: "pointer", fontFamily: "inherit" }}>
              {loading ? "Loading…" : plan.cta}
            </button>
          )}
          {step === "email" && (
            <>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 8px" }}>Create a free account to upgrade</p>
              <input type="email" placeholder="your@email.com" value={email} autoFocus
                style={inputStyle} onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && sendOtp()} />
              <button onClick={sendOtp} disabled={loading} style={{ ...S.planCta, ...S.planCtaHighlight, border: "none", width: "100%", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                {loading ? "Sending…" : "Continue →"}
              </button>
            </>
          )}
          {step === "otp" && (
            <>
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 4px", textAlign: "center" }}>
                Check your inbox at <strong>{email}</strong>
              </p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 12px", textAlign: "center" }}>
                Click the link in the email — this page will continue automatically.
              </p>
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 6px", textAlign: "center" }}>
                Received a 6-digit code instead? Enter it below:
              </p>
              <input type="text" inputMode="numeric" placeholder="000000" value={otp} maxLength={6}
                style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.2em", fontSize: 18 }}
                onChange={e => { setOtp(e.target.value.replace(/\D/g,"").slice(0,6)); setError(""); }}
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && verifyOtp()} />
              <button onClick={verifyOtp} disabled={otp.length < 6 || loading}
                style={{ ...S.planCta, ...S.planCtaHighlight, border: "none", width: "100%", cursor: (otp.length < 6 || loading) ? "not-allowed" : "pointer", opacity: (otp.length < 6 || loading) ? 0.5 : 1, fontFamily: "inherit" }}>
                {loading ? "Verifying…" : "Verify code →"}
              </button>
              <button onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                style={{ background: "none", border: "none", fontSize: 12, color: "#9CA3AF", cursor: "pointer", marginTop: 6, padding: 0 }}>
                ← Back
              </button>
            </>
          )}
          {step === "redirecting" && (
            <p style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>⏳ Opening checkout…</p>
          )}
        </>
      ) : (
        <Link to="/" style={S.planCta}>{plan.cta}</Link>
      )}
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
// ─── /app/pricing — payment success landing & upgrade page ──────────────────
function PricingPage() {
  const location = useLocation();
  const [success, setSuccess] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (location.search.includes("success=1")) {
      setSuccess(true);
      window.history.replaceState({}, "", location.pathname);
    }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const checkTier = () =>
        supabase
          .from("user_subscriptions")
          .select("tier")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.tier === "pro" || data?.tier === "business") setIsPro(true);
          });
      checkTier();
      // Re-check after 4 s to catch webhook latency
      if (location.search.includes("success=1")) setTimeout(checkTier, 4000);
    });
  }, [location.search]);

  return (
    <div style={S.page}>
      <Nav crumb="Pricing" />
      <main style={{ ...S.main, maxWidth: 680 }}>

        {success && (
          <div role="alert" style={S.successBanner}>
            <span aria-hidden="true">✅</span>
            {isPro
              ? "You're on Pro! All limits have been lifted."
              : "Payment received — your Pro plan is activating. This updates in a few seconds."}
          </div>
        )}

        <header style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", margin: "0 0 8px" }}>
            Simple pricing
          </h1>
          <p style={{ fontSize: 15, color: "#4B5563", margin: 0 }}>
            Start free. Upgrade when you need more.
          </p>
        </header>

        <div style={S.pricingGrid}>
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <Link to="/" style={{ fontSize: 13, color: "#1A56DB", textDecoration: "none" }}>
            ← Back to all tools
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<ToolsHome />} />
        <Route path="/app/pricing"       element={<PricingPage />} />
        {/* PDF tools */}
        <Route path="/compress-pdf"      element={<CompressPDF />} />
        <Route path="/merge-pdf"         element={<ComingSoon name="Merge PDF" />} />
        <Route path="/split-pdf"         element={<ComingSoon name="Split PDF" />} />
        <Route path="/pdf-to-word"       element={<ComingSoon name="PDF to Word" />} />
        <Route path="/word-to-pdf"       element={<ComingSoon name="Word to PDF" />} />
        <Route path="/pdf-to-jpg"        element={<ComingSoon name="PDF to JPG" />} />
        <Route path="/jpg-to-pdf"        element={<ComingSoon name="JPG to PDF" />} />
        {/* Image tools */}
        <Route path="/compress-image"    element={<ComingSoon name="Compress Image" />} />
        <Route path="/resize-image"      element={<ComingSoon name="Resize Image" />} />
        <Route path="/convert-image"     element={<ComingSoon name="Convert Image" />} />
        <Route path="/crop-image"        element={<ComingSoon name="Crop Image" />} />
        <Route path="/remove-background" element={<ComingSoon name="Remove Background" />} />
        {/* Text tools */}
        <Route path="/word-counter"      element={<ComingSoon name="Word Counter" />} />
        <Route path="/character-counter" element={<ComingSoon name="Character Counter" />} />
        <Route path="/case-converter"    element={<ComingSoon name="Case Converter" />} />
        {/* Catch-all */}
        <Route path="*"                  element={<ComingSoon name="Page not found" />} />
      </Routes>
    </BrowserRouter>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: "100vh",
    background: "#F9FAFB",
    color: "#111827",
  },

  /* Nav */
  nav: {
    background: "#fff",
    borderBottom: "1px solid #E5E7EB",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px",
    height: 54,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 15,
    color: "#1A56DB",
    textDecoration: "none",
  },
  navSep: { color: "#D1D5DB", fontSize: 14 },
  navCrumb: { fontSize: 13, color: "#4B5563" },
  navCta: {
    marginLeft: "auto",
    background: "#1A56DB",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 999,
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },

  /* Hero */
  hero: {
    background: "linear-gradient(135deg, #EEF3FF 0%, #F0F4FF 50%, #F9FAFB 100%)",
    borderBottom: "1px solid #E5E7EB",
    padding: "60px 24px 56px",
  },
  heroInner: {
    maxWidth: 640,
    margin: "0 auto",
    textAlign: "center",
  },
  heroBadge: {
    display: "inline-block",
    background: "#fff",
    border: "1px solid #C7D7FD",
    color: "#1A56DB",
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 12px",
    borderRadius: 999,
    marginBottom: 20,
    letterSpacing: "0.01em",
  },
  heroTitle: {
    fontSize: "clamp(28px, 5vw, 44px)",
    fontWeight: 800,
    letterSpacing: "-0.8px",
    lineHeight: 1.15,
    margin: "0 0 16px",
    color: "#0F172A",
  },
  heroSub: {
    fontSize: 16,
    color: "#4B5563",
    lineHeight: 1.7,
    margin: "0 0 28px",
    maxWidth: 480,
    marginLeft: "auto",
    marginRight: "auto",
  },
  heroStats: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  heroStat: { fontSize: 13, color: "#6B7280" },
  heroStatDivider: { width: 1, height: 14, background: "#D1D5DB" },

  /* Main content */
  main: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "48px 24px 80px",
  },

  /* Section */
  section: { marginBottom: 52 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0F172A",
    margin: "0 0 6px",
    letterSpacing: "-0.2px",
  },
  sectionSub: {
    fontSize: 14,
    color: "#6B7280",
    margin: "0 0 24px",
  },

  /* Tool grid */
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  toolCard: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  toolCardDim: { opacity: 0.55 },
  toolIcon: { fontSize: 22, flexShrink: 0, width: 28, textAlign: "center" },
  toolInfo: { flex: 1, minWidth: 0 },
  toolName: { fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" },
  toolDesc: { fontSize: 11, color: "#6B7280", margin: 0 },
  toolBadgeReady: {
    fontSize: 11,
    color: "#1A56DB",
    fontWeight: 600,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  toolBadgeSoon: {
    fontSize: 10,
    color: "#9CA3AF",
    background: "#F3F4F6",
    padding: "2px 7px",
    borderRadius: 999,
    flexShrink: 0,
  },

  /* Pricing */
  pricingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    maxWidth: 640,
  },
  planCard: {
    background: "#fff",
    border: "1.5px solid #E5E7EB",
    borderRadius: 14,
    padding: "28px 24px",
    position: "relative",
  },
  planCardHighlight: {
    border: "1.5px solid #1A56DB",
    boxShadow: "0 4px 24px rgba(26,86,219,.1)",
  },
  planBadge: {
    position: "absolute",
    top: -1,
    right: 20,
    background: "#1A56DB",
    color: "#fff",
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: "0 0 8px 8px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  planName: { fontSize: 13, fontWeight: 600, color: "#6B7280", margin: "0 0 10px" },
  planPriceRow: { display: "flex", alignItems: "baseline", gap: 3, marginBottom: 20 },
  planPrice: { fontSize: 36, fontWeight: 800, color: "#0F172A", letterSpacing: "-1px" },
  planPriceHighlight: { color: "#1A56DB" },
  planPeriod: { fontSize: 13, color: "#6B7280" },
  planFeatures: { listStyle: "none", margin: "0 0 24px", padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  planFeatureItem: { fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 8 },
  planCheck: { color: "#9CA3AF", fontWeight: 700, flexShrink: 0 },
  planCheckHighlight: { color: "#1A56DB" },
  planCta: {
    display: "block",
    textAlign: "center",
    border: "1.5px solid #E5E7EB",
    background: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    padding: "11px",
    borderRadius: 8,
    textDecoration: "none",
    transition: "background 0.15s",
  },
  planCtaHighlight: {
    background: "#1A56DB",
    border: "1.5px solid #1A56DB",
    color: "#fff",
  },

  /* Trust strip */
  trustStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 12,
    padding: "20px 24px",
  },
  trustItem: { display: "flex", alignItems: "center", gap: 8 },
  trustIcon: { fontSize: 16 },
  trustLabel: { fontSize: 13, color: "#4B5563", fontWeight: 500 },

  /* Footer */
  footer: {
    borderTop: "1px solid #E5E7EB",
    background: "#fff",
    padding: "20px 24px",
  },
  footerInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  footerLogo: { fontWeight: 700, fontSize: 14, color: "#1A56DB" },
  footerCopy: { fontSize: 12, color: "#9CA3AF" },
  footerLink: { color: "#6B7280", textDecoration: "none" },

  /* Coming soon page */
  comingSoon: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 54px)",
    padding: "40px 24px",
    textAlign: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  comingTitle: { fontSize: 24, fontWeight: 700, color: "#111827", margin: "16px 0 8px" },
  comingBody: { fontSize: 14, color: "#6B7280", margin: "0 0 24px" },
  comingBack: { fontSize: 14, color: "#1A56DB", textDecoration: "none" },

  successBanner: {
    background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10,
    padding: "14px 18px", display: "flex", alignItems: "center", gap: 10,
    marginBottom: 28, fontSize: 14, color: "#057A55", fontWeight: 500,
  },
};
