"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import type { Connection } from "@/lib/tieStrength";
import type { ConnectionStatus, DataSource } from "@/lib/types";
import StatusPill from "./StatusPill";
import { type ListViewId, filterConnections } from "@/lib/listViewFilters";
import ContactsToolbar from "./ContactsToolbar";

// ── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

type SortKey =
  | "name"
  | "company"
  | "email"
  | "status"
  | "source"
  | "tieStrength"
  | "connectedOn";

type SortDir = "asc" | "desc";

const TIE_COLORS: Record<string, string> = {
  strong: "var(--strong)",
  moderate: "var(--moderate)",
  weak: "var(--weak)",
  dormant: "var(--dormant)",
};

function formatSource(source?: DataSource): string {
  if (!source) return "--";
  switch (source) {
    case "linkedin_csv":
      return "LinkedIn";
    case "generic_csv":
      return "CSV";
    case "manual_entry":
      return "Manual";
    case "email_import":
      return "Gmail";
  }
}

function formatDate(iso: string): string {
  if (!iso) return "--";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function matchesSearch(c: Connection, query: string): boolean {
  const q = query.toLowerCase();
  return (
    c.name.toLowerCase().includes(q) ||
    c.company.toLowerCase().includes(q) ||
    (c.email || "").toLowerCase().includes(q) ||
    c.position.toLowerCase().includes(q)
  );
}

// ── Column Definitions ───────────────────────────────────────────────────

interface ColumnDef {
  key: SortKey | "checkbox" | "rowNum";
  label: string;
  sortable: boolean;
  className: string;
}

const COLUMNS: ColumnDef[] = [
  { key: "checkbox", label: "", sortable: false, className: "w-10 text-center" },
  { key: "rowNum", label: "#", sortable: false, className: "w-10 text-right pr-2" },
  { key: "name", label: "Name", sortable: true, className: "min-w-[160px]" },
  { key: "company", label: "Company", sortable: true, className: "min-w-[140px]" },
  { key: "email", label: "Email", sortable: true, className: "min-w-[180px]" },
  { key: "status", label: "Status", sortable: true, className: "w-[110px]" },
  { key: "source", label: "Source", sortable: true, className: "w-[90px]" },
  { key: "tieStrength", label: "Tie Strength", sortable: true, className: "w-[120px]" },
  { key: "connectedOn", label: "Connected", sortable: true, className: "w-[110px]" },
];

// ── Comparator ───────────────────────────────────────────────────────────

function compareConnections(
  a: Connection,
  b: Connection,
  key: SortKey,
  dir: SortDir
): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "company":
      cmp = a.company.localeCompare(b.company);
      break;
    case "email":
      cmp = (a.email || "").localeCompare(b.email || "");
      break;
    case "status":
      cmp = (a.status || "new").localeCompare(b.status || "new");
      break;
    case "source":
      cmp = (a.source || "").localeCompare(b.source || "");
      break;
    case "tieStrength":
      cmp = a.tieStrength - b.tieStrength;
      break;
    case "connectedOn":
      cmp = a.connectedOn.localeCompare(b.connectedOn);
      break;
  }
  return dir === "asc" ? cmp : -cmp;
}

// ── Props ────────────────────────────────────────────────────────────────

interface ContactsTableProps {
  connections: Connection[];
  onSelectContact: (id: string) => void;
  onStatusChange: (id: string, status: ConnectionStatus) => void;
  onDeleteContacts: (ids: string[]) => void;
  activeView: ListViewId;
  onViewChange: (view: ListViewId) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onImport: () => void;
  onAddContact: () => void;
}

