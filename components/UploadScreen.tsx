"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Network, FileText, Shield } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  isLoading: boolean;
  error: string | null;
  parsingStage?: string | null;
}

/**
 * Recursively read all files from FileSystemEntry items (directories and files).
 * Used when a folder is dropped onto the upload zone via drag and drop.
 */
async function readEntriesRecursively(entries: FileSystemEntry[]): Promise<File[]> {
  const files: File[] = [];

  const readEntry = (entry: FileSystemEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file(
          (file) => { files.push(file); resolve(); },
          (err) => reject(err)
        );
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const readBatch = () => {
          reader.readEntries(
            async (batch) => {
              if (batch.length === 0) {
                resolve();
                return;
              }
              for (const child of batch) {
                await readEntry(child);
              }
              // readEntries may return partial results; keep reading until empty
              readBatch();
            },
            (err) => reject(err)
          );
        };
        readBatch();
      } else {
        resolve();
      }
    });
  };

  for (const entry of entries) {
    await readEntry(entry);
  }

  return files;
}

export default function UploadScreen({ onFiles, isLoading, error, parsingStage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    // Check if any item is a directory using webkitGetAsEntry
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    const hasDirectory = entries.some(e => e.isDirectory);

    if (hasDirectory && entries.length > 0) {
      // Recursively read directory contents
      const files = await readEntriesRecursively(entries);
      if (files.length > 0) onFiles(files);
    } else if (entries.length > 0) {
      // Has entries but no directories — read files from entries
      const files = await readEntriesRecursively(entries);
      if (files.length > 0) onFiles(files);
    } else {
      // Fallback: webkitGetAsEntry not available
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    }
  }, [onFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFiles(Array.from(files));
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "radial-gradient(ellipse at 50% 0%, rgba(108,75,244,0.06) 0%, var(--bg) 60%)",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          padding: "6px 16px",
          background: "rgba(108,75,244,0.08)",
          border: "1px solid rgba(108,75,244,0.15)",
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
          Upload your LinkedIn data export to visualize your network graph,
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
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* File input for individual files */}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.zip"
          multiple
          style={{ display: "none" }}
          onChange={handleChange}
        />
        {/* Folder input for directory selection */}
        <input
          ref={folderInputRef}
          type="file"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...{ webkitdirectory: "" } as any}
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
              {parsingStage || "Parsing connections..."}
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
              Drop your LinkedIn zip, folder, or files here
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "5px 14px" }}
              >
                Browse Files
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "5px 14px" }}
              >
                Browse Folder
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          maxWidth: 520, width: "100%",
          padding: "12px 16px",
          background: "rgba(220,38,38,0.06)",
          border: "1px solid rgba(220,38,38,0.15)",
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
          "Go to LinkedIn Settings → Data Privacy",
          'Click "Get a copy of your data"',
          "Select Basic export (ready in 10 minutes)",
          "Download the zip when LinkedIn emails you",
          "Drop the zip, folder, or any files here — we handle the rest",
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

      {/* ProductHunt badges */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", margin: "16px 0" }}>
        <a href="https://www.producthunt.com/products/navox-network?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
          <img alt="Navox Network on Product Hunt" width={250} height={54} src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1101940&theme=light" />
        </a>
        <a href="https://www.producthunt.com/products/navox-network/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
          <img alt="Review Navox Network on Product Hunt" width={250} height={54} src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1101940&theme=light" />
        </a>
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
