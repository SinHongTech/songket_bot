import logoImg from "../../shared/assets/Logo.svg";

interface LogoSplashProps {
  compact?: boolean;
}

/* Small blip dot that travels with its parent ring */
function Blip({ style, cls = "splash-blip" }: { style: React.CSSProperties; cls?: string }) {
  return (
    <div
      className={cls}
      style={{
        position: "absolute",
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: "#D4A72C",
        boxShadow: "0 0 8px #D4A72C, 0 0 16px rgba(212,167,44,0.5)",
        ...style,
      }}
    />
  );
}

/* Tick line — a short line on the ring */
function Tick({ style }: { style: React.CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        width: 2,
        height: 14,
        background: "rgba(212,167,44,0.8)",
        borderRadius: 2,
        ...style,
      }}
    />
  );
}

export default function LogoSplash({ compact = false }: LogoSplashProps) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: compact ? 0 : "100vh",
        paddingTop: compact ? 40 : 0,
        paddingBottom: compact ? 40 : 0,
        background: compact ? "transparent" : "#060400",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 24 : 36,
        overflow: "hidden",
      }}
    >
      {/* Orbit root — all rings + logo share this 420×420 relative container */}
      <div style={{ position: "relative", width: 420, height: 272 }}>

        {/* Ambient radial background glow */}
        <div
          className="splash-bg-glow"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(circle at center, rgba(212,167,44,0.12) 0%, rgba(212,167,44,0.04) 45%, transparent 72%)",
          }}
        />

        {/* Ping ring — expands outward from logo center */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="splash-ping"
            style={{
              width: 170,
              height: 170,
              borderRadius: "50%",
              border: "2px solid rgba(212,167,44,0.55)",
            }}
          />
        </div>

        {/* ── Outer ring (360px) — slow CW ── */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            className="splash-orbit-cw-12"
            style={{
              width: 368,
              height: 368,
              borderRadius: "50%",
              border: "1px dashed rgba(212,167,44,0.28)",
              position: "relative",
            }}
          >
            {/* Blips at N / E / S / W */}
            <Blip cls="splash-blip"   style={{ top: 3, left: "calc(50% - 5px)" }} />
            <Blip cls="splash-blip-b" style={{ top: "calc(50% - 5px)", right: 3 }} />
            <Blip cls="splash-blip-c" style={{ bottom: 3, left: "calc(50% - 5px)" }} />
            <Blip cls="splash-blip"   style={{ top: "calc(50% - 5px)", left: 3 }} />
            {/* Ticks at 45° positions (approximated) */}
            <Tick style={{ top: "13%", left: "13%", rotate: "45deg" }} />
            <Tick style={{ top: "13%", right: "13%", rotate: "-45deg" }} />
            <Tick style={{ bottom: "13%", right: "13%", rotate: "45deg" }} />
            <Tick style={{ bottom: "13%", left: "13%", rotate: "-45deg" }} />
          </div>
        </div>

        {/* ── Mid ring (285px) — medium CCW ── */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            className="splash-orbit-ccw-9"
            style={{
              width: 285,
              height: 285,
              borderRadius: "50%",
              border: "1.5px dotted rgba(212,167,44,0.22)",
              position: "relative",
            }}
          >
            <Blip cls="splash-blip-b" style={{ top: 3, left: "calc(50% - 5px)" }} />
            <Blip cls="splash-blip-c" style={{ bottom: 3, left: "calc(50% - 5px)" }} />
            {/* Arc highlight — a solid short arc segment */}
            <div
              style={{
                position: "absolute",
                top: 3,
                right: "15%",
                width: 50,
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(212,167,44,0.6), transparent)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* ── Inner ring (210px) — fast CW ── */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            className="splash-orbit-cw-5"
            style={{
              width: 210,
              height: 210,
              borderRadius: "50%",
              border: "1px solid rgba(212,167,44,0.18)",
              position: "relative",
            }}
          >
            {/* Single bright blip */}
            <Blip cls="splash-blip-c" style={{ top: 3, left: "calc(50% - 5px)", width: 8, height: 8 }} />
            {/* Counter-mark */}
            <div
              style={{
                position: "absolute",
                bottom: 3,
                right: "25%",
                width: 24,
                height: 1.5,
                background: "rgba(212,167,44,0.5)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* ── Logo — centered, animates in/float/out ── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <div
            className="splash-logo-in splash-glow-pulse"
            style={{
              width: 160,
              height: 160,
              borderRadius: 32,
              overflow: "hidden",
              position: "relative",
              background: "#f5e9c4",
              border: "2px solid rgba(212,167,44,0.5)",
            }}
          >
            <img
              src={logoImg}
              alt="Songket Bot"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* Scan sweep line */}
            <div
              className="splash-scan-v"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 3,
                background: "linear-gradient(90deg, transparent 0%, rgba(212,167,44,0.85) 30%, rgba(255,230,100,0.95) 50%, rgba(212,167,44,0.85) 70%, transparent 100%)",
                boxShadow: "0 0 12px rgba(212,167,44,0.9), 0 0 24px rgba(212,167,44,0.4)",
                borderRadius: 2,
                pointerEvents: "none",
              }}
            />
            {/* Corner scan brackets */}
            <div style={{ position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTop: "2px solid rgba(212,167,44,0.7)", borderLeft: "2px solid rgba(212,167,44,0.7)", borderRadius: "2px 0 0 0" }} />
            <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTop: "2px solid rgba(212,167,44,0.7)", borderRight: "2px solid rgba(212,167,44,0.7)", borderRadius: "0 2px 0 0" }} />
            <div style={{ position: "absolute", bottom: 8, left: 8, width: 16, height: 16, borderBottom: "2px solid rgba(212,167,44,0.7)", borderLeft: "2px solid rgba(212,167,44,0.7)", borderRadius: "0 0 0 2px" }} />
            <div style={{ position: "absolute", bottom: 8, right: 8, width: 16, height: 16, borderBottom: "2px solid rgba(212,167,44,0.7)", borderRight: "2px solid rgba(212,167,44,0.7)", borderRadius: "0 0 2px 0" }} />
          </div>
        </div>


      </div>{/* end orbit root */}

      {/* ── Brand text below ── */}
      <div
        className="splash-text-in"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 1, background: "rgba(212,167,44,0.35)" }} />
          <span style={{ fontFamily: "Kantumruy Pro, sans-serif", fontSize: 22, fontWeight: 700, color: "#D4A72C", letterSpacing: "0.02em" }}>
            សង្កេត
          </span>
          <span style={{ fontFamily: "Outfit, sans-serif", fontSize: 18, fontWeight: 600, color: "rgba(212,167,44,0.7)", letterSpacing: "0.04em" }}>
            Bot
          </span>
          <div style={{ width: 28, height: 1, background: "rgba(212,167,44,0.35)" }} />
        </div>

        {/* Scanning status */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className="dot-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#2aaa5a" }} />
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(212,167,44,0.55)", letterSpacing: "0.12em" }}>
            SCANNING
          </span>
          <span className="splash-ellipsis-1" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(212,167,44,0.55)" }}>.</span>
          <span className="splash-ellipsis-2" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(212,167,44,0.55)" }}>.</span>
          <span className="splash-ellipsis-3" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "rgba(212,167,44,0.55)" }}>.</span>
        </div>
      </div>

    </div>
  );
}
