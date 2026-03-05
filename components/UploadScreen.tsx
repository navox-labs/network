"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Network, FileText, Shield } from "lucide-react";

interface Props {
  onFile: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export default function UploadScreen({ onFile, isLoading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) onFile(file);
    },
    [onFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      background: "radial-gradient(ellipse at 50% 0%, rgba(79,142,247,0.08) 0%, var(--bg) 60%)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          padding: "6px 16px",
          background: "rgba(79,142,247,0.1)",
          border: "1px solid rgba(79,142,247,0.2)",
          borderRadius: 20,
        }}>
          <Network size={14} color="var(--accent)" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", letterSpacing: "0.06em" }}>
            NAVOX INTELLIGENCE
          </span>
        </div>

        <h1 style={{
          fontSize: 42,
          fontWeight: 300,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          marginBottom: 12,
        }}>
          Map your invisible<br />
          <span style={{ color: "var(--accent)", fontWeight: 500 }}>professional network</span>
        </h1>

        <p style={{
          maxWidth: 480,
          margin: "0 auto",
          color: "var(--text-secondary)",
          fontSize: 15,
          lineHeight: 1.6,
        }}>
          Upload your LinkedIn connections CSV to visualize your network graph,
          identify gaps in your bridging capital, and find your side door
          into target companies.
        </p>
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone ${isDragging ? "drag-over" : ""}`}
        style={{
          width: "100%",
          maxWidth: 520,
          padding: "48px 40px",
          textAlign: "center",
          marginBottom: 24,
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleChange}
        />

        {isLoading ? (
          <div>
            <div className="pulse" style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "var(--accent-glow)",
              border: "2px solid var(--accent-dim)",
              margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Network size={20} color="var(--accent)" />
            </div>
            <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              Parsing connections…
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "var(--bg-hover)",
              border: "1px solid var(--border-hi)",
              margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Upload size={22} color="var(--text-secondary)" />
            </div>
            <p style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
              Drop your Connections.csv here
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              or click to browse
            </p>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          maxWidth: 520, width: "100%",
          padding: "12px 16px",
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 8,
          color: "var(--critical)",
          fontSize: 13,
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {/* How to export */}
      <div style={{
        maxWidth: 520, width: "100%",
        padding: "20px 24px",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        marginBottom: 24,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginBottom: 14,
          color: "var(--text-secondary)",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          <FileText size={12} />
          HOW TO EXPORT FROM LINKEDIN
        </div>
        {[
          "Go to LinkedIn → Settings → Data Privacy",
          'Click "Get a copy of your data"',
          'Select "Connections" only',
          "Request archive → download when ready (up to 24h)",
          'Upload Connections.csv here',
        ].map((step, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, marginBottom: 8,
            color: "var(--text-secondary)", fontSize: 13,
          }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 11,
              color: "var(--accent)", minWidth: 18, paddingTop: 1,
            }}>
              {i + 1}.
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>

      {/* Privacy note */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "var(--text-muted)", fontSize: 12,
      }}>
        <Shield size={12} />
        <span>Your data never leaves your browser. No server upload. No LinkedIn access.</span>
      </div>
    </div>
  );
}
