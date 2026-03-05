"use client";

import { useState, useMemo } from "react";
import { Search, ExternalLink, ArrowRight, Building2 } from "lucide-react";
import { searchByCompany, type Connection } from "@/lib/tieStrength";

interface Props {
  connections: Connection[];
  onHighlight: (ids: Set<string>) => void;
  onSelectNode: (c: Connection) => void;
  onSwitchToGraph: () => void;
}

export default function CompanySearch({ connections, onHighlight, onSelectNode, onSwitchToGraph }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    return searchByCompany(connections, query);
  }, [connections, query]);

  const handleSelect = (conn: Connection) => {
    onSelectNode(conn);
    onHighlight(new Set([conn.id]));
    onSwitchToGraph();
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      onHighlight(new Set());
      return;
    }
    const ids = new Set(results.map(r => r.connection.id));
    onHighlight(ids);
  };

  // Top companies from network
  const topCompanies = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of connections) {
      if (c.company) counts[c.company] = (counts[c.company] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [connections]);

  return (
    <div style={{ height: "100%", overflow: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Company Search
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Find your "side door" into any company. Type a company name to see all connections at or near it,
          ranked by tie strength and activation priority.
        </p>
      </div>

      {/* Search box */}
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
        />
        <input
          type="search"
          placeholder="Search company, role, or name…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ paddingLeft: 38, fontSize: 14 }}
          autoFocus
        />
      </div>

      {/* Quick company chips */}
      {!query && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 10 }}>
            Your top companies
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topCompanies.map(([company, count]) => (
              <button
                key={company}
                onClick={() => handleSearch(company)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 6,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  fontSize: 12, cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.borderColor = "var(--border-hi)";
                  (e.target as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.borderColor = "var(--border)";
                  (e.target as HTMLElement).style.color = "var(--text-secondary)";
                }}
              >
                <Building2 size={11} />
                {company}
                <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {query && (
        <div>
          <div style={{
            fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em",
            textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12,
          }}>
            {results.length} connection{results.length !== 1 ? "s" : ""} found · click to highlight in graph
          </div>

          {results.length === 0 ? (
            <div style={{
              padding: "32px 24px", textAlign: "center",
              background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10,
            }}>
              <Building2 size={28} color="var(--text-muted)" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 6 }}>
                No direct connections at "{query}"
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5 }}>
                This doesn't mean there's no path. Switch to Gap Analysis to identify
                which role categories to build toward, then use the Outreach Queue
                to find weak ties who might know someone there.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map(({ connection: c, relevanceScore, pathDescription }, i) => (
                <ResultCard
                  key={c.id}
                  connection={c}
                  relevanceScore={relevanceScore}
                  pathDescription={pathDescription}
                  rank={i + 1}
                  onSelect={() => handleSelect(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions when idle */}
      {!query && (
        <div style={{
          padding: "20px 24px",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
            How this works
          </div>
          {[
            ["Search any company", "Find everyone in your 1st-degree network at or near that company."],
            ["Ranked by activation priority", "Weak ties in bridge roles rank highest — they provide non-redundant paths per the paper."],
            ["Click any result", "Highlights the node in the graph and shows activation guidance."],
            ["No results?", "Go to Gap Analysis to see which role types are missing from your network, and the Outreach Queue for who to contact first."],
          ].map(([title, desc], i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                background: "var(--accent-glow)", border: "1px solid var(--accent-dim)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)",
              }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ connection: c, relevanceScore, pathDescription, rank, onSelect }: any) {
  const tieColors: Record<string, string> = {
    strong: "var(--strong)", moderate: "var(--moderate)",
    weak: "var(--weak)", dormant: "var(--text-muted)",
  };

  const linkedInSearch = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(c.name)}`;

  return (
    <div
      onClick={onSelect}
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        gap: 14,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-hi)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--bg-panel)";
      }}
    >
      {/* Rank */}
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: "var(--bg-card)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-mono)", fontSize: 12,
        color: "var(--text-muted)",
      }}>
        {rank}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{c.name}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {Math.round(relevanceScore * 100)}% match
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 1 }}>{c.position}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{c.company}</div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className={`badge badge-${c.tieCategory}`}>
            {Math.round(c.tieStrength * 100)}% {c.tieCategory}
          </span>
          {c.isBridge && (
            <span className="badge" style={{ background: "rgba(52,211,153,0.1)", color: "var(--strong)" }}>bridge</span>
          )}
          <span style={{
            fontSize: 11, color: tieColors[c.tieCategory] || "var(--text-muted)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <ArrowRight size={10} />{pathDescription}
          </span>
        </div>
      </div>

      {/* LinkedIn link */}
      <a
        href={linkedInSearch}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, borderRadius: 7,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          color: "var(--text-muted)", flexShrink: 0,
          transition: "color 0.15s",
          textDecoration: "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        title="Open LinkedIn search"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  );
}
