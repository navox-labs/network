"use client";

import { useState, useEffect } from "react";

interface Props {
  onClick: () => void;
  hasNotification: boolean;
  panelOpen: boolean;
}

export default function CoachBubble({ onClick, hasNotification, panelOpen }: Props) {
  const [showLabel, setShowLabel] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    const wasSeen = localStorage.getItem("navox-coach-seen");
    if (!wasSeen) {
      setSeen(false);
      setShowLabel(true);
    }
  }, []);

  useEffect(() => {
    if (seen) return;
    const timer = setTimeout(() => {
      if (!panelOpen) setShowTooltip(true);
    }, 60000);
    return () => clearTimeout(timer);
  }, [seen, panelOpen]);

  const handleClick = () => {
    localStorage.setItem("navox-coach-seen", "true");
    setSeen(true);
    setShowLabel(false);
    setShowTooltip(false);
    onClick();
  };

  if (panelOpen) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500 }}>
      {showTooltip && !seen && (
        <div style={{
          position: "absolute", bottom: 68, right: 0,
          background: "var(--bg-panel)", border: "1px solid var(--border-hi)",
          borderRadius: 10, padding: "10px 14px", fontSize: 13,
          color: "var(--text-primary)", boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          whiteSpace: "nowrap", animation: "coachSlideUp 0.3s ease",
        }}>
          Ready to turn this graph into a job search strategy?
        </div>
      )}

      {showLabel && !seen && (
        <div style={{
          position: "absolute", bottom: 14, right: 68,
          background: "var(--accent)", color: "#fff",
          padding: "6px 14px", borderRadius: 8, fontSize: 12,
          fontWeight: 500, whiteSpace: "nowrap", animation: "coachFadeIn 0.5s ease",
        }}>
          Meet your Network Coach
        </div>
      )}

      <button
        onClick={handleClick}
        style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--accent)", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, boxShadow: "0 4px 20px rgba(108, 75, 244, 0.35)",
          animation: !seen ? "coachPulse 2s infinite" : "none",
          transition: "transform 0.15s", position: "relative",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        🧠
        {hasNotification && (
          <div style={{
            position: "absolute", top: 2, right: 2,
            width: 12, height: 12, borderRadius: "50%",
            background: "var(--critical)", border: "2px solid var(--bg)",
          }} />
        )}
      </button>
    </div>
  );
}
