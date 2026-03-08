"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import {
  parseLinkedInCSV,
  buildGraphData,
  analyzeGaps,
  type Connection,
  type GraphData,
  type GapAnalysis,
  type RawCSVRow,
} from "@/lib/tieStrength";
import { buildAgentContext } from "@/lib/agentContext";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { buildContextSection, type CoachContext } from "@/lib/coachContext";
import { getBarInsight, getDraftPrompt } from "@/lib/coachInsights";

import UploadScreen from "@/components/UploadScreen";
import TopBar from "@/components/TopBar";
import GraphView from "@/components/GraphView";
import GapPanel from "@/components/GapPanel";
import CompanySearch from "@/components/CompanySearch";
import OutreachQueue from "@/components/OutreachQueue";
import CoachBar from "@/components/CoachBar";
import AskCoachDialog from "@/components/AskCoachDialog";

export type ActivePanel = "graph" | "gaps" | "search" | "queue";

export default function Home() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("graph");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Connection | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [csvMeta, setCsvMeta] = useState<{ filename: string; generatedAt: string } | null>(null);

  // Coach state (lightweight — no chat)
  const [askCoachOpen, setAskCoachOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [draftMessages, setDraftMessages] = useState<Map<string, string>>(new Map());
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const systemPromptRef = useRef("");

  // Build system prompt on load
  useEffect(() => {
    try {
      const raw = localStorage.getItem("navox-network-data");
      if (!raw) return;
      const stored = JSON.parse(raw) as { connections: Connection[]; gapAnalysis: GapAnalysis; uploadedAt: string };
      if (!stored.connections?.length) return;
      const graph = buildGraphData(stored.connections);
      setConnections(stored.connections);
      setGraphData(graph);
      setGapAnalysis(stored.gapAnalysis);
      setCsvMeta({
        filename: "Connections.csv",
        generatedAt: new Date(stored.uploadedAt).toLocaleDateString("en-CA"),
      });
      const ctx = buildAgentContext(stored.connections, stored.gapAnalysis);
      systemPromptRef.current = buildSystemPrompt(ctx);
    } catch {}
  }, []);

  // Rebuild system prompt with navigation context for AskCoach
  const currentSystemPrompt = useMemo(() => {
    if (!systemPromptRef.current) return "";
    const ctx: CoachContext = {
      activeTab: activePanel,
      selectedNode,
      searchQuery,
      searchResultCount,
      gapAnalysis,
    };
    return systemPromptRef.current + "\n\n" + buildContextSection(ctx);
  }, [activePanel, selectedNode, searchQuery, searchResultCount, gapAnalysis]);

  // CoachBar insight (computed client-side, instant)
  const barInsight = useMemo(() => {
    return getBarInsight(activePanel, selectedNode, gapAnalysis, searchQuery, searchResultCount);
  }, [activePanel, selectedNode, gapAnalysis, searchQuery, searchResultCount]);

  const handleSearchChange = useCallback((query: string, resultCount: number) => {
    setSearchQuery(query);
    setSearchResultCount(resultCount);
  }, []);

  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);

    Papa.parse<RawCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      beforeFirstChunk: (chunk) => {
        const lines = chunk.split("\n");
        const headerIdx = lines.findIndex((l) => l.includes("First Name"));
        if (headerIdx > 0) {
          return lines.slice(headerIdx).join("\n");
        }
        return chunk;
      },
      complete: (results) => {
        try {
          const parsed = parseLinkedInCSV(results.data);
          if (parsed.length === 0) {
            setError("No connections found. Make sure this is a LinkedIn Connections.csv export.");
            setIsLoading(false);
            return;
          }
          const graph = buildGraphData(parsed);
          const gaps = analyzeGaps(parsed);

          setConnections(parsed);
          setGraphData(graph);
          setGapAnalysis(gaps);
          setCsvMeta({
            filename: file.name,
            generatedAt: new Date().toLocaleDateString("en-CA"),
          });
          localStorage.setItem("navox-network-data", JSON.stringify({
            connections: parsed,
            gapAnalysis: gaps,
            uploadedAt: new Date().toISOString(),
          }));
          const ctx = buildAgentContext(parsed, gaps);
          systemPromptRef.current = buildSystemPrompt(ctx);
        } catch (e) {
          setError("Failed to parse CSV. Please export a fresh copy from LinkedIn Settings → Data Privacy → Connections.");
        } finally {
          setIsLoading(false);
        }
      },
      error: () => {
        setError("Could not read file.");
        setIsLoading(false);
      },
    });
  }, []);

  const handleReset = () => {
    setConnections([]);
    setGraphData(null);
    setGapAnalysis(null);
    setSelectedNode(null);
    setHighlightedIds(new Set());
    setCsvMeta(null);
    setError(null);
    setActivePanel("graph");
    setDraftMessages(new Map());
    localStorage.removeItem("navox-network-data");
  };

  // Draft message via AI (on-demand, cached)
  const handleDraftMessage = useCallback(async (conn: Connection) => {
    if (draftMessages.has(conn.id) || draftingId) return;

    setDraftingId(conn.id);
    try {
      const prompt = getDraftPrompt(conn);
      const coachKey = localStorage.getItem("navox-coach-key") || "";
      const res = await fetch("/coach/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(coachKey && { "x-coach-key": coachKey }),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          systemPrompt: "You are a professional networking message writer. Write ONLY the message body. No commentary.",
        }),
      });

      if (!res.ok) throw new Error("Failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setDraftMessages((prev) => new Map(prev).set(conn.id, content));
      }
    } catch {
      setDraftMessages((prev) => new Map(prev).set(conn.id, "Failed to generate. Try again."));
    } finally {
      setDraftingId(null);
    }
  }, [draftMessages, draftingId]);

  // CoachBar action handler
  const handleCoachAction = useCallback((action: string) => {
    switch (action) {
      case "switch-gaps": setActivePanel("gaps"); break;
      case "switch-queue": setActivePanel("queue"); break;
      case "switch-search": setActivePanel("search"); break;
      case "switch-graph": setActivePanel("graph"); break;
      case "draft-message":
        if (selectedNode) handleDraftMessage(selectedNode);
        break;
    }
  }, [selectedNode, handleDraftMessage]);

  if (!graphData || !gapAnalysis) {
    return (
      <UploadScreen
        onFile={handleFile}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <TopBar
        connections={connections}
        gapAnalysis={gapAnalysis}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        csvMeta={csvMeta}
        onReset={handleReset}
      />

      <CoachBar
        insight={barInsight}
        onAction={handleCoachAction}
        onAskCoach={() => setAskCoachOpen(true)}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Graph always mounted, visibility toggled so force sim state persists */}
        <div style={{
          flex: 1,
          display: activePanel === "graph" ? "block" : "none",
          position: "relative",
          overflow: "hidden",
        }}>
          <GraphView
            graphData={graphData}
            connections={connections}
            highlightedIds={highlightedIds}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onDraftMessage={handleDraftMessage}
            draftMessages={draftMessages}
            draftingId={draftingId}
          />
        </div>

        {activePanel === "gaps" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <GapPanel
              gapAnalysis={gapAnalysis}
              connections={connections}
              onSwitchToSearch={(query) => { setActivePanel("search"); }}
            />
          </div>
        )}

        {activePanel === "search" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <CompanySearch
              connections={connections}
              onHighlight={(ids) => setHighlightedIds(ids)}
              onSelectNode={setSelectedNode}
              onSwitchToGraph={() => setActivePanel("graph")}
              onSearchChange={handleSearchChange}
            />
          </div>
        )}

        {activePanel === "queue" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <OutreachQueue
              connections={connections}
              gapAnalysis={gapAnalysis}
            />
          </div>
        )}
      </div>

      <AskCoachDialog
        isOpen={askCoachOpen}
        onClose={() => setAskCoachOpen(false)}
        systemPrompt={currentSystemPrompt}
      />
    </div>
  );
}
