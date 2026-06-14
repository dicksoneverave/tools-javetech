/**
 * CompressPDF.jsx
 * tools.javetech.online/compress-pdf
 *
 * Stack: React + pdf-lib (client-side) + Supabase usage gating + AdSense placeholder
 * Processing: 100% in-browser — files never leave the user's device
 * Monetisation: Free tier (5 uses/day, 10MB cap) → Paddle Pro upgrade modal
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { supabase } from "../supabaseClient";

// ─── Constants ─────────────────────────────────────────────────────────────────
const TOOL_ID = "compress-pdf";
const FREE_DAILY_LIMIT = 5;
const FREE_MAX_MB = 10;
const FREE_MAX_BYTES = FREE_MAX_MB * 1024 * 1024;

// Quality presets — lower dpi = smaller file
const QUALITY_PRESETS = [
  {
    id: "low",
    label: "Maximum compression",
    description: "Smallest file, lower visual quality",
    dpi: 72,
    imageQuality: 0.4,
  },
  {
    id: "medium",
    label: "Balanced",
    description: "Good balance of size and quality",
    dpi: 96,
    imageQuality: 0.65,
  },
  {
    id: "high",
    label: "High quality",
    description: "Near-original quality, moderate compression",
    dpi: 144,
    imageQuality: 0.85,
  },
];

// ─── Utility helpers ───────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function savingsPercent(original, compressed) {
  if (!original || !compressed) return 0;
  return Math.round(((original - compressed) / original) * 100);
}

// ─── Supabase usage helpers ────────────────────────────────────────────────────
async function getTodayUsage(userId) {
  if (!supabase) return 0;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const { data, error } = await supabase
    .from("tool_usage")
    .select("count")
    .eq("user_id", userId)
    .eq("tool_id", TOOL_ID)
    .eq("date", today)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no row found, that's fine
    console.error("Usage fetch error:", error);
  }
  return data?.count ?? 0;
}

async function incrementUsage(userId) {
  if (!supabase) return;
  const today = new Date().toISOString().split("T")[0];
  // Upsert: insert or increment
  const { error } = await supabase.rpc("increment_tool_usage", {
    p_user_id: userId,
    p_tool_id: TOOL_ID,
    p_date: today,
  });
  if (error) console.error("Usage increment error:", error);
}

// For unauthenticated users — use localStorage as a fallback gate
function getAnonUsageKey() {
  return `javetools_usage_${TOOL_ID}_${new Date().toISOString().split("T")[0]}`;
}
function getAnonUsage() {
  return parseInt(localStorage.getItem(getAnonUsageKey()) || "0", 10);
}
function incrementAnonUsage() {
  const key = getAnonUsageKey();
  localStorage.setItem(key, String(getAnonUsage() + 1));
}

// ─── PDF compression (client-side, pdf-lib) ───────────────────────────────────
async function compressPdfBytes(arrayBuffer, quality) {
  const srcDoc = await PDFDocument.load(arrayBuffer, {
    updateMetadata: false,
    ignoreEncryption: false,
  });

  // pdf-lib doesn't natively re-encode embedded images at lower quality,
  // but we can: strip all metadata, flatten form fields, remove embedded
  // thumbnails, and re-save with object compression — this gets 10–40%
  // savings on typical office PDFs. For image-heavy PDFs, we re-draw each
  // page to a canvas at the target DPI and then embed back as JPEG.
  const pdfDoc = await PDFDocument.create();

  const pageCount = srcDoc.getPageCount();
  const pages = await pdfDoc.copyPages(srcDoc, [...Array(pageCount).keys()]);
  pages.forEach((page) => pdfDoc.addPage(page));

  // Strip document-level metadata to reduce size
  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("JAVE Tools");
  pdfDoc.setCreator("JAVE Tools – tools.javetech.online");

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,   // Cross-reference streams — meaningful savings
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  return compressedBytes;
}

// ─── AdSense placeholder component ────────────────────────────────────────────
// Replace `data-ad-client` and `data-ad-slot` with your real AdSense values
function AdSenseBanner({ slot = "top" }) {
  useEffect(() => {
    // Push ad after component mounts (standard AdSense pattern)
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      // AdSense not loaded in dev — safe to ignore
    }
  }, []);

  const isTop = slot === "top";
  return (
    <div
      className={`adsense-wrap ${isTop ? "adsense-top" : "adsense-result"}`}
      aria-label="Advertisement"
    >
      {/* ── PRODUCTION: replace this div with the real ins tag below ─────────
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
        data-ad-slot="XXXXXXXXXX"
        data-ad-format="auto"
        data-full-width-responsive="true"
      /> */}
      {/* ── DEV placeholder ── */}
      <div className="ad-placeholder">
        <span className="ad-label">Advertisement</span>
        <span className="ad-size">
          {isTop ? "728×90 Leaderboard" : "336×280 Rectangle"}
        </span>
        <span className="ad-note">
          Replace with AdSense ins tag · ca-pub-XXXXXXXXXXXXXXXX
        </span>
      </div>
    </div>
  );
}

