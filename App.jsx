/**
 * App.jsx — tools.javetech.online router
 *
 * Each tool gets its own route at /tool-name.
 * Add new tools by importing and adding a <Route> below.
 *
 * Install deps:
 *   npm install react-router-dom @supabase/supabase-js pdf-lib
 *
 * .env.local:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhb...
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import CompressPDF from "./tools/CompressPDF";

// Placeholder components for future tools (swap in real ones as you build them)
const ComingSoon = ({ name }) => (
  <div style={{ padding: "60px 24px", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
    <h1 style={{ fontSize: 24, color: "#111827" }}>{name}</h1>
    <p style={{ color: "#6B7280" }}>Coming soon — building now.</p>
    <a href="/" style={{ color: "#1A56DB", fontSize: 14 }}>← Back to all tools</a>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Homepage (tools index) ── */}
        <Route path="/" element={<ToolsHome />} />

        {/* ── PDF tools ── */}
        <Route path="/compress-pdf"  element={<CompressPDF />} />
        <Route path="/merge-pdf"     element={<ComingSoon name="Merge PDF" />} />
        <Route path="/split-pdf"     element={<ComingSoon name="Split PDF" />} />
        <Route path="/pdf-to-word"   element={<ComingSoon name="PDF to Word" />} />
        <Route path="/word-to-pdf"   element={<ComingSoon name="Word to PDF" />} />
        <Route path="/pdf-to-jpg"    element={<ComingSoon name="PDF to JPG" />} />
        <Route path="/jpg-to-pdf"    element={<ComingSoon name="JPG to PDF" />} />

        {/* ── Image tools ── */}
        <Route path="/compress-image" element={<ComingSoon name="Compress Image" />} />
        <Route path="/resize-image"   element={<ComingSoon name="Resize Image" />} />
        <Route path="/convert-image"  element={<ComingSoon name="Convert Image" />} />
        <Route path="/crop-image"     element={<ComingSoon name="Crop Image" />} />
        <Route path="/remove-background" element={<ComingSoon name="Remove Background" />} />

        {/* ── Text tools ── */}
        <Route path="/word-counter"     element={<ComingSoon name="Word Counter" />} />
        <Route path="/character-counter" element={<ComingSoon name="Character Counter" />} />
        <Route path="/case-converter"   element={<ComingSoon name="Case Converter" />} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<ComingSoon name="Tool not found" />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Simple tools home / index page ──────────────────────────────────────────
const TOOL_LIST = [
  { name: "Compress PDF", path: "/compress-pdf", icon: "📦", ready: true },
  { name: "Merge PDF",    path: "/merge-pdf",    icon: "📎", ready: false },
  { name: "Split PDF",    path: "/split-pdf",    icon: "✂️",  ready: false },
  { name: "PDF to Word",  path: "/pdf-to-word",  icon: "📝", ready: false },
  { name: "Word to PDF",  path: "/word-to-pdf",  icon: "🔄", ready: false },
  { name: "PDF to JPG",   path: "/pdf-to-jpg",   icon: "🖼️", ready: false },
  { name: "JPG to PDF",   path: "/jpg-to-pdf",   icon: "📄", ready: false },
  { name: "Compress Image", path: "/compress-image", icon: "🗜️", ready: false },
  { name: "Resize Image", path: "/resize-image", icon: "📐", ready: false },
  { name: "Word Counter", path: "/word-counter", icon: "🔢", ready: false },
];

function ToolsHome() {
  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      minHeight: "100vh",
      background: "#F9FAFB",
      padding: "0 0 60px",
    }}>
      {/* Nav */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        padding: "0 24px",
        height: 52,
        display: "flex",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 700, color: "#1A56DB", fontSize: 16 }}>JAVE Tools</span>
        <span style={{ marginLeft: 8, fontSize: 13, color: "#6B7280" }}>
          — Free online tools by JAVE IT Solutions
        </span>
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
          Free online tools
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 28px" }}>
          Compress, convert, and edit files — entirely in your browser. Private and free.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12,
        }}>
          {TOOL_LIST.map((tool) => (
            <a
              key={tool.path}
              href={tool.path}
              style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "16px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                opacity: tool.ready ? 1 : 0.6,
                pointerEvents: tool.ready ? "auto" : "none",
                cursor: tool.ready ? "pointer" : "default",
              }}
            >
              <span style={{ fontSize: 22 }}>{tool.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                {tool.name}
              </span>
              {!tool.ready && (
                <span style={{ fontSize: 10, color: "#9CA3AF" }}>Coming soon</span>
              )}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
