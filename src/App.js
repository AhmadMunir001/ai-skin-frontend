import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const BASE_URL = "https://ai-skin-backend-a64v.onrender.com";
const ANALYZE_URL = `${BASE_URL}/api/analyze-skin`;

const COLORS = {
  low:    { bg: "#e8f5e9", text: "#2e7d32", bar: "#66bb6a" },
  medium: { bg: "#fff8e1", text: "#f57f17", bar: "#ffca28" },
  high:   { bg: "#fce4ec", text: "#c62828", bar: "#ef5350" },
};

const METRIC_ICONS = {
  acne: "🔴", oiliness: "✨", dryness: "🏜️",
  pigmentation: "🌑", sensitivity: "🌸",
};

const METRIC_MAX = {
  acne: { low: 0.02, high: 0.08, unit: "ratio" },
  oiliness: { low: 20, high: 45, unit: "score" },
  dryness: { low: 0.8, high: 2.5, unit: "score" },
  pigmentation: { low: 8, high: 18, unit: "score" },
};

function severityPercent(label) {
  return label === "low" ? 20 : label === "medium" ? 55 : 88;
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cream: #faf7f2;
    --warm-white: #fffef9;
    --rose: #c4776a;
    --rose-light: #f0cfc9;
    --rose-dark: #8b3a2f;
    --sage: #7a9e7e;
    --sage-light: #d4e8d6;
    --gold: #c9a84c;
    --gold-light: #f5e6c0;
    --ink: #1a1208;
    --muted: #7a6e62;
    --border: #e8e0d4;
    --shadow: 0 4px 24px rgba(26,18,8,0.08);
    --shadow-lg: 0 12px 48px rgba(26,18,8,0.12);
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  .app {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 0 80px;
  }

  /* HERO HEADER */
  .hero {
    background: linear-gradient(160deg, #1a1208 0%, #3d2b1a 50%, #5c3d2a 100%);
    padding: 52px 40px 44px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 60% 40%, rgba(196,119,106,0.18) 0%, transparent 70%);
  }
  .hero-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--gold);
    opacity: 0.9;
    margin-bottom: 14px;
  }
  .hero-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 48px;
    font-weight: 300;
    color: var(--warm-white);
    line-height: 1.1;
    letter-spacing: -0.5px;
    margin-bottom: 10px;
  }
  .hero-title span { color: var(--rose-light); font-style: italic; }
  .hero-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.5px;
  }

  /* UPLOAD ZONE */
  .upload-section {
    padding: 36px 32px 28px;
    background: var(--warm-white);
    border-bottom: 1px solid var(--border);
  }
  .upload-label {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 16px;
    display: block;
  }
  .upload-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }
  .upload-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 18px 12px;
    border: 1.5px dashed var(--border);
    border-radius: 12px;
    background: var(--cream);
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.5px;
    position: relative;
    overflow: hidden;
  }
  .upload-btn:hover { border-color: var(--rose); color: var(--rose-dark); background: #fdf5f3; }
  .upload-btn.active { border-color: var(--rose); background: #fdf5f3; color: var(--rose-dark); border-style: solid; }
  .upload-btn .icon { font-size: 22px; }
  .upload-btn input[type="file"] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%;
  }

  .file-ready {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; background: var(--sage-light);
    border-radius: 8px; font-size: 13px; color: #2e5e32;
    margin-bottom: 16px;
  }

  /* CAMERA */
  .camera-view {
    border-radius: 12px; overflow: hidden;
    border: 2px solid var(--rose-light);
    margin-bottom: 12px;
    position: relative;
  }
  .camera-view video { display: block; width: 100%; }
  .camera-overlay {
    position: absolute; inset: 0;
    border: 2px solid rgba(196,119,106,0.4);
    border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%;
    margin: 10% 20%;
    pointer-events: none;
  }
  .camera-controls { display: flex; gap: 10px; }

  /* ANALYZE BUTTON */
  .analyze-btn {
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #c4776a, #8b3a2f);
    color: white;
    border: none;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }
  .analyze-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #d4877a, #9b4a3f);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(196,119,106,0.4);
  }
  .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .status-bar {
    text-align: center; padding: 12px;
    font-size: 13px; color: var(--muted);
    font-style: italic;
  }

  /* LOADING PULSE */
  .loading-dots span {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--rose);
    margin: 0 3px;
    animation: pulse 1.4s ease-in-out infinite;
  }
  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* RESULTS */
  .results { padding: 0 32px; }

  .skin-summary-card {
    margin: 28px 0 24px;
    padding: 24px 28px;
    background: linear-gradient(135deg, #1a1208 0%, #3d2b1a 100%);
    border-radius: 16px;
    color: white;
    position: relative;
    overflow: hidden;
  }
  .skin-summary-card::after {
    content: '✦';
    position: absolute; right: 24px; top: 20px;
    font-size: 32px; opacity: 0.1;
  }
  .summary-eyebrow {
    font-size: 10px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--gold); margin-bottom: 8px;
  }
  .summary-text {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 400; line-height: 1.4;
    color: var(--warm-white);
  }
  .confidence-badge {
    display: inline-flex; align-items: center; gap: 6px;
    margin-top: 14px; padding: 6px 12px;
    background: rgba(255,255,255,0.1);
    border-radius: 20px; font-size: 12px; color: rgba(255,255,255,0.7);
  }
  .confidence-dot {
    width: 8px; height: 8px; border-radius: 50%;
  }

  /* SECTION HEADERS */
  .section-header {
    display: flex; align-items: center; gap: 10px;
    margin: 32px 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .section-header h2 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22px; font-weight: 500; color: var(--ink);
  }
  .section-icon { font-size: 20px; }

  /* METRIC CARDS */
  .metrics-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px; margin-bottom: 8px;
  }
  .metric-card {
    padding: 18px 20px;
    background: var(--warm-white);
    border-radius: 14px;
    border: 1px solid var(--border);
    transition: transform 0.2s;
  }
  .metric-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
  .metric-top {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 10px;
  }
  .metric-name {
    font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--muted);
  }
  .metric-badge {
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 500; text-transform: capitalize;
    letter-spacing: 0.5px;
  }
  .metric-bar-track {
    height: 5px; background: var(--border); border-radius: 3px; overflow: hidden;
  }
  .metric-bar-fill {
    height: 100%; border-radius: 3px;
    transition: width 1s ease-out;
  }

  /* ROUTINE CARDS */
  .routine-card {
    background: var(--warm-white); border-radius: 16px;
    border: 1px solid var(--border); overflow: hidden;
    margin-bottom: 16px;
  }
  .routine-header {
    padding: 16px 20px;
    background: linear-gradient(90deg, #fdf5f3, #fff8f6);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .routine-header h3 {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18px; font-weight: 500;
  }
  .routine-steps { padding: 8px 0; }
  .routine-step {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 12px 20px;
    border-bottom: 1px solid #f5f0ea;
    transition: background 0.15s;
  }
  .routine-step:last-child { border-bottom: none; }
  .routine-step:hover { background: #fdf9f5; }
  .step-num {
    min-width: 26px; height: 26px;
    background: var(--rose-light); color: var(--rose-dark);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; flex-shrink: 0; margin-top: 1px;
  }
  .step-text { font-size: 14px; line-height: 1.5; color: var(--ink); }

  /* WEEKLY TREATMENTS */
  .treatment-pill {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; margin-bottom: 8px;
    background: var(--gold-light); border-radius: 10px;
    font-size: 13px; color: #5a4010;
    border-left: 3px solid var(--gold);
  }

  /* INFO CARDS */
  .info-card {
    padding: 18px 20px; border-radius: 14px;
    margin-bottom: 12px; font-size: 14px; line-height: 1.6;
  }
  .info-card strong { display: block; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }

  /* INGREDIENT CHIPS */
  .chips-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .chip {
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 500;
  }
  .chip-green { background: var(--sage-light); color: #2e5e32; }
  .chip-red   { background: #fce4ec; color: #8b1a1a; }

  /* WARNINGS */
  .warning-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 14px 18px; background: #fff8e1;
    border-radius: 10px; border-left: 3px solid var(--gold);
    font-size: 13px; color: #5a4010; margin-bottom: 10px;
  }

  /* BUTTONS */
  .btn-sm {
    padding: 10px 18px; border-radius: 8px; border: 1.5px solid var(--border);
    background: var(--warm-white); font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer; transition: all 0.2s;
  }
  .btn-sm:hover { border-color: var(--rose); color: var(--rose-dark); }
  .btn-primary-sm {
    background: var(--rose); color: white; border-color: var(--rose);
  }
  .btn-primary-sm:hover { background: var(--rose-dark); border-color: var(--rose-dark); color: white; }

  @media (max-width: 520px) {
    .hero { padding: 40px 24px 32px; }
    .hero-title { font-size: 36px; }
    .upload-section, .results { padding-left: 20px; padding-right: 20px; }
    .metrics-grid { grid-template-columns: 1fr; }
    .upload-grid { grid-template-columns: 1fr 1fr; }
  }
`;

export default function App() {
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'image' | 'video'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pendingStreamRef = useRef(null);

  useEffect(() => {
    if (cameraOn && videoRef.current && pendingStreamRef.current) {
      videoRef.current.srcObject = pendingStreamRef.current;
      pendingStreamRef.current = null;
    }
  }, [cameraOn]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      pendingStreamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      alert("Camera access denied: " + err.message);
    }
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
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
      setFileType("image");
      stopCamera();
    }, "image/jpeg");
  };

  const handleAnalyze = async (isVideo = false) => {
    if (!file) return alert("Please select or capture an image first.");
    setLoading(true); setResult(null);
    const endpoint = isVideo ? `${BASE_URL}/api/analyze-video` : ANALYZE_URL;
    const formData = new FormData();
    formData.append("file", file);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        setStatus(`Analyzing… attempt ${attempt}/3 (free tier may take 30–60s)`);
        const res = await axios.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: isVideo ? 300000 : 180000,
        });
        setResult(res.data);
        setStatus("");
        setLoading(false);
        return;
      } catch (err) {
        if (attempt < 3) {
          setStatus(`Attempt ${attempt} timed out. Retrying in 5s…`);
          await new Promise(r => setTimeout(r, 5000));
        } else {
          setLoading(false); setStatus("");
          alert(err.response ? JSON.stringify(err.response.data) : "All attempts failed. Check your connection.");
        }
      }
    }
  };

  const sa = result?.skin_analysis || {};
  const routine = result?.routine || {};
  const conf = sa.confidence ?? 1;
  const confColor = conf >= 0.7 ? "#66bb6a" : conf >= 0.4 ? "#ffca28" : "#ef5350";

  return (
    <>
      <style>{globalStyles}</style>
      <div className="app">

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">AI-Powered · K-Beauty Science</div>
          <h1 className="hero-title">Skin <span>Analysis</span></h1>
          <p className="hero-sub">Personalized skincare for South Asian skin</p>
        </div>

        {/* UPLOAD SECTION */}
        <div className="upload-section">
          <span className="upload-label">Upload or Capture</span>

          <div className="upload-grid">
            {/* Image upload */}
            <label className={`upload-btn ${fileType === "image" && file ? "active" : ""}`}>
              <span className="icon">🖼️</span>
              <span>Photo</span>
              <input type="file" accept="image/*"
                onChange={e => { setFile(e.target.files[0]); setFileType("image"); }} />
            </label>

            {/* Video upload */}
            <label className={`upload-btn ${fileType === "video" && file ? "active" : ""}`}>
              <span className="icon">🎥</span>
              <span>Video</span>
              <input type="file" accept="video/*"
                onChange={e => { setFile(e.target.files[0]); setFileType("video"); }} />
            </label>

            {/* Camera */}
            <button className={`upload-btn ${cameraOn ? "active" : ""}`}
              onClick={cameraOn ? stopCamera : startCamera}>
              <span className="icon">📷</span>
              <span>{cameraOn ? "Close" : "Camera"}</span>
            </button>
          </div>

          {/* Camera view */}
          {cameraOn && (
            <div style={{ marginBottom: 16 }}>
              <div className="camera-view">
                <video ref={videoRef} autoPlay playsInline style={{ width: "100%" }} />
                <div className="camera-overlay" />
              </div>
              <div className="camera-controls">
                <button className="btn-sm btn-primary-sm" onClick={captureImage}>📸 Capture</button>
                <button className="btn-sm" onClick={stopCamera}>✕ Close</button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {file && !cameraOn && (
            <div className="file-ready">
              <span>✅</span>
              <span>{file.name} — ready to analyze</span>
            </div>
          )}

          <button className="analyze-btn" onClick={() => handleAnalyze(fileType === "video")} disabled={loading}>
            {loading
              ? <span className="loading-dots"><span/><span/><span/></span>
              : "✦  ANALYZE MY SKIN"}
          </button>

          {status && <div className="status-bar">{status}</div>}
        </div>

        {/* RESULTS */}
        {result && (
          <div className="results">

            {/* Skin Summary Banner */}
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

            {/* Warnings */}
            {sa.warnings?.length > 0 && sa.warnings.map((w, i) => (
              <div className="warning-banner" key={i}>⚠️ {w}</div>
            ))}

            {/* Metrics */}
            <div className="section-header">
              <span className="section-icon">🔬</span>
              <h2>Skin Metrics</h2>
            </div>
            <div className="metrics-grid">
              {["acne","oiliness","dryness","pigmentation","sensitivity"].map(key => {
                const val = sa[key];
                if (!val) return null;
                const c = COLORS[val] || COLORS.medium;
                return (
                  <div className="metric-card" key={key}>
                    <div className="metric-top">
                      <span className="metric-name">{METRIC_ICONS[key]} {key}</span>
                      <span className="metric-badge" style={{ background: c.bg, color: c.text }}>
                        {val}
                      </span>
                    </div>
                    <div className="metric-bar-track">
                      <div className="metric-bar-fill"
                        style={{ width: `${severityPercent(val)}%`, background: c.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Morning Routine */}
            {routine.morning_routine?.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-icon">🌅</span>
                  <h2>Morning Routine</h2>
                </div>
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

            {/* Night Routine */}
            {routine.night_routine?.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-icon">🌙</span>
                  <h2>Night Routine</h2>
                </div>
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

            {/* Weekly Treatments */}
            {routine.weekly_treatments?.length > 0 && (
              <>
                <div className="section-header">
                  <span className="section-icon">📅</span>
                  <h2>Weekly Treatments</h2>
                </div>
                {routine.weekly_treatments.map((t, i) => (
                  <div className="treatment-pill" key={i}>✦ {t}</div>
                ))}
              </>
            )}

            {/* Natural + Food + Hydration */}
            <div className="section-header">
              <span className="section-icon">🌿</span>
              <h2>Natural Care</h2>
            </div>

            {routine.natural_remedy && (
              <div className="info-card" style={{ background: "#f0fff4", border: "1px solid #c3e6cb" }}>
                <strong style={{ color: "#2e7d32" }}>Natural Remedy</strong>
                {routine.natural_remedy}
              </div>
            )}
            {routine.food && (
              <div className="info-card" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
                <strong style={{ color: "#f57f17" }}>Food Tips</strong>
                {routine.food}
              </div>
            )}
            {routine.hydration && (
              <div className="info-card" style={{ background: "#e3f2fd", border: "1px solid #90caf9" }}>
                <strong style={{ color: "#1565c0" }}>Hydration</strong>
                {routine.hydration}
              </div>
            )}

            {/* Ingredients */}
            {(routine.ingredients_to_use?.length > 0 || routine.ingredients_to_avoid?.length > 0) && (
              <>
                <div className="section-header">
                  <span className="section-icon">🧴</span>
                  <h2>Ingredients Guide</h2>
                </div>
                {routine.ingredients_to_use?.length > 0 && (
                  <div className="info-card" style={{ background: "#d4e8d6", border: "1px solid #c3e6cb", marginBottom: 10 }}>
                    <strong style={{ color: "#2e7d32" }}>✓ Look For</strong>
                    <div className="chips-row">
                      {routine.ingredients_to_use.map((ing, i) => (
                        <span className="chip chip-green" key={i}>{ing}</span>
                      ))}
                    </div>
                  </div>
                )}
                {routine.ingredients_to_avoid?.length > 0 && (
                  <div className="info-card" style={{ background: "#fce4ec", border: "1px solid #f48fb1" }}>
                    <strong style={{ color: "#c62828" }}>✗ Avoid</strong>
                    <div className="chips-row">
                      {routine.ingredients_to_avoid.map((ing, i) => (
                        <span className="chip chip-red" key={i}>{ing}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Note */}
            {routine.note && (
              <div className="info-card" style={{ background: "#fce4ec", border: "1px solid #f48fb1", marginTop: 8 }}>
                <strong style={{ color: "#8b1a1a" }}>📝 Note</strong>
                {routine.note}
              </div>
            )}

            {/* Retake prompt */}
            {sa.retake_required && (
              <div className="warning-banner" style={{ marginTop: 16 }}>
                📷 For better results, retake your photo in natural daylight facing the camera directly.
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}