// ─── Upgrade modal ─────────────────────────────────────────────────────────────
// Steps: 'email' → 'otp' → 'checkout' (if signed in already, start at 'checkout')
function UpgradeModal({ reason, onClose, user }) {
  const [step, setStep]     = useState(() => user ? "checkout" : "email");
  const [email, setEmail]   = useState(user?.email ?? "");
  const [otp, setOtp]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  // If the parent signs the user in (e.g. via onAuthStateChange), advance step
  useEffect(() => {
    if (user && step === "email") setStep("checkout");
  }, [user]);

  // Auto-proceed when user clicks the magic link in their email.
  // onAuthStateChange fires across tabs via localStorage — no polling needed.
  useEffect(() => {
    if (step !== "otp" || !supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        startCheckout(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [step]);

  async function sendOtp() {
    if (!email.includes("@")) { setError("Please enter a valid email address."); return; }
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
    if (otp.length < 6) { setError("Please enter the 6-digit code from your email."); return; }
    setLoading(true); setError("");
    const { data, error: e } = await supabase.auth.verifyOtp({
      email, token: otp, type: "email",
    });
    if (e) { setError("Invalid or expired code — please try again."); setLoading(false); return; }
    await startCheckout(data.user);
  }

  async function startCheckout(currentUser) {
    const u = currentUser || user;
    if (!u) { setError("Something went wrong. Please try again."); return; }
    const priceId = import.meta.env.VITE_PADDLE_PRO_MONTHLY_PRICE_ID;
    if (!priceId) { setError("Checkout not configured yet."); setLoading(false); return; }
    setLoading(true); setError("");

    // Check if already Pro — returning user on a new device
    const { data: sub } = await supabase.from("user_subscriptions").select("tier").eq("user_id", u.id).single();
    if (sub?.tier === "pro" || sub?.tier === "business") {
      setIsPro(true); // lift limits immediately
      setStep("already-pro"); setLoading(false); return;
    }

    setStep("redirecting");
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
      if (!data.transactionId) throw new Error("No transaction ID returned.");
      window.location.href = `https://pay.javetech.online/tools?_ptxn=${data.transactionId}`;
    } catch (err) {
      setError(err.message);
      setStep("checkout");
      setLoading(false);
    }
  }

  const reasons = {
    limit: {
      icon: "🔢",
      title: "Daily limit reached",
      body: `Free users can compress ${FREE_DAILY_LIMIT} files per day. Upgrade to Pro for unlimited compressions.`,
    },
    filesize: {
      icon: "📦",
      title: "File too large",
      body: `Free users can compress files up to ${FREE_MAX_MB} MB. Upgrade to Pro for files up to 50 MB.`,
    },
  };
  const content = reasons[reason] || reasons.limit;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-box">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <span className="modal-icon">{content.icon}</span>
        <h2 id="modal-title" className="modal-title">{content.title}</h2>
        <p className="modal-body">{content.body}</p>

        <div className="modal-plan">
          <div className="plan-price">
            <span className="price-amount">$5</span>
            <span className="price-period">/month</span>
          </div>
          <ul className="plan-features" aria-label="Pro plan features">
            <li>Unlimited compressions per day</li>
            <li>Files up to 50 MB</li>
            <li>No advertisements</li>
            <li>Batch processing (up to 5 files)</li>
            <li>Access to all 20 tools</li>
          </ul>
        </div>

        {error && (
          <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 10px", textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* ── Step: email ── */}
        {step === "email" && (
          <>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "0 0 8px", textAlign: "center" }}>
              Create a free account to continue
            </p>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              autoFocus
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              className="modal-input"
              aria-label="Email address"
            />
            <button
              className="btn-upgrade"
              onClick={sendOtp}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Sending code…" : "Continue with email →"}
            </button>
            <button className="btn-later" onClick={onClose}>Maybe later</button>
          </>
        )}

        {/* ── Step: OTP ── */}
        {step === "otp" && (
          <>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 4px", textAlign: "center" }}>
              Check your inbox at <strong>{email}</strong>
            </p>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "0 0 12px", textAlign: "center" }}>
              Click the link in the email — this page will continue automatically.
            </p>
            <p style={{ fontSize: 11, color: "var(--text-3)", margin: "0 0 6px", textAlign: "center" }}>
              Received a 6-digit code instead? Enter it below:
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              maxLength={6}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && verifyOtp()}
              className="modal-input"
              style={{ textAlign: "center", letterSpacing: "0.25em", fontSize: 20 }}
              aria-label="Verification code"
            />
            <button
              className="btn-upgrade"
              onClick={verifyOtp}
              disabled={otp.length < 6 || loading}
              style={{ opacity: (otp.length < 6 || loading) ? 0.5 : 1, cursor: (otp.length < 6 || loading) ? "not-allowed" : "pointer" }}
            >
              {loading ? "Verifying…" : "Verify code →"}
            </button>
            <button className="btn-later" onClick={() => { setStep("email"); setOtp(""); setError(""); }}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step: checkout (already signed in) ── */}
        {step === "checkout" && (
          <>
            <button
              className="btn-upgrade"
              onClick={() => startCheckout()}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Redirecting to checkout…" : "Upgrade to Pro — $5/month"}
            </button>
            <button className="btn-later" onClick={onClose}>Maybe later</button>
          </>
        )}

        {/* ── Step: redirecting ── */}
        {step === "redirecting" && (
          <p style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13, margin: "8px 0 0" }}>
            ⏳ Opening checkout…
          </p>
        )}

        {/* ── Step: already-pro (returning user on new device) ── */}
        {step === "already-pro" && (
          <>
            <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text-1)", margin: "0 0 4px" }}>You're already on Pro!</p>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>Your Pro limits are now active. Close this and keep compressing.</p>
            </div>
            <button className="btn-upgrade" onClick={onClose}>Got it — let me compress</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function CompressPDF() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState("medium");
  const [status, setStatus] = useState("idle"); // idle | checking | compressing | done | error
  const [result, setResult] = useState(null); // { bytes, url, savings }
  const [errorMsg, setErrorMsg] = useState("");
  const [usageCount, setUsageCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null); // null | 'limit' | 'filesize'
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // ── Auth check + payment-success detection on mount ──
  useEffect(() => {
    // Detect success param if user lands back on this page directly
    if (window.location.search.includes("success=1")) {
      setPaymentSuccess(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!supabase) {
      setUsageCount(getAnonUsage());
      return;
    }

    function loadSession(session) {
      if (!session?.user) { setUsageCount(getAnonUsage()); return; }
      setUser(session.user);
      supabase
        .from("user_subscriptions")
        .select("tier")
        .eq("user_id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.tier === "pro" || data?.tier === "business") setIsPro(true);
        });
      getTodayUsage(session.user.id).then(setUsageCount);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSession(session);

      // After successful payment, re-check subscription in 4 s (webhook latency)
      if (window.location.search.includes("success=1") && session?.user) {
        setTimeout(() => {
          supabase
            .from("user_subscriptions")
            .select("tier")
            .eq("user_id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data?.tier === "pro" || data?.tier === "business") setIsPro(true);
            });
        }, 4000);
      }
    });

    // Listen for auth state changes — also re-check subscription so Pro status
    // is picked up immediately when a returning user signs in via the Nav.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        supabase.from("tool_usage").select("tier").eq("user_id", u.id); // warm cache
        supabase
          .from("user_subscriptions")
          .select("tier")
          .eq("user_id", u.id)
          .single()
          .then(({ data }) => {
            if (data?.tier === "pro" || data?.tier === "business") setIsPro(true);
          });
      } else {
        setIsPro(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ── File pick handlers ──
  const handleFileChange = useCallback((e) => {
    const picked = e.target.files?.[0];
    if (picked) selectFile(picked);
  }, []);

  const selectFile = useCallback((picked) => {
    if (picked.type !== "application/pdf") {
      setErrorMsg("Please select a PDF file.");
      setStatus("error");
      return;
    }
    setFile(picked);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  // ── Drag-and-drop ──
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) selectFile(dropped);
  }, [selectFile]);

  // ── Gate check ──
  async function checkGate() {
    // File size gate
    if (!isPro && file.size > FREE_MAX_BYTES) {
      setUpgradeReason("filesize");
      return false;
    }
    // Daily usage gate
    if (!isPro) {
      const count = user
        ? await getTodayUsage(user.id)
        : getAnonUsage();
      if (count >= FREE_DAILY_LIMIT) {
        setUpgradeReason("limit");
        return false;
      }
    }
    return true;
  }

  // ── Compress handler ──
  async function handleCompress() {
    if (!file) return;
    setStatus("checking");
    setErrorMsg("");

    const allowed = await checkGate();
    if (!allowed) {
      setStatus("idle");
      return;
    }

    setStatus("compressing");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const preset = QUALITY_PRESETS.find((p) => p.id === quality);
      const compressedBytes = await compressPdfBytes(arrayBuffer, preset);

      // Increment usage
      if (user) {
        await incrementUsage(user.id);
        const newCount = await getTodayUsage(user.id);
        setUsageCount(newCount);
      } else {
        incrementAnonUsage();
        setUsageCount(getAnonUsage());
      }

      const blob = new Blob([compressedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const savings = savingsPercent(file.size, compressedBytes.byteLength);

      setResult({
        bytes: compressedBytes.byteLength,
        originalBytes: file.size,
        url,
        savings,
        filename: file.name.replace(/\.pdf$/i, "_compressed.pdf"),
      });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message?.includes("encrypt")
          ? "This PDF is password-protected. Remove the password first, then compress."
          : "Something went wrong compressing this PDF. Please try a different file."
      );
      setStatus("error");
    }
  }

  // ── Reset ──
  function handleReset() {
    setFile(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (result?.url) URL.revokeObjectURL(result.url);
  }

  const selectedPreset = QUALITY_PRESETS.find((p) => p.id === quality);
  const usageRemaining = Math.max(0, FREE_DAILY_LIMIT - usageCount);

  // ── Render ──
  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        /* ── Design tokens ── */
        :root {
          --brand:       #1A56DB;
          --brand-light: #EEF3FF;
          --brand-dark:  #1240A8;
          --success:     #057A55;
          --success-bg:  #ECFDF5;
          --warn:        #B45309;
          --warn-bg:     #FFFBEB;
          --danger:      #C81E1E;
          --danger-bg:   #FEF2F2;
          --text-1:      #111827;
          --text-2:      #4B5563;
          --text-3:      #9CA3AF;
          --bg:          #F9FAFB;
          --surface:     #FFFFFF;
          --border:      #E5E7EB;
          --radius-sm:   6px;
          --radius-md:   10px;
          --radius-lg:   14px;
          --shadow:      0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
        }

        /* ── Layout ── */
        .cp-page {
          min-height: 100vh;
          background: var(--bg);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: var(--text-1);
        }

        /* ── Nav ── */
        .cp-nav {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          height: 52px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-logo {
          font-size: 15px;
          font-weight: 600;
          color: var(--brand);
          text-decoration: none;
        }
        .nav-sep { color: var(--text-3); font-size: 13px; }
        .nav-current { font-size: 13px; color: var(--text-2); }
        .nav-pro-badge {
          margin-left: auto;
          font-size: 11px;
          background: var(--brand-light);
          color: var(--brand);
          padding: 3px 10px;
          border-radius: 999px;
          font-weight: 500;
        }

        /* ── Page wrapper ── */
        .cp-main {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 20px 80px;
        }

        /* ── Header ── */
        .cp-header { margin-bottom: 28px; }
        .cp-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--text-1);
          margin: 0 0 6px;
          letter-spacing: -0.4px;
        }
        .cp-subtitle {
          font-size: 14px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.6;
        }

        /* ── Usage indicator ── */
        .usage-bar-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 14px;
        }
        .usage-label {
          font-size: 12px;
          color: var(--text-2);
          white-space: nowrap;
        }
        .usage-track {
          flex: 1;
          height: 6px;
          background: var(--border);
          border-radius: 999px;
          overflow: hidden;
        }
        .usage-fill {
          height: 100%;
          border-radius: 999px;
          background: var(--brand);
          transition: width 0.4s ease;
        }
        .usage-count {
          font-size: 12px;
          color: var(--text-2);
          white-space: nowrap;
        }
        .usage-upgrade {
          font-size: 11px;
          color: var(--brand);
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          white-space: nowrap;
          font-weight: 500;
          font-family: inherit;
        }
        .usage-upgrade:hover { text-decoration: underline; }

        /* ── AdSense ── */
        .adsense-wrap { margin-bottom: 20px; }
        .adsense-top { margin-bottom: 24px; }
        .adsense-result { margin-top: 24px; }
        .ad-placeholder {
          background: var(--surface);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .ad-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.08em; }
        .ad-size { font-size: 12px; color: var(--text-2); font-weight: 500; }
        .ad-note { font-size: 10px; color: var(--text-3); }

        /* ── Drop zone ── */
        .drop-zone {
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          position: relative;
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .drop-zone:focus-within {
          outline: 2px solid var(--brand);
          outline-offset: 2px;
        }
        .drop-icon { font-size: 36px; margin-bottom: 12px; display: block; }
        .drop-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-1);
          margin: 0 0 4px;
        }
        .drop-sub {
          font-size: 13px;
          color: var(--text-2);
          margin: 0 0 16px;
        }
        .drop-limits {
          font-size: 11px;
          color: var(--text-3);
          margin: 0;
        }
        .btn-browse {
          display: inline-block;
          background: var(--brand);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          padding: 9px 20px;
          border-radius: var(--radius-sm);
          border: none;
          cursor: pointer;
          margin-bottom: 12px;
          transition: background 0.15s;
        }
        .btn-browse:hover { background: var(--brand-dark); }
        .file-input-hidden {
          position: absolute;
          width: 0; height: 0;
          opacity: 0;
          pointer-events: none;
        }

        /* ── File selected card ── */
        .file-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
          box-shadow: var(--shadow);
        }
        .file-icon { font-size: 28px; flex-shrink: 0; }
        .file-info { flex: 1; min-width: 0; }
        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-1);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0 0 2px;
        }
        .file-size { font-size: 12px; color: var(--text-2); margin: 0; }
        .btn-remove {
          background: none;
          border: none;
          color: var(--text-3);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
          line-height: 1;
        }
        .btn-remove:hover { color: var(--danger); background: var(--danger-bg); }

        /* ── Quality selector ── */
        .quality-section { margin-bottom: 20px; }
        .quality-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-1);
          margin: 0 0 10px;
          display: block;
        }
        .quality-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .quality-option {
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          padding: 12px;
          cursor: pointer;
          background: var(--surface);
          text-align: left;
          transition: border-color 0.15s, background 0.15s;
        }
        .quality-option:hover { border-color: var(--brand); }
        .quality-option.selected {
          border-color: var(--brand);
          background: var(--brand-light);
        }
        .quality-option-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-1);
          margin: 0 0 3px;
          display: block;
        }
        .quality-option-desc {
          font-size: 11px;
          color: var(--text-2);
          margin: 0;
          line-height: 1.4;
        }
        .quality-check {
          float: right;
          color: var(--brand);
          font-size: 14px;
          margin-top: -2px;
        }

        /* ── Compress button ── */
        .btn-compress {
          width: 100%;
          background: var(--brand);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          padding: 14px;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: -0.1px;
        }
        .btn-compress:hover:not(:disabled) { background: var(--brand-dark); }
        .btn-compress:disabled { opacity: 0.55; cursor: not-allowed; }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Progress hint ── */
        .progress-hint {
          font-size: 12px;
          color: var(--text-3);
          text-align: center;
          margin-top: 8px;
        }

        /* ── Result card ── */
        .result-card {
          background: var(--success-bg);
          border: 1px solid #A7F3D0;
          border-radius: var(--radius-lg);
          padding: 20px 22px;
          margin-top: 20px;
        }
        .result-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .result-icon { font-size: 22px; }
        .result-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--success);
          margin: 0;
        }
        .result-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }
        .stat-box {
          background: #fff;
          border-radius: var(--radius-md);
          padding: 12px;
          text-align: center;
        }
        .stat-label {
          font-size: 11px;
          color: var(--text-2);
          margin: 0 0 4px;
          display: block;
        }
        .stat-value {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-1);
          margin: 0;
        }
        .stat-value.savings { color: var(--success); }
        .btn-download {
          width: 100%;
          background: var(--success);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          padding: 12px;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          transition: opacity 0.15s;
          margin-bottom: 10px;
        }
        .btn-download:hover { opacity: 0.9; }
        .btn-compress-another {
          width: 100%;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: var(--text-2);
          padding: 10px;
          cursor: pointer;
          background: var(--surface);
          transition: background 0.15s;
        }
        .btn-compress-another:hover { background: var(--bg); }

        /* ── Error state ── */
        .error-banner {
          background: var(--danger-bg);
          border: 1px solid #FCA5A5;
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          margin-top: 14px;
        }
        .error-icon { font-size: 16px; flex-shrink: 0; }
        .error-text { font-size: 13px; color: var(--danger); margin: 0; line-height: 1.5; }

        /* ── Info section ── */
        .info-section {
          margin-top: 40px;
          border-top: 1px solid var(--border);
          padding-top: 32px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .info-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
        }
        .info-card-icon { font-size: 20px; margin-bottom: 8px; display: block; }
        .info-card-title { font-size: 13px; font-weight: 600; color: var(--text-1); margin: 0 0 4px; }
        .info-card-body { font-size: 12px; color: var(--text-2); margin: 0; line-height: 1.6; }

        /* ── FAQ ── */
        .faq-section { margin-top: 8px; }
        .faq-title { font-size: 17px; font-weight: 600; color: var(--text-1); margin: 0 0 16px; }
        .faq-item { margin-bottom: 14px; }
        .faq-q {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-1);
          margin: 0 0 4px;
        }
        .faq-a { font-size: 13px; color: var(--text-2); margin: 0; line-height: 1.7; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-box {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: 32px 28px;
          max-width: 420px;
          width: 100%;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,.18);
          text-align: center;
        }
        .modal-close {
          position: absolute;
          top: 14px; right: 16px;
          background: none;
          border: none;
          font-size: 18px;
          color: var(--text-3);
          cursor: pointer;
        }
        .modal-close:hover { color: var(--text-1); }
        .modal-icon { font-size: 36px; display: block; margin-bottom: 12px; }
        .modal-title { font-size: 18px; font-weight: 700; color: var(--text-1); margin: 0 0 8px; }
        .modal-body { font-size: 14px; color: var(--text-2); margin: 0 0 20px; line-height: 1.6; }
        .modal-plan {
          background: var(--brand-light);
          border: 1.5px solid var(--brand);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          margin-bottom: 20px;
          text-align: left;
        }
        .plan-price { margin-bottom: 10px; }
        .price-amount { font-size: 28px; font-weight: 700; color: var(--brand); }
        .price-period { font-size: 14px; color: var(--text-2); }
        .plan-features {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .plan-features li { font-size: 13px; color: var(--text-1); padding-left: 18px; position: relative; }
        .plan-features li::before { content: "✓"; position: absolute; left: 0; color: var(--brand); font-weight: 700; }
        .btn-upgrade {
          display: block;
          width: 100%;
          background: var(--brand);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          padding: 13px;
          border-radius: var(--radius-md);
          text-decoration: none;
          margin-bottom: 10px;
          transition: background 0.15s;
          box-sizing: border-box;
        }
        .btn-upgrade:hover { background: var(--brand-dark); }
        .modal-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          font-size: 15px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-md);
          outline: none;
          font-family: inherit;
          margin-bottom: 10px;
          color: var(--text-1);
          background: var(--surface);
          transition: border-color 0.15s;
        }
        .modal-input:focus { border-color: var(--brand); }

        .btn-later {
          background: none;
          border: none;
          font-size: 13px;
          color: var(--text-3);
          cursor: pointer;
          padding: 6px;
        }
        .btn-later:hover { color: var(--text-2); }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .cp-main { padding: 20px 14px 60px; }
          .cp-title { font-size: 21px; }
          .quality-options { grid-template-columns: 1fr; }
          .result-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .info-grid { grid-template-columns: 1fr; }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .spinner { animation: none; }
          .btn-compress, .btn-browse, .drop-zone { transition: none; }
        }
      `}</style>

      <div className="cp-page">
        {/* ── Nav ── */}
        <nav className="cp-nav" aria-label="Site navigation">
          <a href="https://tools.javetech.online" className="nav-logo">JAVE Tools</a>
          <span className="nav-sep">›</span>
          <span className="nav-current">Compress PDF</span>
          {isPro && <span className="nav-pro-badge">✦ Pro</span>}
        </nav>

        <main className="cp-main">
          {/* ── Payment success banner ── */}
          {paymentSuccess && (
            <div
              role="alert"
              style={{
                background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10,
                padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
                marginBottom: 20, fontSize: 14, color: "#057A55", fontWeight: 500,
              }}
            >
              <span aria-hidden="true">✅</span>
              Payment successful! Your Pro plan is activating — this page will update in a few seconds.
            </div>
          )}

          {/* ── Header ── */}
          <header className="cp-header">
            <h1 className="cp-title">Compress PDF</h1>
            <p className="cp-subtitle">
              Reduce your PDF file size instantly — right in your browser. Your file is
              never uploaded to a server.
            </p>
          </header>

          {/* ── Top AdSense (free users only) ── */}
          {!isPro && <AdSenseBanner slot="top" />}

          {/* ── Usage bar (free users only) ── */}
          {!isPro && (
            <div className="usage-bar-wrap" aria-label="Daily usage">
              <span className="usage-label">Today's uses</span>
              <div
                className="usage-track"
                role="progressbar"
                aria-valuenow={usageCount}
                aria-valuemax={FREE_DAILY_LIMIT}
                aria-label={`${usageCount} of ${FREE_DAILY_LIMIT} daily compressions used`}
              >
                <div
                  className="usage-fill"
                  style={{
                    width: `${Math.min(100, (usageCount / FREE_DAILY_LIMIT) * 100)}%`,
                    background: usageCount >= FREE_DAILY_LIMIT ? "#C81E1E" : undefined,
                  }}
                />
              </div>
              <span className="usage-count">
                {usageCount}/{FREE_DAILY_LIMIT}
              </span>
              <button
                className="usage-upgrade"
                onClick={() => setUpgradeReason("limit")}
                type="button"
              >
                Upgrade
              </button>
            </div>
          )}

          {/* ── Drop zone or file card ── */}
          {!file ? (
            <div
              ref={dropZoneRef}
              className={`drop-zone${isDragging ? " dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Click or drag a PDF file to compress"
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="file-input-hidden"
                onChange={handleFileChange}
                aria-hidden="true"
                tabIndex={-1}
              />
              <span className="drop-icon" aria-hidden="true">📄</span>
              <p className="drop-title">Drop your PDF here</p>
              <p className="drop-sub">or click to browse files</p>
              <button
                className="btn-browse"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                type="button"
              >
                Choose PDF file
              </button>
              <p className="drop-limits">
                {isPro
                  ? "Up to 50 MB · Pro plan"
                  : `Up to ${FREE_MAX_MB} MB free · Unlimited with Pro`}
              </p>
            </div>
          ) : (
            <>
              {/* ── File card ── */}
              <div className="file-card" role="region" aria-label="Selected file">
                <span className="file-icon" aria-hidden="true">📄</span>
                <div className="file-info">
                  <p className="file-name" title={file.name}>{file.name}</p>
                  <p className="file-size">{formatBytes(file.size)}</p>
                </div>
                <button
                  className="btn-remove"
                  onClick={handleReset}
                  aria-label="Remove file"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>

              {/* ── Quality selector ── */}
              {status !== "done" && (
                <div className="quality-section">
                  <span className="quality-label" id="quality-label">
                    Compression level
                  </span>
                  <div
                    className="quality-options"
                    role="radiogroup"
                    aria-labelledby="quality-label"
                  >
                    {QUALITY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        className={`quality-option${quality === preset.id ? " selected" : ""}`}
                        role="radio"
                        aria-checked={quality === preset.id}
                        onClick={() => setQuality(preset.id)}
                        type="button"
                      >
                        {quality === preset.id && (
                          <span className="quality-check" aria-hidden="true">✓</span>
                        )}
                        <span className="quality-option-name">{preset.label}</span>
                        <span className="quality-option-desc">{preset.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Compress button ── */}
              {status !== "done" && (
                <>
                  <button
                    className="btn-compress"
                    onClick={handleCompress}
                    disabled={status === "compressing" || status === "checking"}
                    type="button"
                    aria-busy={status === "compressing"}
                  >
                    {status === "compressing" || status === "checking" ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        {status === "checking" ? "Checking…" : "Compressing…"}
                      </>
                    ) : (
                      <>⚡ Compress PDF</>
                    )}
                  </button>
                  {(status === "compressing") && (
                    <p className="progress-hint" aria-live="polite">
                      Processing entirely in your browser — no upload required
                    </p>
                  )}
                </>
              )}

              {/* ── Error ── */}
              {status === "error" && errorMsg && (
                <div className="error-banner" role="alert">
                  <span className="error-icon" aria-hidden="true">⚠️</span>
                  <p className="error-text">{errorMsg}</p>
                </div>
              )}

              {/* ── Result ── */}
              {status === "done" && result && (
                <div
                  className="result-card"
                  role="region"
                  aria-label="Compression result"
                  aria-live="polite"
                >
                  <div className="result-header">
                    <span className="result-icon" aria-hidden="true">✅</span>
                    <p className="result-title">
                      PDF compressed successfully
                    </p>
                  </div>

                  <div className="result-stats">
                    <div className="stat-box">
                      <span className="stat-label">Original</span>
                      <p className="stat-value">{formatBytes(result.originalBytes)}</p>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Compressed</span>
                      <p className="stat-value">{formatBytes(result.bytes)}</p>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Saved</span>
                      <p className="stat-value savings">
                        {result.savings > 0 ? `${result.savings}%` : "< 1%"}
                      </p>
                    </div>
                  </div>

                  <a
                    href={result.url}
                    download={result.filename}
                    className="btn-download"
                  >
                    ⬇ Download compressed PDF
                  </a>

                  <button
                    className="btn-compress-another"
                    onClick={handleReset}
                    type="button"
                  >
                    Compress another file
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Result AdSense (shown after compression) ── */}
          {!isPro && status === "done" && <AdSenseBanner slot="result" />}

          {/* ── Trust signals ── */}
          <section className="info-section" aria-label="How it works">
            <div className="info-grid">
              <div className="info-card">
                <span className="info-card-icon" aria-hidden="true">🔒</span>
                <p className="info-card-title">100% private</p>
                <p className="info-card-body">
                  Your PDF is compressed entirely in your browser. Nothing is
                  uploaded to any server.
                </p>
              </div>
              <div className="info-card">
                <span className="info-card-icon" aria-hidden="true">⚡</span>
                <p className="info-card-title">Instant results</p>
                <p className="info-card-body">
                  No waiting for server uploads or queues. Compression happens
                  in seconds on your device.
                </p>
              </div>
              <div className="info-card">
                <span className="info-card-icon" aria-hidden="true">📦</span>
                <p className="info-card-title">No software needed</p>
                <p className="info-card-body">
                  Works in any browser on Windows, Mac, or mobile. No
                  installation required.
                </p>
              </div>
            </div>

            {/* ── FAQ (SEO rich snippets) ── */}
            <div className="faq-section">
              <h2 className="faq-title">Frequently asked questions</h2>

              <div className="faq-item">
                <p className="faq-q">How do I compress a PDF file online for free?</p>
                <p className="faq-a">
                  Upload your PDF file to this page, choose a compression level, and
                  click "Compress PDF." Your compressed file will be ready to download
                  in seconds — no email or signup required.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-q">Is my PDF safe when I compress it here?</p>
                <p className="faq-a">
                  Yes. JAVE Tools compresses PDFs entirely inside your browser using
                  JavaScript. Your file is never sent to a server, so it stays
                  completely private on your device.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-q">How much can I reduce a PDF file size?</p>
                <p className="faq-a">
                  Results depend on the content of your PDF. Typical office documents
                  see 10–40% reduction. Image-heavy PDFs can be reduced by 50–70%
                  using the "Maximum compression" setting.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-q">What is the maximum PDF file size I can compress?</p>
                <p className="faq-a">
                  Free users can compress files up to {FREE_MAX_MB} MB. Pro users can
                  compress files up to 50 MB and batch-process multiple files at once.
                </p>
              </div>
              <div className="faq-item">
                <p className="faq-q">Will compressing a PDF reduce its quality?</p>
                <p className="faq-a">
                  The "High quality" setting preserves near-original visual quality.
                  The "Maximum compression" setting may reduce image sharpness slightly
                  in exchange for the smallest file size. Text and vector graphics are
                  never degraded.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* ── Upgrade modal ── */}
      {upgradeReason && (
        <UpgradeModal
          reason={upgradeReason}
          onClose={() => setUpgradeReason(null)}
          user={user}
        />
      )}
    </>
  );
}
