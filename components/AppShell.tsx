"use client";

import { Rabbit, Settings, Plus, Upload, Users, Network, Kanban, Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useState } from "react";
import Link from "next/link";

export type ActiveTab = "contacts" | "graph" | "pipeline";

interface AppShellProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  connectionCount: number;
  onImport: () => void;
  onAddContact: () => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
}

const TABS: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: "contacts", label: "Contacts",  shortLabel: "Contacts", icon: <Users size={14} /> },
  { id: "graph",    label: "Graph",     shortLabel: "Graph",    icon: <Network size={14} /> },
  { id: "pipeline", label: "Pipeline",  shortLabel: "Pipeline", icon: <Kanban size={14} /> },
];

export default function AppShell({
  activeTab,
  onTabChange,
  connectionCount,
  onImport,
  onAddContact,
  onOpenSettings,
  children,
}: AppShellProps) {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center h-12 px-3 shrink-0 bg-[var(--bg-panel)] border-b border-[var(--border)]">
          {/* Logo */}
          <Link
            href="https://www.navox.tech/"
            className="flex items-center gap-1.5 no-underline flex-1"
          >
            <Rabbit size={20} style={{ color: "var(--accent)" }} />
            <span className="font-mono text-[11px] text-[var(--text-secondary)] tracking-wide font-medium">
              NAVOX<span className="text-[var(--accent)]"> NETWORK</span>
            </span>
          </Link>

          {/* Actions */}
          <button
            className="btn btn-ghost"
            onClick={onAddContact}
            title="Add contact"
          >
            <Plus size={13} />
          </button>

          <button
            className="btn btn-ghost ml-1"
            onClick={onImport}
            title="Import contacts"
          >
            <Upload size={13} />
          </button>

          <button
            className="btn btn-ghost ml-1"
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings size={13} />
          </button>
        </div>

        {/* Mobile tab bar */}
        <div className="flex gap-0.5 px-3 py-1 bg-[var(--bg-panel)] border-b border-[var(--border)] shrink-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`btn btn-ghost text-[11px] px-2.5 py-1 h-[30px] whitespace-nowrap shrink-0 ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.shortLabel}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Nav bar */}
      <div className="flex items-center h-[52px] px-5 shrink-0 bg-[var(--bg-panel)] border-b border-[var(--border)]">
        {/* Logo */}
        <Link
          href="https://www.navox.tech/"
          className="flex items-center gap-2 mr-7 pr-6 border-r border-[var(--border)] no-underline"
        >
          <Rabbit size={24} style={{ color: "var(--accent)" }} />
          <span className="font-mono text-xs text-[var(--text-secondary)] tracking-wide font-medium">
            NAVOX<span className="text-[var(--accent)]"> NETWORK</span>
          </span>
        </Link>

        {/* Tab buttons */}
        <div className="flex gap-0.5 flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`btn btn-ghost text-xs px-3 py-[5px] h-[34px] ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "contacts" && connectionCount > 0 && (
                <span className="ml-1 text-[10px] text-[var(--text-muted)] font-mono">
                  {connectionCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right side actions */}
        <button
          className="btn btn-primary text-xs h-[30px] px-3 mr-1.5"
          onClick={onAddContact}
          title="Add new contact"
        >
          <Plus size={13} />
          <span>New</span>
        </button>

        <button
          className="btn btn-ghost text-[11px] h-[30px] px-2.5 mr-1.5"
          onClick={onImport}
          title="Import contacts"
        >
          <Upload size={13} />
          <span>Import</span>
        </button>

        <button
          className="btn btn-ghost px-2 h-7"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={13} />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
