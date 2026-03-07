"use client";

import { useState, useCallback, useEffect } from "react";
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

import UploadScreen from "@/components/UploadScreen";
import TopBar from "@/components/TopBar";
import GraphView from "@/components/GraphView";
import GapPanel from "@/components/GapPanel";
import CompanySearch from "@/components/CompanySearch";
import OutreachQueue from "@/components/OutreachQueue";

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
    } catch {}
  }, []);

  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);

    Papa.parse<RawCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      // LinkedIn CSV has a 3-line preamble — skip it
      beforeFirstChunk: (chunk) => {
        const lines = chunk.split("\n");
        // Find the header line (contains "First Name")
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
    localStorage.removeItem("navox-network-data");
  };

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
    </div>
  );
}
