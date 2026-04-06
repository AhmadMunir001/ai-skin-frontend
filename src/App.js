import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE_URL = "https://ai-skin-backend-a64v.onrender.com";
const ANALYZE_URL = `${BASE_URL}/api/analyze-skin`;

// ── History helpers ──────────────────────────────────
const HISTORY_KEY = "dermiq_history";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveToHistory(entry) {
  const hist = loadHistory();
  hist.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 20)));
}

// ── Constants ────────────────────────────────────────
const COLORS = {
  low:    { bg: "#e8f5e9", text: "#2e7d32", bar: "#66bb6a" },
  medium: { bg: "#fff8e1", text: "#f57f17", bar: "#ffca28" },
  high:   { bg: "#fce4ec", text: "#c62828", bar: "#ef5350" },
};
const METRIC_ICONS = {
  acne: "🔴", oiliness: "✨", dryness: "🏜️",
  pigmentation: "🌑", sensitivity: "🌸",
};
function severityPercent(label) {
  return label === "low" ? 20 : label === "medium" ? 55 : 88;
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

// ── Styles ───────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --cream: #faf7f2; --warm-white: #fffef9;
    --rose: #c4776a; --rose-light: #f0cfc9; --rose-dark: #8b3a2f;
    --sage: #7a9e7e; --sage-light: #d4e8d6;
    --gold: #c9a84c; --gold-light: #f5e6c0;
    --ink: #1a1208; --muted: #7a6e62; --border: #e8e0d4;
    --shadow: 0 4px 24px rgba(26,18,8,0.08);
  }
  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--ink); min-height: 100vh; }
  .app { max-width: 760px; margin: 0 auto; padding: 0 0 80px; }

  /* HERO */
  .hero { background: linear-gradient(160deg, #1a1208 0%, #3d2b1a 50%, #5c3d2a 100%); padding: 44px 40px 36px; text-align: center; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 60% 40%, rgba(196,119,106,0.18) 0%, transparent 70%); }
  .hero-eyebrow { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); opacity: 0.9; margin-bottom: 10px; }
  .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 300; color: #fffef9; line-height: 1.1; margin-bottom: 8px; }
  .hero-title span { color: var(--rose-light); font-style: italic; }
  .hero-sub { font-size: 13px; color: rgba(255,255,255,0.5); }

  /* TAB NAV */
  .tab-nav { display: flex; background: var(--warm-white); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
  .tab-btn { flex: 1; padding: 14px 12px; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; position: relative; }
  .tab-btn:hover { color: var(--rose); }
  .tab-btn.active { color: var(--rose-dark); border-bottom-color: var(--rose); font-weight: 500; }
  .tab-badge { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: var(--rose); color: white; font-size: 10px; margin-left: 6px; font-weight: 600; }

  /* UPLOAD SECTION */
  .upload-section { padding: 32px 32px 24px; background: var(--warm-white); border-bottom: 1px solid var(--border); }
  .upload-label { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; display: block; }
  .upload-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  .upload-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 12px; border: 1.5px dashed var(--border); border-radius: 12px; background: var(--cream); cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 0.5px; position: relative; overflow: hidden; }
  .upload-btn:hover { border-color: var(--rose); color: var(--rose-dark); background: #fdf5f3; }
  .upload-btn.active { border-color: var(--rose); background: #fdf5f3; color: var(--rose-dark); border-style: solid; }
  .upload-btn .icon { font-size: 22px; }
  .upload-btn input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
  .file-ready { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--sage-light); border-radius: 8px; font-size: 13px; color: #2e5e32; margin-bottom: 14px; }

  /* CAMERA */
  .camera-view { border-radius: 12px; overflow: hidden; border: 2px solid var(--rose-light); margin-bottom: 12px; position: relative; }
  .camera-view video { display: block; width: 100%; }
  .camera-overlay { position: absolute; inset: 0; border: 2px solid rgba(196,119,106,0.4); border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; margin: 10% 20%; pointer-events: none; }
  .camera-overlay.recording { border-color: rgba(239,83,80,0.8); animation: pulse-ring 1s ease-in-out infinite; }
  @keyframes pulse-ring { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
  .countdown-circle { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 80px; height: 80px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 42px; color: white; font-weight: 300; pointer-events: none; }
  .rec-dot { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 20px; font-size: 12px; color: white; }
  .rec-dot-icon { width: 8px; height: 8px; border-radius: 50%; background: #ef5350; animation: blink 1s ease-in-out infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
  .camera-mode-toggle { display: flex; gap: 8px; margin-bottom: 12px; }
  .mode-btn { flex: 1; padding: 8px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--cream); font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s; color: var(--muted); }
  .mode-btn.active { background: var(--rose); color: white; border-color: var(--rose); }
  .camera-controls { display: flex; gap: 10px; margin-bottom: 16px; }

  /* IMAGE PREVIEW + ZOOM */
  .preview-container { width: 100%; border-radius: 12px; overflow: hidden; border: 1.5px solid var(--border); background: #000; max-height: 320px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
  .preview-img { width: 100%; height: 320px; object-fit: contain; transform-origin: center; transition: transform 0.15s ease; }
  .zoom-controls { display: flex; align-items: center; gap: 10px; padding: 8px 4px; }
  .zoom-slider { flex: 1; -webkit-appearance: none; height: 4px; border-radius: 2px; background: var(--border); outline: none; }
  .zoom-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--rose); cursor: pointer; }
  .zoom-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: var(--rose); cursor: pointer; border: none; }

  /* AI SCANNER ANIMATION */
  .ai-scanner { margin-top: 20px; padding: 28px 20px; background: linear-gradient(135deg, #1a1208, #2d1f0f); border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  .scanner-pulse { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
  .scanner-ring { position: absolute; border-radius: 50%; border: 2px solid var(--rose); opacity: 0; animation: ring-expand 2.4s ease-out infinite; }
  .scanner-ring.r1 { width: 80px; height: 80px; animation-delay: 0s; }
  .scanner-ring.r2 { width: 80px; height: 80px; animation-delay: 0.8s; }
  .scanner-ring.r3 { width: 80px; height: 80px; animation-delay: 1.6s; }
  @keyframes ring-expand {
    0%   { transform: scale(0.3); opacity: 0.9; }
    100% { transform: scale(2.2); opacity: 0; }
  }
  .scanner-core { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--rose), var(--rose-dark)); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 14px; font-weight: 600; color: white; letter-spacing: 1px; z-index: 1; animation: core-glow 2s ease-in-out infinite; }
  @keyframes core-glow {
    0%, 100% { box-shadow: 0 0 12px rgba(196,119,106,0.4); }
    50%       { box-shadow: 0 0 28px rgba(196,119,106,0.9); }
  }
  .scanner-step { display: flex; align-items: center; gap: 10px; animation: step-fade 0.4s ease-in-out; }
  @keyframes step-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .scanner-step-icon { font-size: 22px; }
  .scanner-step-text { font-size: 13px; color: rgba(255,255,255,0.85); letter-spacing: 0.3px; text-align: center; }
  .scanner-progress { display: flex; gap: 6px; }
  .scanner-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); transition: all 0.3s; }
  .scanner-dot.active { background: var(--rose); transform: scale(1.4); }
  .scanner-dot.done { background: rgba(196,119,106,0.5); }

  /* ANALYZE BTN */
  .analyze-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #c4776a, #8b3a2f); color: white; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all 0.3s; }
  .analyze-btn:hover:not(:disabled) { background: linear-gradient(135deg, #d4877a, #9b4a3f); transform: translateY(-1px); box-shadow: 0 8px 24px rgba(196,119,106,0.4); }
  .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .status-bar { text-align: center; padding: 12px; font-size: 13px; color: var(--muted); font-style: italic; }

  /* LOADING */
  .loading-dots span { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: white; margin: 0 3px; animation: pulse 1.4s ease-in-out infinite; }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

  /* RESULTS */
  .results { padding: 0 32px; }
  .skin-summary-card { margin: 24px 0 20px; padding: 24px 28px; background: linear-gradient(135deg, #1a1208 0%, #3d2b1a 100%); border-radius: 16px; color: white; position: relative; overflow: hidden; }
  .skin-summary-card::after { content: '✦'; position: absolute; right: 24px; top: 20px; font-size: 32px; opacity: 0.1; }
  .summary-eyebrow { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); margin-bottom: 8px; }
  .summary-text { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; line-height: 1.4; color: #fffef9; }
  .confidence-badge { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 6px 12px; background: rgba(255,255,255,0.1); border-radius: 20px; font-size: 12px; color: rgba(255,255,255,0.7); }
  .confidence-dot { width: 8px; height: 8px; border-radius: 50%; }

  /* SECTIONS */
  .section-header { display: flex; align-items: center; gap: 10px; margin: 28px 0 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .section-header h2 { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 500; }
  .section-icon { font-size: 20px; }

  /* CLINICAL METRICS */
  .clinical-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
  .clinical-card { padding: 18px 16px; background: var(--warm-white); border-radius: 14px; border: 1px solid var(--border); text-align: center; transition: transform 0.2s; }
  .clinical-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .clinical-icon { font-size: 24px; margin-bottom: 8px; }
  .clinical-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .clinical-value { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 500; color: var(--ink); text-transform: capitalize; margin-bottom: 4px; }
  .clinical-sub { font-size: 11px; color: var(--muted); }

  /* METRICS */
  .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
  .metric-card { padding: 16px 18px; background: var(--warm-white); border-radius: 14px; border: 1px solid var(--border); transition: transform 0.2s; }
  .metric-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .metric-name { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
  .metric-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
  .metric-bar-track { height: 5px; background: var(--border); border-radius: 3px; overflow: hidden; }
  .metric-bar-fill { height: 100%; border-radius: 3px; transition: width 1s ease-out; }

  /* ROUTINE */
  .routine-card { background: var(--warm-white); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; margin-bottom: 16px; }
  .routine-steps { padding: 4px 0; }
  .routine-step { display: flex; align-items: flex-start; gap: 14px; padding: 12px 20px; border-bottom: 1px solid #f5f0ea; transition: background 0.15s; }
  .routine-step:last-child { border-bottom: none; }
  .routine-step:hover { background: #fdf9f5; }
  .step-num { min-width: 26px; height: 26px; background: var(--rose-light); color: var(--rose-dark); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; margin-top: 1px; }
  .step-text { font-size: 14px; line-height: 1.5; }

  /* WEEKLY */
  .treatment-pill { display: flex; align-items: center; gap: 10px; padding: 12px 16px; margin-bottom: 8px; background: var(--gold-light); border-radius: 10px; font-size: 13px; color: #5a4010; border-left: 3px solid var(--gold); }

  /* INFO CARDS */
  .info-card { padding: 16px 18px; border-radius: 14px; margin-bottom: 12px; font-size: 14px; line-height: 1.6; }
  .info-card strong { display: block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .chips-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .chip { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
  .chip-green { background: var(--sage-light); color: #2e5e32; }
  .chip-red { background: #fce4ec; color: #8b1a1a; }
  .warning-banner { display: flex; align-items: flex-start; gap: 10px; padding: 14px 18px; background: #fff8e1; border-radius: 10px; border-left: 3px solid var(--gold); font-size: 13px; color: #5a4010; margin-bottom: 10px; }

  /* HISTORY PAGE */
  .history-page { padding: 24px 32px; }
  .history-empty { text-align: center; padding: 60px 20px; }
  .history-empty-icon { font-size: 48px; margin-bottom: 16px; }
  .history-empty-title { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--ink); margin-bottom: 8px; }
  .history-empty-sub { font-size: 14px; color: var(--muted); }
  .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .history-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 400; }
  .clear-btn { padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px; background: none; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .clear-btn:hover { border-color: #ef5350; color: #ef5350; }

  .history-card { background: var(--warm-white); border-radius: 16px; border: 1px solid var(--border); margin-bottom: 16px; overflow: hidden; transition: box-shadow 0.2s; cursor: pointer; }
  .history-card:hover { box-shadow: var(--shadow); }
  .history-card-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); }
  .history-date { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
  .history-summary { font-family: 'Cormorant Garamond', serif; font-size: 17px; font-weight: 400; color: var(--ink); line-height: 1.3; }
  .history-conf { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: var(--cream); color: var(--muted); white-space: nowrap; margin-top: 4px; }
  .history-metrics { display: flex; gap: 8px; flex-wrap: wrap; padding: 14px 20px; }
  .history-metric-chip { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: capitalize; }
  .history-card-footer { padding: 10px 20px; background: var(--cream); display: flex; justify-content: space-between; align-items: center; }
  .history-expand { font-size: 12px; color: var(--rose); cursor: pointer; letter-spacing: 0.5px; }
  .history-detail { padding: 0 20px 16px; border-top: 1px solid var(--border); display: none; }
  .history-detail.open { display: block; }

  /* BUTTONS */
  .btn-sm { padding: 10px 18px; border-radius: 8px; border: 1.5px solid var(--border); background: var(--warm-white); font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; }
  .btn-sm:hover { border-color: var(--rose); color: var(--rose-dark); }
  .btn-primary-sm { background: var(--rose); color: white; border-color: var(--rose); }
  .btn-primary-sm:hover { background: var(--rose-dark); border-color: var(--rose-dark); color: white; }

  @media (max-width: 520px) {
    .hero { padding: 36px 20px 28px; }
    .hero-title { font-size: 36px; }
    .upload-section, .results, .history-page { padding-left: 20px; padding-right: 20px; }
    .metrics-grid { grid-template-columns: 1fr; }
    .upload-grid { grid-template-columns: 1fr 1fr; }
  }
`;

const AI_STEPS = [
  { icon: "🔍", text: "Detecting face landmarks…" },
  { icon: "🧬", text: "Mapping skin regions (T-zone / U-zone)…" },
  { icon: "💡", text: "Normalizing lighting & contrast…" },
  { icon: "🔴", text: "Analyzing acne markers & comedones…" },
  { icon: "✨", text: "Measuring oiliness via specular highlights…" },
  { icon: "🌑", text: "Computing pigmentation index…" },
  { icon: "🎨", text: "Calculating ITA skin tone angle…" },
  { icon: "🌡️", text: "Running redness (R/G erythema) analysis…" },
  { icon: "🔬", text: "Estimating pore size distribution…" },
  { icon: "🧴", text: "Generating personalized K-beauty routine…" },
  { icon: "✦", text: "Finalizing your clinical skin report…" },
];


function HistoryCard({ entry, index }) {
  const [open, setOpen] = useState(false);
  const sa = entry.skin_analysis || {};
  const routine = entry.routine || {};
  const conf = sa.confidence ?? 1;
  const confColor = conf >= 0.7 ? "#66bb6a" : conf >= 0.4 ? "#ffca28" : "#ef5350";

  return (
    <div className="history-card">
      <div className="history-card-header" onClick={() => setOpen(!open)}>
        <div style={{ flex: 1 }}>
          <div className="history-date">📅 {formatDate(entry.timestamp)}</div>
          <div className="history-summary">
            {routine.skin_type_summary || "Skin analysis completed"}
          </div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 12 }}>
          <div className="history-conf">
            <span style={{ color: confColor }}>●</span> {Math.round(conf * 100)}% confidence
          </div>
        </div>
      </div>

      <div className="history-metrics">
        {["acne", "oiliness", "dryness", "pigmentation", "sensitivity"].map(k => {
          const val = sa[k];
          if (!val) return null;
          const c = COLORS[val] || COLORS.medium;
          return (
            <span key={k} className="history-metric-chip"
              style={{ background: c.bg, color: c.text }}>
              {METRIC_ICONS[k]} {k}: {val}
            </span>
          );
        })}
      </div>

      <div className="history-card-footer">
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Scan #{index + 1}
        </span>
        <span className="history-expand" onClick={() => setOpen(!open)}>
          {open ? "▲ Hide routine" : "▼ View routine"}
        </span>
      </div>

      <div className={`history-detail ${open ? "open" : ""}`}>
        {routine.morning_routine?.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              🌅 Morning Routine
            </div>
            {routine.morning_routine.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 13 }}>
                <span style={{ minWidth: 20, height: 20, background: "var(--rose-light)", color: "var(--rose-dark)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        )}
        {routine.night_routine?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              🌙 Night Routine
            </div>
            {routine.night_routine.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, fontSize: 13 }}>
                <span style={{ minWidth: 20, height: 20, background: "var(--rose-light)", color: "var(--rose-dark)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        )}
        {routine.natural_remedy && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fff4", borderRadius: 8, fontSize: 13 }}>
            🌿 <strong>Remedy:</strong> {routine.natural_remedy}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results Renderer (shared) ────────────────────────
function ResultsView({ result }) {
  const sa = result?.skin_analysis || {};
  const routine = result?.routine || {};
  const conf = sa.confidence ?? 1;
  const confColor = conf >= 0.7 ? "#66bb6a" : conf >= 0.4 ? "#ffca28" : "#ef5350";

  return (
    <div className="results">
      {routine.skin_type_summary && (
        <div className="skin-summary-card">
          <div className="summary-eyebrow">Your Skin Profile</div>
          <div className="summary-text">{routine.skin_type_summary}</div>
          <div className="confidence-badge">
            <div className="confidence-dot" style={{ background: confColor }} />
            Analysis confidence: {Math.round(conf * 100)}%
          </div>
        </div>
      )}

      {sa.warnings?.length > 0 && sa.warnings.map((w, i) => (
        <div className="warning-banner" key={i}>⚠️ {w}</div>
      ))}

      <div className="section-header"><span className="section-icon">🔬</span><h2>Skin Metrics</h2></div>
      <div className="metrics-grid">
        {["acne","oiliness","dryness","pigmentation","sensitivity"].map(key => {
          const val = sa[key];
          if (!val) return null;
          const c = COLORS[val] || COLORS.medium;
          return (
            <div className="metric-card" key={key}>
              <div className="metric-top">
                <span className="metric-name">{METRIC_ICONS[key]} {key}</span>
                <span className="metric-badge" style={{ background: c.bg, color: c.text }}>{val}</span>
              </div>
              <div className="metric-bar-track">
                <div className="metric-bar-fill" style={{ width: `${severityPercent(val)}%`, background: c.bar }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Clinical Metrics ── */}
      {(sa.skin_tone || sa.redness || sa.pore_size || sa.skin_zone_type) && (
        <>
          <div className="section-header"><span className="section-icon">🧬</span><h2>Clinical Report</h2></div>
          <div className="clinical-grid">

            {sa.skin_tone && (
              <div className="clinical-card">
                <div className="clinical-icon">🎨</div>
                <div className="clinical-label">Skin Tone (ITA)</div>
                <div className="clinical-value">{sa.skin_tone}</div>
                {sa.ita_angle !== undefined && (
                  <div className="clinical-sub">ITA angle: {sa.ita_angle}°</div>
                )}
              </div>
            )}

            {sa.redness && (
              <div className="clinical-card">
                <div className="clinical-icon">🌡️</div>
                <div className="clinical-label">Redness Index</div>
                <div className="clinical-value" style={{
                  color: sa.redness === "high" ? "#c62828" : sa.redness === "medium" ? "#f57f17" : "#2e7d32"
                }}>{sa.redness}</div>
                {sa.redness_index !== undefined && (
                  <div className="clinical-sub">R/G ratio: {sa.redness_index}</div>
                )}
              </div>
            )}

            {sa.pore_size && (
              <div className="clinical-card">
                <div className="clinical-icon">🔍</div>
                <div className="clinical-label">Pore Size</div>
                <div className="clinical-value" style={{
                  color: sa.pore_size === "enlarged" ? "#c62828" : sa.pore_size === "moderate" ? "#f57f17" : "#2e7d32"
                }}>{sa.pore_size}</div>
                {sa.scores?.pore_score !== undefined && (
                  <div className="clinical-sub">Score: {sa.scores.pore_score}</div>
                )}
              </div>
            )}

            {sa.skin_zone_type && sa.skin_zone_type !== "unknown" && (
              <div className="clinical-card">
                <div className="clinical-icon">🗺️</div>
                <div className="clinical-label">Skin Zone</div>
                <div className="clinical-value" style={{ textTransform: "capitalize" }}>{sa.skin_zone_type}</div>
                {sa.zones?.tzone_oiliness !== null && sa.zones?.tzone_oiliness !== undefined && (
                  <div className="clinical-sub">T-zone: {sa.zones.tzone_oiliness} · U-zone: {sa.zones.uzone_dryness}</div>
                )}
              </div>
            )}

          </div>
        </>
      )}

      {routine.morning_routine?.length > 0 && (
        <>
          <div className="section-header"><span className="section-icon">🌅</span><h2>Morning Routine</h2></div>
          <div className="routine-card">
            <div className="routine-steps">
              {routine.morning_routine.map((step, i) => (
                <div className="routine-step" key={i}>
                  <div className="step-num">{i + 1}</div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {routine.night_routine?.length > 0 && (
        <>
          <div className="section-header"><span className="section-icon">🌙</span><h2>Night Routine</h2></div>
          <div className="routine-card">
            <div className="routine-steps">
              {routine.night_routine.map((step, i) => (
                <div className="routine-step" key={i}>
                  <div className="step-num">{i + 1}</div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {routine.weekly_treatments?.length > 0 && (
        <>
          <div className="section-header"><span className="section-icon">📅</span><h2>Weekly Treatments</h2></div>
          {routine.weekly_treatments.map((t, i) => (
            <div className="treatment-pill" key={i}>✦ {t}</div>
          ))}
        </>
      )}

      <div className="section-header"><span className="section-icon">🌿</span><h2>Natural Care</h2></div>
      {routine.natural_remedy && (
        <div className="info-card" style={{ background: "#f0fff4", border: "1px solid #c3e6cb" }}>
          <strong style={{ color: "#2e7d32" }}>Natural Remedy</strong>{routine.natural_remedy}
        </div>
      )}
      {routine.food && (
        <div className="info-card" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
          <strong style={{ color: "#f57f17" }}>Food Tips</strong>{routine.food}
        </div>
      )}
      {routine.hydration && (
        <div className="info-card" style={{ background: "#e3f2fd", border: "1px solid #90caf9" }}>
          <strong style={{ color: "#1565c0" }}>Hydration</strong>{routine.hydration}
        </div>
      )}

      {(routine.ingredients_to_use?.length > 0 || routine.ingredients_to_avoid?.length > 0) && (
        <>
          <div className="section-header"><span className="section-icon">🧴</span><h2>Ingredients Guide</h2></div>
          {routine.ingredients_to_use?.length > 0 && (
            <div className="info-card" style={{ background: "#d4e8d6", border: "1px solid #c3e6cb", marginBottom: 10 }}>
              <strong style={{ color: "#2e7d32" }}>✓ Look For</strong>
              <div className="chips-row">
                {routine.ingredients_to_use.map((ing, i) => <span className="chip chip-green" key={i}>{ing}</span>)}
              </div>
            </div>
          )}
          {routine.ingredients_to_avoid?.length > 0 && (
            <div className="info-card" style={{ background: "#fce4ec", border: "1px solid #f48fb1" }}>
              <strong style={{ color: "#c62828" }}>✗ Avoid</strong>
              <div className="chips-row">
                {routine.ingredients_to_avoid.map((ing, i) => <span className="chip chip-red" key={i}>{ing}</span>)}
              </div>
            </div>
          )}
        </>
      )}

      {routine.note && (
        <div className="info-card" style={{ background: "#fce4ec", border: "1px solid #f48fb1", marginTop: 8 }}>
          <strong style={{ color: "#8b1a1a" }}>📝 Note</strong>{routine.note}
        </div>
      )}

      {sa.retake_required && (
        <div className="warning-banner" style={{ marginTop: 16 }}>
          📷 For better results, retake your photo in natural daylight facing the camera directly.
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("analyze"); // "analyze" | "history"
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // "photo" | "video"
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [history, setHistory] = useState(loadHistory);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pendingStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Cycle through AI steps while loading
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % AI_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  // Generate preview URL when file is selected
  useEffect(() => {
    if (!file) { setPreviewUrl(null); setZoom(1); return; }
    if (fileType === "image") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setZoom(1);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, fileType]);

  useEffect(() => {
    if (cameraOn && videoRef.current && pendingStreamRef.current) {
      videoRef.current.srcObject = pendingStreamRef.current;
      videoRef.current.play().catch(() => {});
      pendingStreamRef.current = null;
    }
  }, [cameraOn]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setCameraOn(true);
      } else {
        pendingStreamRef.current = stream;
        setCameraOn(true);
      }
    } catch (err) { alert("Camera access denied: " + err.message); }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Flip horizontally to match the un-mirrored display
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      setFileType("image");
      stopCamera();
    }, "image/jpeg");
  };

  const startLiveRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    // Pick supported mime type
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
      .find(m => MediaRecorder.isTypeSupported(m)) || "";

    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType || "video/webm" });
      const videoFile = new File([blob], "skin_scan.webm", { type: blob.type });
      setFile(videoFile);
      setFileType("video");
      stopCamera();
      setRecording(false);
      setCountdown(null);
    };

    // 5-second countdown then auto-stop
    let secs = 5;
    setCountdown(secs);
    setRecording(true);
    recorder.start(100);

    const tick = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(tick);
        setCountdown(0);
        recorder.stop();
      } else {
        setCountdown(secs);
      }
    }, 1000);
  };

  const handleAnalyze = async (isVideo = false) => {
    if (!file) return alert("Please select or capture an image first.");
    setLoading(true); setResult(null);
    const endpoint = isVideo ? `${BASE_URL}/api/analyze-video` : ANALYZE_URL;
    const formData = new FormData();
    formData.append("file", file);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        setLoadingStep(0);
        const res = await axios.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: isVideo ? 300000 : 180000,
        });
        setResult(res.data);
        setLoading(false);

        // Save to history
        const entry = { ...res.data, timestamp: new Date().toISOString() };
        saveToHistory(entry);
        setHistory(loadHistory());
        return;
      } catch (err) {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 5000));
        } else {
          setLoading(false);
          alert(err.response ? JSON.stringify(err.response.data) : "All attempts failed. Check your connection.");
        }
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Clear all scan history?")) {
      localStorage.removeItem("dermiq_history");
      setHistory([]);
    }
  };

  return (
    <>
      <style>{globalStyles}</style>
      <div className="app">

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">AI-Powered · K-Beauty Science</div>
          <h1 className="hero-title">Derm<span>iq</span></h1>
          <p className="hero-sub">Personalized skincare for South Asian skin</p>
        </div>

        {/* TAB NAV */}
        <div className="tab-nav">
          <button className={`tab-btn ${tab === "analyze" ? "active" : ""}`} onClick={() => setTab("analyze")}>
            ✦ Analyze
          </button>
          <button className={`tab-btn ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            History
            {history.length > 0 && <span className="tab-badge">{history.length}</span>}
          </button>
        </div>

        {/* ── ANALYZE TAB ── */}
        {tab === "analyze" && (
          <>
            <div className="upload-section">
              <span className="upload-label">Upload or Capture</span>
              <div className="upload-grid">
                <label className={`upload-btn ${fileType === "image" && file ? "active" : ""}`}>
                  <span className="icon">🖼️</span><span>Photo</span>
                  <input type="file" accept="image/*" onChange={e => { setFile(e.target.files[0]); setFileType("image"); }} />
                </label>
                <label className={`upload-btn ${fileType === "video" && file ? "active" : ""}`}>
                  <span className="icon">🎥</span><span>Video</span>
                  <input type="file" accept="video/*" onChange={e => { setFile(e.target.files[0]); setFileType("video"); }} />
                </label>
                <button className={`upload-btn ${cameraOn ? "active" : ""}`} onClick={cameraOn ? stopCamera : startCamera}>
                  <span className="icon">📷</span><span>{cameraOn ? "Close" : "Camera"}</span>
                </button>
              </div>

              {cameraOn && (
                <div>
                  {/* Mode toggle */}
                  <div className="camera-mode-toggle">
                    <button className={`mode-btn ${cameraMode === "photo" ? "active" : ""}`}
                      onClick={() => setCameraMode("photo")} disabled={recording}>
                      📷 Photo
                    </button>
                    <button className={`mode-btn ${cameraMode === "video" ? "active" : ""}`}
                      onClick={() => setCameraMode("video")} disabled={recording}>
                      🎥 5s Video Scan
                    </button>
                  </div>

                  <div className="camera-view">
                    <video ref={videoRef} autoPlay playsInline style={{ width: "100%", transform: "scaleX(-1)" }} />
                    <div className={`camera-overlay ${recording ? "recording" : ""}`} />

                    {/* Countdown overlay */}
                    {recording && countdown !== null && countdown > 0 && (
                      <div className="countdown-circle">{countdown}</div>
                    )}
                    {recording && (
                      <div className="rec-dot">
                        <div className="rec-dot-icon" />
                        {countdown > 0 ? `${countdown}s` : "Saving…"}
                      </div>
                    )}
                  </div>

                  <div className="camera-controls">
                    {cameraMode === "photo" ? (
                      <button className="btn-sm btn-primary-sm" onClick={captureImage}>📸 Capture Photo</button>
                    ) : (
                      <button className="btn-sm btn-primary-sm"
                        onClick={startLiveRecording} disabled={recording}>
                        {recording ? `⏺ Recording… ${countdown}s` : "⏺ Start 5s Scan"}
                      </button>
                    )}
                    <button className="btn-sm" onClick={stopCamera} disabled={recording}>✕ Close</button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Image preview with zoom */}
              {previewUrl && !cameraOn && (
                <div style={{ marginBottom: 16 }}>
                  <div className="preview-container">
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="preview-img"
                      style={{ transform: `scale(${zoom})` }}
                    />
                  </div>
                  <div className="zoom-controls">
                    <span style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--muted)" }}>
                      🔍 Zoom
                    </span>
                    <input
                      type="range" min="1" max="3" step="0.1"
                      value={zoom}
                      onChange={e => setZoom(parseFloat(e.target.value))}
                      className="zoom-slider"
                    />
                    <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 32 }}>{zoom.toFixed(1)}×</span>
                    <button className="btn-sm" style={{ padding: "4px 10px", fontSize: 11 }}
                      onClick={() => setZoom(1)}>Reset</button>
                  </div>
                </div>
              )}

              {file && !cameraOn && !previewUrl && (
                <div className="file-ready"><span>✅</span><span>{file.name} — ready to analyze</span></div>
              )}

              <button className="analyze-btn" onClick={() => handleAnalyze(fileType === "video")} disabled={loading}>
                {loading ? <span className="loading-dots"><span/><span/><span/></span> : "✦  ANALYZE MY SKIN"}
              </button>

              {/* AI Scanning Animation */}
              {loading && (
                <div className="ai-scanner">
                  <div className="scanner-pulse">
                    <div className="scanner-ring r1" />
                    <div className="scanner-ring r2" />
                    <div className="scanner-ring r3" />
                    <div className="scanner-core">AI</div>
                  </div>
                  <div className="scanner-step">
                    <span className="scanner-step-icon">{AI_STEPS[loadingStep].icon}</span>
                    <span className="scanner-step-text">{AI_STEPS[loadingStep].text}</span>
                  </div>
                  <div className="scanner-progress">
                    {AI_STEPS.map((_, i) => (
                      <div key={i} className={`scanner-dot ${i === loadingStep ? "active" : i < loadingStep ? "done" : ""}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {result && <ResultsView result={result} />}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div className="history-page">
            {history.length === 0 ? (
              <div className="history-empty">
                <div className="history-empty-icon">🧴</div>
                <div className="history-empty-title">No scans yet</div>
                <div className="history-empty-sub">Your past analyses will appear here after your first scan.</div>
              </div>
            ) : (
              <>
                <div className="history-header">
                  <div className="history-title">Past Scans</div>
                  <button className="clear-btn" onClick={handleClearHistory}>🗑 Clear all</button>
                </div>
                {history.map((entry, i) => (
                  <HistoryCard key={i} entry={entry} index={i} />
                ))}
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}