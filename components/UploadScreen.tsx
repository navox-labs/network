"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Upload,
  Network,
  FileText,
  Shield,
  ShieldCheck,
  Mail,
  Sparkles,
  BarChart3,
  MessageSquare,
  Users,
  Zap,
  Check,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  Globe,
} from "lucide-react";

export type SourceType = "linkedin" | "generic";

interface Props {
  onFiles: (files: File[], sourceType: SourceType) => void;
  isLoading: boolean;
  error: string | null;
  parsingStage?: string | null;
}

/* ── File-system helpers (preserved exactly) ─────────────────────────── */

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
              if (batch.length === 0) { resolve(); return; }
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

/* ── Component ───────────────────────────────────────────────────────── */

export default function UploadScreen({ onFiles, isLoading, error, parsingStage }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("linkedin");
  const [showHowTo, setShowHowTo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "hidden"; };
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    const files = entries.length > 0
      ? await readEntriesRecursively(entries)
      : Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files, sourceType);
  }, [onFiles, sourceType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onFiles(Array.from(files), sourceType);
    e.target.value = "";
  };

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: "var(--bg)" }}>

      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="relative pt-20 pb-20 px-4 text-center overflow-hidden">
        {/* Background gradient orbs */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 600px 400px at 50% 0%, rgba(108,75,244,0.07) 0%, transparent 70%), " +
              "radial-gradient(ellipse 400px 300px at 80% 60%, rgba(108,75,244,0.04) 0%, transparent 70%), " +
              "radial-gradient(ellipse 300px 300px at 20% 80%, rgba(22,163,107,0.03) 0%, transparent 70%)"
          }}
        />

        {/* Badge */}
        <div className={`relative inline-flex items-center gap-2.5 mb-8 px-5 py-2 rounded-full border transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`} style={{
          background: "rgba(108,75,244,0.06)",
          borderColor: "rgba(108,75,244,0.12)"
        }}>
          <Network size={14} style={{ color: "var(--accent)" }} />
          <span className="font-mono text-xs tracking-widest" style={{ color: "var(--accent)" }}>NAVOX NETWORK</span>
        </div>

        {/* Headline */}
        <h1 className={`relative text-4xl md:text-6xl font-light tracking-tight leading-[1.08] mb-6 transition-all duration-700 delay-100 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`} style={{ color: "var(--text-primary)" }}>
          Your network is your
          <br />
          <span className="font-semibold" style={{
            background: "linear-gradient(135deg, #6c4bf4 0%, #8b5cf6 50%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            unfair advantage
          </span>
        </h1>

        {/* Subheadline */}
        <p className={`relative max-w-xl mx-auto text-base md:text-lg leading-relaxed mb-10 transition-all duration-700 delay-200 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`} style={{ color: "var(--text-secondary)" }}>
          Map hidden connections. Surface untapped relationships.
          <br className="hidden md:block" />
          Draft personalized outreach. All without your data ever leaving your browser.
        </p>

        {/* CTA */}
        <div className={`relative flex flex-col sm:flex-row gap-3 justify-center items-center transition-all duration-700 delay-300 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}>
          <a
            href="#get-started"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-medium text-sm text-white no-underline transition-all hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #6c4bf4 0%, #7c5ce8 100%)",
              boxShadow: "0 4px 24px rgba(108,75,244,0.25)"
            }}
          >
            Get Started Free
            <ArrowDown size={16} />
          </a>
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            No account required
          </span>
        </div>
      </section>

      {/* ================================================================
          TRUST BAR
          ================================================================ */}
      <section className="py-5 px-4" style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-panel)"
      }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
          {[
            { icon: <Lock size={18} />, label: "100% browser-side", sub: "Nothing uploaded to any server" },
            { icon: <EyeOff size={18} />, label: "Zero data collection", sub: "We literally can't see your data" },
            { icon: <Cpu size={18} />, label: "11,000+ connections", sub: "Tested at scale, no limits" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="shrink-0" style={{ color: "var(--strong)" }}>{item.icon}</div>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          HOW IT WORKS — 3 IMPORT SOURCES
          ================================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
              MULTI-SOURCE INGESTION
            </span>
            <h2 className="text-2xl md:text-3xl font-light" style={{ color: "var(--text-primary)" }}>
              Three ways to map your network
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
              Start free with LinkedIn. Unlock Gmail and manual imports with a license.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* LinkedIn */}
            <div className="group relative p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5" style={{
              border: "1px solid var(--border)",
              background: "var(--bg-panel)"
            }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                background: "rgba(108,75,244,0.08)",
                border: "1px solid rgba(108,75,244,0.15)"
              }}>
                <FileText size={20} style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>LinkedIn Export</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                Drop your LinkedIn data export. We parse connections, messages, endorsements, and recommendations automatically.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md" style={{
                background: "rgba(22,163,107,0.08)",
                color: "var(--strong)"
              }}>
                <Check size={12} /> Free forever
              </span>
            </div>

            {/* Gmail */}
            <div className="group relative p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5" style={{
              border: "1px solid var(--border)",
              background: "var(--bg-panel)"
            }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                background: "rgba(108,75,244,0.08)",
                border: "1px solid rgba(108,75,244,0.15)"
              }}>
                <Mail size={20} style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Gmail Connect</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                Surface people you email but aren&apos;t connected to on LinkedIn. Your hidden network, revealed.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md" style={{
                background: "rgba(108,75,244,0.08)",
                color: "var(--accent)"
              }}>
                <Zap size={12} /> Licensed
              </span>
            </div>

            {/* Manual / Generic */}
            <div className="group relative p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5" style={{
              border: "1px solid var(--border)",
              background: "var(--bg-panel)"
            }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                background: "rgba(108,75,244,0.08)",
                border: "1px solid rgba(108,75,244,0.15)"
              }}>
                <Users size={20} style={{ color: "var(--accent)" }} />
              </div>
              <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Manual & CSV</h3>
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                Import from any CRM or ATS. We auto-detect common CSV column formats. Add contacts manually too.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md" style={{
                background: "rgba(108,75,244,0.08)",
                color: "var(--accent)"
              }}>
                <Zap size={12} /> Licensed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES — 4 CARDS
          ================================================================ */}
      <section className="py-20 px-4" style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-panel)"
      }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
              POWERED BY NETWORK SCIENCE
            </span>
            <h2 className="text-2xl md:text-3xl font-light" style={{ color: "var(--text-primary)" }}>
              Not guesswork. Peer-reviewed research.
            </h2>
            <p className="mt-2 text-sm max-w-lg mx-auto" style={{ color: "var(--text-muted)" }}>
              Built on Granovetter&apos;s weak ties theory and Rajkumar et al. (2022). Every score is backed by science.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                icon: <BarChart3 size={20} />,
                title: "Tie Strength Analysis",
                desc: "Multi-signal scoring: recency, frequency, reciprocity, endorsements. See exactly how strong each relationship is.",
              },
              {
                icon: <Sparkles size={20} />,
                title: "AI Draft Messages",
                desc: "Generate outreach in your voice. Paste a writing sample and the AI matches your tone, not a template.",
              },
              {
                icon: <Globe size={20} />,
                title: "Latent Tie Detection",
                desc: "Cross-reference LinkedIn and Gmail to find people you email but aren't connected to. Your hidden network.",
              },
              {
                icon: <Zap size={20} />,
                title: "Activation Queue",
                desc: "Prioritized outreach ranked by bridging potential. Weak ties in rare industry clusters surface first.",
              },
            ].map((feat) => (
              <div key={feat.title} className="flex gap-5 p-6 rounded-2xl transition-all duration-200 hover:-translate-y-0.5" style={{
                border: "1px solid var(--border)",
                background: "var(--bg)"
              }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: "rgba(108,75,244,0.08)",
                  border: "1px solid rgba(108,75,244,0.15)",
                  color: "var(--accent)"
                }}>
                  {feat.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{feat.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          PRICING — FREE vs LICENSED
          ================================================================ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block font-mono text-xs tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
              SIMPLE PRICING
            </span>
            <h2 className="text-2xl md:text-3xl font-light" style={{ color: "var(--text-primary)" }}>
              Free to visualize. Licensed to activate.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Free tier */}
            <div className="p-7 rounded-2xl" style={{
              border: "1px solid var(--border)",
              background: "var(--bg-panel)"
            }}>
              <div className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>Free</div>
              <div className="text-3xl font-light mb-5" style={{ color: "var(--text-primary)" }}>
                $0
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>/forever</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Interactive network graph",
                  "Tie strength analysis",
                  "Industry cluster mapping",
                  "Gap analysis & bridge detection",
                  "LinkedIn CSV import",
                  "Unlimited connections",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check size={15} className="shrink-0 mt-0.5" style={{ color: "var(--strong)" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Licensed tier */}
            <div className="relative p-7 rounded-2xl" style={{
              border: "2px solid var(--accent)",
              background: "var(--bg-panel)",
              boxShadow: "0 0 40px rgba(108,75,244,0.08)"
            }}>
              <div className="absolute -top-3.5 left-7 px-4 py-1 text-white text-xs font-mono rounded-full tracking-wide" style={{
                background: "linear-gradient(135deg, #6c4bf4 0%, #7c5ce8 100%)"
              }}>
                RECOMMENDED
              </div>
              <div className="font-mono text-xs tracking-widest uppercase mb-1" style={{ color: "var(--accent)" }}>Licensed</div>
              <div className="text-3xl font-light mb-5" style={{ color: "var(--text-primary)" }}>
                $39
                <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>/mo</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Everything in Free",
                  "AI-powered outreach drafts",
                  "Voice-personalized messaging",
                  "Gmail import & latent ties",
                  "Generic CSV & manual entry",
                  "Status tracking & notes",
                  "Outreach queue with priorities",
                  "AI coaching assistant",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Check size={15} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          UPLOAD ZONE
          ================================================================ */}
      <section id="get-started" className="py-20 px-4" style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-panel)"
      }}>
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full" style={{
            background: "rgba(22,163,107,0.08)",
            border: "1px solid rgba(22,163,107,0.15)"
          }}>
            <Shield size={14} style={{ color: "var(--strong)" }} />
            <span className="font-mono text-xs" style={{ color: "var(--strong)" }}>Your data stays in your browser</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-light mb-2" style={{ color: "var(--text-primary)" }}>
            Start with your LinkedIn export
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Free, no account needed. Upload and see your network graph in seconds.
          </p>

          {/* Source toggle */}
          <div className="inline-flex rounded-xl overflow-hidden mb-8" style={{
            background: "var(--bg)",
            border: "1px solid var(--border)"
          }}>
            {([
              { id: "linkedin" as SourceType, label: "LinkedIn CSV" },
              { id: "generic" as SourceType, label: "Generic CSV" },
            ]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSourceType(opt.id)}
                className={`px-5 py-2 text-xs font-mono tracking-wide cursor-pointer border-none transition-all ${
                  sourceType === opt.id
                    ? "text-white font-semibold"
                    : "bg-transparent hover:opacity-80"
                }`}
                style={sourceType === opt.id
                  ? { background: "var(--accent)" }
                  : { color: "var(--text-muted)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Upload zone */}
          <div
            className={`upload-zone ${isDragging ? "drag-over" : ""} w-full p-10 md:p-14 text-center mb-5 rounded-2xl`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".csv,.zip" multiple className="hidden" onChange={handleChange} />
            <input ref={folderInputRef} type="file" {...{ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>} className="hidden" onChange={handleChange} />

            {isLoading ? (
              <div>
                <div className="pulse w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{
                  background: "var(--accent-glow)",
                  border: "2px solid var(--accent-dim)"
                }}>
                  <Network size={22} style={{ color: "var(--accent)" }} />
                </div>
                <p className="font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
                  {parsingStage || "Parsing connections..."}
                </p>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border-hi)"
                }}>
                  <Upload size={24} style={{ color: "var(--text-secondary)" }} />
                </div>
                <p className="text-base font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>
                  {sourceType === "linkedin"
                    ? "Drop your LinkedIn zip, folder, or CSV here"
                    : "Drop your contacts CSV file here"}
                </p>
                <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                  {sourceType === "linkedin"
                    ? "We accept .zip exports, extracted folders, or individual .csv files"
                    : "We auto-detect columns like first name, last name, email, company, position"}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="btn btn-primary text-xs px-5 py-2"
                  >
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                    className="btn btn-ghost text-xs px-5 py-2"
                  >
                    Browse Folder
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="w-full px-4 py-3 rounded-xl text-sm mb-5 text-left" style={{
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.15)",
              color: "var(--critical)"
            }}>
              {error}
            </div>
          )}

          {/* Collapsible how-to */}
          <button
            onClick={() => setShowHowTo(!showHowTo)}
            className="flex items-center gap-1.5 mx-auto text-xs font-mono bg-transparent border-none cursor-pointer transition-colors hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronDown size={14} className={`transition-transform duration-200 ${showHowTo ? "rotate-180" : ""}`} />
            {sourceType === "linkedin" ? "How to export from LinkedIn" : "CSV format guide"}
          </button>

          {showHowTo && (
            <div className="mt-5 p-6 rounded-2xl text-left fade-in" style={{
              background: "var(--bg)",
              border: "1px solid var(--border)"
            }}>
              {(sourceType === "linkedin"
                ? [
                    "Go to LinkedIn Settings -> Data Privacy",
                    'Click "Get a copy of your data"',
                    "Select Basic export (ready in ~10 minutes)",
                    "Download the zip when LinkedIn emails you",
                    "Drop the zip here -- we handle the rest",
                  ]
                : [
                    'Include columns like "First Name", "Last Name", "Email", "Company", "Position"',
                    "Header names are flexible -- we recognize common variants automatically",
                    "At least 2 contact columns (e.g., name + email) are required",
                    "Save as .csv (UTF-8) and drop it above",
                  ]
              ).map((step, i) => (
                <div key={i} className="flex gap-3 mb-2.5 last:mb-0 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-mono text-xs min-w-[22px] pt-px" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="py-10 px-4 text-center" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex gap-4 flex-wrap justify-center mb-8">
          <a href="https://www.producthunt.com/products/navox-network?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1101940&theme=light" className="block" />
          </a>
          <a href="https://www.producthunt.com/products/navox-network/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_campaign=badge-navox-network" target="_blank" rel="noopener noreferrer">
            <img alt="Review Navox Network on Product Hunt" width={200} height={43} src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1101940&theme=light" className="block" />
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <ShieldCheck size={13} />
          <span>Your data never leaves your browser. No server upload. No LinkedIn access. Privacy is the product.</span>
        </div>
      </footer>
    </div>
  );
}