export default function ContactsTable({
  connections,
  onSelectContact,
  onStatusChange,
  onDeleteContacts,
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  onImport,
  onAddContact,
}: ContactsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Reset page when filters change
  const resetPage = useCallback(() => setPage(0), []);

  const handleViewChange = useCallback(
    (view: ListViewId) => {
      onViewChange(view);
      resetPage();
      setSelectedIds(new Set());
    },
    [onViewChange, resetPage]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      onSearchChange(query);
      resetPage();
    },
    [onSearchChange, resetPage]
  );

  // Filter -> Search -> Sort (memoized)
  const processed = useMemo(() => {
    let result = filterConnections(connections, activeView);
    if (searchQuery.trim()) {
      result = result.filter((c) => matchesSearch(c, searchQuery.trim()));
    }
    result.sort((a, b) => compareConnections(a, b, sortKey, sortDir));
    return result;
  }, [connections, activeView, searchQuery, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, processed.length);
  const pageRows = processed.slice(pageStart, pageEnd);

  // Select all toggles visible page only
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((c) => selectedIds.has(c.id));

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const c of pageRows) next.delete(c.id);
      } else {
        for (const c of pageRows) next.add(c.id);
      }
      return next;
    });
  }, [allPageSelected, pageRows]);

  const handleToggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      resetPage();
    },
    [sortKey, resetPage]
  );

  const handleDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    onDeleteContacts(ids);
    setSelectedIds(new Set());
  }, [selectedIds, onDeleteContacts]);

  const handleRowClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      // Don't navigate if clicking checkbox, status pill, or interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest("input[type=checkbox]") ||
        target.closest("[data-testid=status-pill]") ||
        target.closest("[data-testid=status-dropdown]") ||
        target.closest("button")
      ) {
        return;
      }
      onSelectContact(id);
    },
    [onSelectContact]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="contacts-table-root">
      {/* Toolbar */}
      <ContactsToolbar
        totalCount={connections.length}
        filteredCount={processed.length}
        activeView={activeView}
        onViewChange={handleViewChange}
        connections={connections}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onImport={onImport}
        onAddContact={onAddContact}
      />

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-1.5 bg-[var(--accent-glow)] border-b border-[var(--accent-dim)] shrink-0"
          data-testid="bulk-actions-bar"
        >
          <span className="text-xs font-medium text-[var(--accent)]">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[var(--critical)] bg-transparent hover:bg-red-500/10 transition-colors cursor-pointer border-none"
            data-testid="bulk-delete-btn"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      )}

      {/* Scrollable table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-[var(--bg-panel)]">
            <tr className="border-b border-[var(--border)]">
              {COLUMNS.map((col) => {
                if (col.key === "checkbox") {
                  return (
                    <th
                      key={col.key}
                      className={`px-2 py-2 font-normal ${col.className}`}
                    >
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={handleToggleAll}
                        className="accent-[var(--accent)] cursor-pointer"
                        data-testid="select-all-checkbox"
                      />
                    </th>
                  );
                }
                if (col.key === "rowNum") {
                  return (
                    <th
                      key={col.key}
                      className={`px-2 py-2 font-medium text-[var(--text-muted)] ${col.className}`}
                    >
                      #
                    </th>
                  );
                }
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-left font-medium text-[var(--text-muted)] ${col.className} ${
                      col.sortable
                        ? "cursor-pointer select-none hover:text-[var(--text-secondary)]"
                        : ""
                    }`}
                    onClick={
                      col.sortable
                        ? () => handleSort(col.key as SortKey)
                        : undefined
                    }
                    data-testid={`col-header-${col.key}`}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && isActive && (
                        <span className="text-[var(--accent)]">
                          {sortDir === "asc" ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-4 py-12 text-center text-sm text-[var(--text-muted)]"
                >
                  No contacts match this filter.
                </td>
              </tr>
            )}

            {pageRows.map((conn, idx) => {
              const isSelected = selectedIds.has(conn.id);
              const rowNum = pageStart + idx + 1;
              const tieColor =
                TIE_COLORS[conn.tieCategory] || TIE_COLORS.dormant;

              return (
                <tr
                  key={conn.id}
                  onClick={(e) => handleRowClick(conn.id, e)}
                  className={`border-b border-[var(--border)] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent-glow)]"
                      : "hover:bg-[var(--bg-hover)]"
                  }`}
                  data-testid={`contact-row-${conn.id}`}
                >
                  {/* Checkbox */}
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleOne(conn.id)}
                      className="accent-[var(--accent)] cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>

                  {/* Row number */}
                  <td className="px-2 py-2 text-right pr-2 font-mono text-[var(--text-muted)]">
                    {rowNum}
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectContact(conn.id);
                      }}
                      className="text-[var(--accent)] hover:underline font-medium bg-transparent border-none cursor-pointer p-0 text-left text-xs"
                      data-testid={`contact-name-${conn.id}`}
                    >
                      {conn.name}
                    </button>
                  </td>

                  {/* Company */}
                  <td className="px-3 py-2 text-[var(--text-secondary)] truncate max-w-[200px]">
                    {conn.company || "--"}
                  </td>

                  {/* Email */}
                  <td className="px-3 py-2 text-[var(--text-secondary)] truncate max-w-[220px] font-mono text-[11px]">
                    {conn.email || "--"}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    <StatusPill
                      status={conn.status}
                      onChange={(status) => onStatusChange(conn.id, status)}
                    />
                  </td>

                  {/* Source */}
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {formatSource(conn.source)}
                  </td>

                  {/* Tie Strength */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round(conn.tieStrength * 100)}%`,
                            backgroundColor: tieColor,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] w-7 text-right">
                        {Math.round(conn.tieStrength * 100)}
                      </span>
                    </div>
                  </td>

                  {/* Connected date */}
                  <td className="px-3 py-2 text-[var(--text-muted)] whitespace-nowrap">
                    {formatDate(conn.connectedOn)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-panel)] shrink-0"
          data-testid="pagination-bar"
        >
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {pageStart + 1}--{pageEnd} of {processed.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={safePage === 0}
              className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              data-testid="page-first"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              data-testid="page-prev"
            >
              Prev
            </button>
            <span className="px-2 text-[11px] font-mono text-[var(--text-muted)]">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              data-testid="page-next"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
              className="px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              data-testid="page-last"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { ContactsTableProps };
