"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { loadCoachMessages, saveCoachMessages, type ChatMessage } from "@/lib/coachStorage";

import UploadScreen from "@/components/UploadScreen";
import TopBar from "@/components/TopBar";
import GraphView from "@/components/GraphView";
import GapPanel from "@/components/GapPanel";
import CompanySearch from "@/components/CompanySearch";
import OutreachQueue from "@/components/OutreachQueue";
import CoachBubble from "@/components/CoachBubble";
import CoachPanel from "@/components/CoachPanel";

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

  // Coach state
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const coachInitSent = useRef(false);
  const systemPromptRef = useRef("");

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

      // Build coach context
      const ctx = buildAgentContext(stored.connections, stored.gapAnalysis);
      systemPromptRef.current = buildSystemPrompt(ctx);

      // Load saved coach messages
      const saved = loadCoachMessages();
      if (saved.length > 0) {
        setCoachMessages(saved);
        coachInitSent.current = true;
      }
    } catch {}
  }, []);

  // Also build coach context when CSV is freshly parsed
  const buildCoachContext = useCallback((conns: Connection[], gaps: GapAnalysis) => {
    const ctx = buildAgentContext(conns, gaps);
    systemPromptRef.current = buildSystemPrompt(ctx);
  }, []);

  // Save coach messages
  useEffect(() => {
    if (coachMessages.length > 0) {
      saveCoachMessages(coachMessages);
    }
  }, [coachMessages]);

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
          buildCoachContext(parsed, gaps);
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
  }, [buildCoachContext]);

  const handleReset = () => {
    setConnections([]);
    setGraphData(null);
    setGapAnalysis(null);
    setSelectedNode(null);
    setHighlightedIds(new Set());
    setCsvMeta(null);
    setError(null);
    setActivePanel("graph");
    localStorage.removeItem("navox-network-data");
  };

  // Coach: send message
  const sendCoachMessage = useCallback(async (text: string) => {
    if (!systemPromptRef.current || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const newMessages = [...coachMessages, userMessage];
    setCoachMessages(newMessages);
    setIsStreaming(true);

    try {
      const res = await fetch("/coach/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, systemPrompt: systemPromptRef.current }),
      });

      if (!res.ok) throw new Error("API request failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setCoachMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        const content = assistantContent;
        setCoachMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content };
          return updated;
        });
      }

      if (!coachOpen) setHasNotification(true);
    } catch (err) {
      console.error("Coach error:", err);
      setCoachMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, coachMessages, coachOpen]);

  // Coach: auto-trigger initial debrief on first open
  const handleCoachOpen = useCallback(() => {
    setCoachOpen(true);
    setHasNotification(false);

    if (coachMessages.length === 0 && !coachInitSent.current && systemPromptRef.current) {
      coachInitSent.current = true;
      const init = async () => {
        setIsStreaming(true);
        try {
          const initMessages: ChatMessage[] = [
            { role: "user", content: "Hi coach, I just uploaded my network. What should I know?" },
          ];
          setCoachMessages(initMessages);

          const res = await fetch("/coach/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: initMessages, systemPrompt: systemPromptRef.current }),
          });

          if (!res.ok) throw new Error("API request failed");
          const reader = res.body?.getReader();
          if (!reader) throw new Error("No reader");

          const decoder = new TextDecoder();
          let assistantContent = "";
          setCoachMessages((prev) => [...prev, { role: "assistant", content: "" }]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            assistantContent += decoder.decode(value, { stream: true });
            const content = assistantContent;
            setCoachMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content };
              return updated;
            });
          }
        } catch (err) {
          console.error("Coach init error:", err);
        } finally {
          setIsStreaming(false);
        }
      };
      init();
    }
  }, [coachMessages.length]);

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
          />
        </div>

        {activePanel === "gaps" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <GapPanel gapAnalysis={gapAnalysis} connections={connections} />
          </div>
        )}

        {activePanel === "search" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <CompanySearch
              connections={connections}
              onHighlight={(ids) => setHighlightedIds(ids)}
              onSelectNode={setSelectedNode}
              onSwitchToGraph={() => setActivePanel("graph")}
            />
          </div>
        )}

        {activePanel === "queue" && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <OutreachQueue connections={connections} gapAnalysis={gapAnalysis} />
          </div>
        )}
      </div>

      {/* Coach overlay */}
      <CoachBubble
        onClick={handleCoachOpen}
        hasNotification={hasNotification}
        panelOpen={coachOpen}
      />
      <CoachPanel
        isOpen={coachOpen}
        onClose={() => setCoachOpen(false)}
        messages={coachMessages}
        onSendMessage={sendCoachMessage}
        isStreaming={isStreaming}
      />
    </div>
  );
}
