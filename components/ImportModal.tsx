"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  Mail,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ImportSourceType = "linkedin" | "generic" | "gmail" | "manual";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFiles: (files: File[], sourceType: "linkedin" | "generic") => void;
  onAddManual: () => void;
  isLoading: boolean;
  error: string | null;
  parsingStage: string | null;
}

/* ── File-system helpers ───────────────────────────────────────────── */

async function readEntriesRecursively(
  entries: FileSystemEntry[]
): Promise<File[]> {
  const files: File[] = [];
  const readEntry = (entry: FileSystemEntry): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file(
          (file) => {
            files.push(file);
            resolve();
          },
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
              for (const child of batch) await readEntry(child);
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
  for (const entry of entries) await readEntry(entry);
  return files;
}

/* ── Tab definitions ───────────────────────────────────────────────── */

const TABS: { id: ImportSourceType; label: string; icon: typeof Upload }[] = [
  { id: "linkedin", label: "LinkedIn CSV", icon: Upload },
  { id: "generic", label: "Generic CSV", icon: FileText },
  { id: "gmail", label: "Gmail", icon: Mail },
  { id: "manual", label: "Manual", icon: UserPlus },
];

/* ── Component ─────────────────────────────────────────────────────── */

export default function ImportModal({
  isOpen,
  onClose,
  onFiles,
  onAddManual,
  isLoading,
  error,
  parsingStage,
}: ImportModalProps) {
  const [activeSource, setActiveSource] = useState<ImportSourceType>("linkedin");
  const [isDragging, setIsDragging] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const linkedinFileRef = useRef<HTMLInputElement>(null);
  const linkedinFolderRef = useRef<HTMLInputElement>(null);
  const genericFileRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDragging(false);
      setShowHowTo(false);
    }
  }, [isOpen]);

  /* ── Drag-and-drop handlers ────────────────────────────────────── */

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, sourceType: "linkedin" | "generic") => {
      e.preventDefault();
      setIsDragging(false);
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      const files =
        entries.length > 0
          ? await readEntriesRecursively(entries)
          : Array.from(e.dataTransfer.files);

      if (files.length > 0) onFiles(files, sourceType);
    },
    [onFiles]
  );

  /* ── File input handlers ───────────────────────────────────────── */

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, sourceType: "linkedin" | "generic") => {
      const files = e.target.files;
      if (files && files.length > 0) onFiles(Array.from(files), sourceType);
      e.target.value = "";
    },
    [onFiles]
  );

  if (!isOpen) return null;

  /* ── Tab content renderers ─────────────────────────────────────── */

  const renderLinkedInTab = () => (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "linkedin")}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-dim)]"
            : "border-[var(--border)] hover:border-[var(--border-hi)]"
        }`}
      >
        <Upload size={24} className="text-[var(--text-muted)]" />
        <p className="text-sm text-center text-[var(--text-secondary)]">
          Drop your LinkedIn zip, folder, or CSV here
        </p>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => linkedinFileRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            Browse Files
          </button>
          <button
            type="button"
            onClick={() => linkedinFolderRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Browse Folder
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={linkedinFileRef}
        type="file"
        accept=".csv,.zip"
        multiple
        className="hidden"
        onChange={(e) => handleFileChange(e, "linkedin")}
      />
      <input
        ref={linkedinFolderRef}
        type="file"
        // @ts-expect-error -- webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        className="hidden"
        onChange={(e) => handleFileChange(e, "linkedin")}
      />

      {/* Collapsible how-to */}
      <button
        type="button"
        onClick={() => setShowHowTo(!showHowTo)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {showHowTo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        How to export from LinkedIn
      </button>
      {showHowTo && (
        <ol className="text-xs text-[var(--text-muted)] space-y-1.5 pl-4 list-decimal">
          <li>Go to LinkedIn Settings &amp; Privacy</li>
          <li>Select &quot;Get a copy of your data&quot;</li>
          <li>Choose &quot;Connections&quot; (and optionally Messages, Endorsements, etc.)</li>
          <li>Request the archive -- LinkedIn emails you when it is ready</li>
          <li>Download the .zip and drop it here</li>
        </ol>
      )}
    </div>
  );

  const renderGenericTab = () => (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, "generic")}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent-dim)]"
            : "border-[var(--border)] hover:border-[var(--border-hi)]"
        }`}
      >
        <FileText size={24} className="text-[var(--text-muted)]" />
        <p className="text-sm text-center text-[var(--text-secondary)]">
          Drop your contacts CSV file here
        </p>
        <button
          type="button"
          onClick={() => genericFileRef.current?.click()}
          className="mt-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          Browse Files
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={genericFileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFileChange(e, "generic")}
      />

      <p className="text-xs text-[var(--text-muted)]">
        We auto-detect columns like first name, last name, email, company, position.
      </p>
    </div>
  );

  const renderGmailTab = () => (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-hover)]">
        <Mail size={24} className="text-[var(--text-muted)]" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Connect Gmail
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Surface people you email but are not connected to on LinkedIn.
          Discover latent ties hiding in your inbox.
        </p>
      </div>
      <span className="inline-block px-3 py-1 text-xs font-mono rounded-full border border-[var(--border)] text-[var(--text-muted)]">
        Coming soon
      </span>
    </div>
  );

  const renderManualTab = () => (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--bg-hover)]">
        <UserPlus size={24} className="text-[var(--text-muted)]" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Add contacts manually
        </p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Add individual contacts by entering their details directly.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddManual}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
      >
        Add Contact
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeSource) {
      case "linkedin":
        return renderLinkedInTab();
      case "generic":
        return renderGenericTab();
      case "gmail":
        return renderGmailTab();
      case "manual":
        return renderManualTab();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      />

      {/* Modal card */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[501] w-[min(520px,calc(100vw-32px))] max-h-[min(90vh,680px)] overflow-y-auto bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-[fadeIn_0.2s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--bg-panel)]">
          <span className="font-mono text-xs text-[var(--text-primary)] tracking-wide">
            Import Contacts
          </span>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 leading-none flex items-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Source tabs */}
        <div className="grid grid-cols-4 border-b border-[var(--border)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSource === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSource(tab.id)}
                className={`flex flex-col items-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  isActive
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="text-[var(--accent)] animate-spin" />
              {parsingStage && (
                <p className="text-sm text-[var(--text-secondary)] font-mono">
                  {parsingStage}
                </p>
              )}
            </div>
          ) : (
            renderTabContent()
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="mt-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
