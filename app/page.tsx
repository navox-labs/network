"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Papa from "papaparse";
import {
  parseLinkedInCSV,
  buildGraphData,
  analyzeGaps,
  assignConfidenceLevel,
  enrichTieStrength,
  tieCategoryFromStrength,
  activationPriority,
  calculateTieStrength,
  classifyIndustry,
  classifyRole,
  detectBridges,
  isBridgeConnection,
  classifyNetworkPosition,
  getDominantCluster,
  type Connection,
  type GraphData,
  type GapAnalysis,
  type RawCSVRow,
  type EnrichmentSignals,
} from "@/lib/tieStrength";
import {
  ingestFiles,
  validateFileMap,
  summarizeFiles,
  isGenericCSV,
  normalizeGenericCSVHeaders,
  type FilePresenceSummary,
} from "@/lib/fileIngestor";
import {
  mergeMultiSourceContacts,
} from "@/lib/setLogic";
import {
  parseMessages,
  parseEndorsements,
  parseEndorsementsGiven,
  parseRecommendations,
  parseInvitations,
  computeConnectionEnrichments,
  buildEnrichmentSummary,
  buildEnrichmentSummaryFromConnections,
  detectUserProfileUrl,
  normalizeLinkedInUrl,
  type EnrichmentSummary,
  type ConnectionEnrichment,
} from "@/lib/enrichment";
import { buildAgentContext } from "@/lib/agentContext";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import { buildContextSection, type CoachContext } from "@/lib/coachContext";
import { getBarInsight, getDraftPrompt } from "@/lib/coachInsights";
import { getAIConfig, streamAIResponse, DRAFT_NO_KEY } from "@/lib/aiClient";

type SourceType = "linkedin" | "generic";
import ManualEntryForm from "@/components/ManualEntryForm";
import GraphView from "@/components/GraphView";
import AskCoachDialog from "@/components/AskCoachDialog";
import SettingsDialog from "@/components/SettingsDialog";
import AppShell, { type ActiveTab } from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import ContactsTable from "@/components/ContactsTable";
import ContactDetail from "@/components/ContactDetail";
import PipelineView from "@/components/PipelineView";
import ImportModal from "@/components/ImportModal";
import { type ListViewId } from "@/lib/listViewFilters";
import type { ConnectionStatus, OutreachVoice } from "@/lib/types";

// Keep ActivePanel exported for backward compatibility with coachContext/coachInsights
export type ActivePanel = "graph" | "gaps" | "search" | "queue";

export default function Home() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("contacts");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsingStage, setParsingStage] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Connection | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [csvMeta, setCsvMeta] = useState<{ filename: string; generatedAt: string } | null>(null);
  const [enrichmentSummary, setEnrichmentSummary] = useState<EnrichmentSummary | null>(null);

  // Phase 2: Contacts list view state
  const [listView, setListView] = useState<ListViewId>("all");
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");

  // Phase 3 / Phase 4 state placeholders
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Enrichment banner state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Coach state
  const [askCoachOpen, setAskCoachOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultCount, setSearchResultCount] = useState(0);
  const [draftMessages, setDraftMessages] = useState<Map<string, string>>(new Map());
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const systemPromptRef = useRef("");
  const draftAbortRef = useRef<AbortController | null>(null);
  const wasLoadingRef = useRef(false);

  // Load from IndexedDB (with localStorage migration fallback)
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("navox-enrich-banner-dismissed");
      if (dismissed === "true") setBannerDismissed(true);
    } catch {}

    const loadData = async () => {
      try {
        // Try migrating from localStorage first (one-time)
        const { migrateFromLocalStorage } = await import("@/lib/migration");
        const migrated = await migrateFromLocalStorage();

        // Load from IndexedDB (either migrated or pre-existing)
        const { loadFullState } = await import("@/lib/localDB");
        const state = migrated || await loadFullState();

        if (!state || !state.connections.length) {
          // Fallback: try legacy localStorage if IndexedDB is empty
          try {
            const raw = localStorage.getItem("navox-network-data");
            if (!raw) return;
            const stored = JSON.parse(raw);
            if (!stored.connections?.length) return;

            const conns: Connection[] = stored.connections;
            const graph = buildGraphData(conns);
            const gaps = stored.gapAnalysis as GapAnalysis;

            setConnections(conns);
            setGraphData(graph);
            setGapAnalysis(gaps);
            setCsvMeta({
              filename: stored.displayFilename || "LinkedIn Export",
              generatedAt: new Date(stored.uploadedAt).toLocaleDateString("en-CA"),
            });

            if (stored.enrichment) {
              setEnrichmentSummary(stored.enrichment as EnrichmentSummary);
            }

            const ctx = buildAgentContext(conns, gaps);
            systemPromptRef.current = buildSystemPrompt(ctx);
          } catch {}
          return;
        }

        const conns = state.connections;
        const graph = buildGraphData(conns);
        const gaps = state.gapAnalysis;

        setConnections(conns);
        setGraphData(graph);
        setGapAnalysis(gaps);
        setCsvMeta({
          filename: state.displayFilename || "LinkedIn Export",
          generatedAt: new Date(state.uploadedAt).toLocaleDateString("en-CA"),
        });

        if (state.enrichment) {
          setEnrichmentSummary(state.enrichment as EnrichmentSummary);
        }

        const ctx = buildAgentContext(conns, gaps);
        systemPromptRef.current = buildSystemPrompt(ctx);
      } catch (e) {
        console.warn("Failed to load from IndexedDB:", e);
      }
    };

    loadData();

    // Listen for banner dismiss event from EnrichBanner
    const handleDismiss = () => setBannerDismissed(true);
    window.addEventListener("enrich-banner-dismiss", handleDismiss);
    return () => window.removeEventListener("enrich-banner-dismiss", handleDismiss);
  }, []);

  // Rebuild system prompt with navigation context for AskCoach
  const currentSystemPrompt = useMemo(() => {
    if (!systemPromptRef.current) return "";
    const ctx: CoachContext = {
      activeTab: "graph" as ActivePanel,
      selectedNode,
      searchQuery,
      searchResultCount,
      gapAnalysis,
    };
    return systemPromptRef.current + "\n\n" + buildContextSection(ctx);
  }, [selectedNode, searchQuery, searchResultCount, gapAnalysis]);

  // CoachBar insight (computed client-side, instant)
  const barInsight = useMemo(() => {
    return getBarInsight("graph" as ActivePanel, selectedNode, gapAnalysis, searchQuery, searchResultCount);
  }, [selectedNode, gapAnalysis, searchQuery, searchResultCount]);

  // Auto-close import modal when loading transitions from true to false with no error
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && !error && importModalOpen) {
      setImportModalOpen(false);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, error, importModalOpen]);

  const handleSearchChange = useCallback((query: string, resultCount: number) => {
    setSearchQuery(query);
    setSearchResultCount(resultCount);
  }, []);

  /**
   * Strip LinkedIn CSV preamble lines (notes before the actual header row).
   */
  const stripCsvPreamble = (csv: string): string => {
    const lines = csv.split("\n");
    const headerIdx = lines.findIndex((l) => l.includes("First Name"));
    if (headerIdx > 0) return lines.slice(headerIdx).join("\n");
    return csv;
  };

  /**
   * Apply enrichment data to parsed connections. Mutates in place for
   * performance (connections array is freshly created by parseLinkedInCSV).
   */
  const applyEnrichment = (
    conns: Connection[],
    enrichmentMap: Map<string, ConnectionEnrichment>,
    hasEnrichmentFiles: boolean
  ): void => {
    for (const c of conns) {
      if (!c.url) continue;
      const normalizedUrl = normalizeLinkedInUrl(c.url);
      const enrichment = enrichmentMap.get(normalizedUrl);

      if (enrichment) {
        c.messageCount = enrichment.messageCount;
        c.lastMessageDate = enrichment.lastMessageDate || undefined;
        c.messageBidirectional = enrichment.messageBidirectional;
        c.endorsementReceived = enrichment.endorsementReceived;
        c.endorsementGiven = enrichment.endorsementGiven;
        c.recommendationReceived = enrichment.recommendationReceived;
        c.initiatedBy = enrichment.initiatedBy || undefined;
      }

      // Reassign confidence using enrichment-aware model when enrichment files are loaded
      if (hasEnrichmentFiles) {
        const signals: EnrichmentSignals = enrichment
          ? {
              hasMessages: enrichment.messageCount > 0,
              messageBidirectional: enrichment.messageBidirectional,
              hasEndorsement: enrichment.endorsementReceived,
              hasRecommendation: enrichment.recommendationReceived,
              hasInvitation: enrichment.initiatedBy !== null,
            }
          : {};
        c.confidenceLevel = assignConfidenceLevel(c.daysSinceConnected, signals);

        // Recalculate tie strength with enrichment boost
        if (enrichment) {
          c.tieStrength = enrichTieStrength(c.tieStrength, {
            ...signals,
            messageCount: enrichment.messageCount,
            lastMessageDate: enrichment.lastMessageDate || undefined,
          });
          c.tieCategory = tieCategoryFromStrength(c.tieStrength);
          c.activationPriority = activationPriority(c.tieStrength, c.isBridge, c.networkPosition);
        }
      }
    }
  };

  const handleFiles = useCallback(async (files: File[], sourceType: SourceType = "linkedin") => {
    setIsLoading(true);
    setError(null);
    setParsingStage("Detecting file type\u2026");

    try {
      if (sourceType === "generic") {
        // -- Generic CSV path --
        // Read the first CSV file and parse it with normalized headers
        const csvFile = files.find((f) => f.name.toLowerCase().endsWith(".csv"));
        if (!csvFile) {
          setError("No CSV file found. Please upload a .csv file.");
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        setParsingStage("Reading CSV\u2026");
        const csvText = await csvFile.text();
        const rawParse = Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true,
        });

        if (!rawParse.meta.fields || rawParse.meta.fields.length === 0) {
          setError("Could not detect CSV headers. Please check the file format.");
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        if (!isGenericCSV(rawParse.meta.fields)) {
          setError("CSV does not contain recognizable contact columns (need at least 2 of: first name, last name, email, company, position).");
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        const headerMap = normalizeGenericCSVHeaders(rawParse.meta.fields);
        setParsingStage("Parsing contacts\u2026");

        // Build Connection objects from generic CSV rows
        const today = new Date().toISOString().split("T")[0];
        const preClassified = rawParse.data
          .map((row) => {
            // Map row fields using headerMap
            const mapped: Record<string, string> = {};
            for (const [origHeader, canonical] of Object.entries(headerMap)) {
              mapped[canonical] = (row[origHeader] || "").trim();
            }
            return mapped;
          })
          .filter((m) => m["First Name"] || m["Last Name"])
          .map((m) => {
            const company = m["Company"] || "";
            const position = m["Position"] || "";
            return {
              mapped: m,
              company,
              position,
              industryCluster: classifyIndustry(company, position),
            };
          });

        const clusterCounts = detectBridges(preClassified);
        const dominantCluster = preClassified.length > 0
          ? getDominantCluster(preClassified.map((p) => ({
              industryCluster: p.industryCluster,
            })) as Connection[])
          : "Other" as const;

        const parsed: Connection[] = preClassified.map((pre, i) => {
          const { mapped, company, position, industryCluster } = pre;
          const firstName = mapped["First Name"] || "";
          const lastName = mapped["Last Name"] || "";
          const name = `${firstName} ${lastName}`.trim() || "Unknown";
          const email = mapped["Email Address"] || "";

          const ts = calculateTieStrength(today);
          const tieCategory = tieCategoryFromStrength(ts);
          const roleCategory = classifyRole(position);
          const bridge = isBridgeConnection(industryCluster, clusterCounts);
          const daysSince = 0;
          const confidenceLevel = assignConfidenceLevel(daysSince);
          const networkPosition = classifyNetworkPosition(
            industryCluster, dominantCluster, daysSince, bridge
          );
          const priority = activationPriority(ts, bridge, networkPosition);

          return {
            id: `gen-${i}`,
            name,
            firstName,
            lastName,
            company,
            position,
            connectedOn: today,
            email: email || undefined,
            tieStrength: ts,
            tieCategory,
            roleCategory,
            daysSinceConnected: daysSince,
            industryCluster,
            isBridge: bridge,
            networkPosition,
            confidenceLevel,
            activationPriority: priority,
            source: "generic_csv" as const,
            sources: ["generic_csv" as const],
          };
        });

        if (parsed.length === 0) {
          setError("No contacts found in CSV. Check that rows have at least a first or last name.");
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        // If we already have connections loaded, merge
        const finalConnections = connections.length > 0
          ? mergeMultiSourceContacts(connections, parsed, "generic_csv")
          : parsed;

        setParsingStage("Building network graph\u2026");
        const graph = buildGraphData(finalConnections);
        const gaps = analyzeGaps(finalConnections);

        setConnections(finalConnections);
        setGraphData(graph);
        setGapAnalysis(gaps);
        setEnrichmentSummary(null);

        const displayFilename = csvFile.name;
        setCsvMeta({
          filename: displayFilename,
          generatedAt: new Date().toLocaleDateString("en-CA"),
        });

        try {
          const { saveFullState } = await import("@/lib/localDB");
          await saveFullState({
            schemaVersion: 3,
            connections: finalConnections,
            gapAnalysis: gaps,
            uploadedAt: new Date().toISOString(),
            displayFilename,
          });
        } catch {
          console.warn("IndexedDB save failed -- data will not persist across refresh.");
        }

        const ctx = buildAgentContext(finalConnections, gaps);
        systemPromptRef.current = buildSystemPrompt(ctx);

      } else {
        // -- LinkedIn CSV path (existing behavior) --
        // Step 1: Ingest files (zip, folder, or loose CSVs)
        const fileMap = await ingestFiles(files);

        // Step 2: Validate -- connections.csv is required
        const validationError = validateFileMap(fileMap);
        if (validationError) {
          setError(validationError);
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        const fileSummary = summarizeFiles(fileMap);
        setParsingStage("Parsing connections\u2026");

        // Step 3: Parse connections.csv
        const connectionsCSV = stripCsvPreamble(fileMap.get("connections.csv")!);
        const parseResult = Papa.parse<RawCSVRow>(connectionsCSV, {
          header: true,
          skipEmptyLines: true,
        });
        const parsed = parseLinkedInCSV(parseResult.data);

        if (parsed.length === 0) {
          setError("No connections found. Make sure this is a LinkedIn Connections.csv export.");
          setIsLoading(false);
          setParsingStage(null);
          return;
        }

        // Step 4: Parse enrichment files if present
        let enrichment: EnrichmentSummary | null = null;
        const hasEnrichmentFiles = fileSummary.enrichmentFileCount > 0;

        if (hasEnrichmentFiles) {
          setParsingStage("Matching enrichment data\u2026");

          const msgRows = fileMap.has("messages.csv")
            ? Papa.parse<Record<string, string>>(fileMap.get("messages.csv")!, { header: true, skipEmptyLines: true }).data
            : [];
          const endorseRows = fileMap.has("endorsement_received_info.csv")
            ? Papa.parse<Record<string, string>>(fileMap.get("endorsement_received_info.csv")!, { header: true, skipEmptyLines: true }).data
            : [];
          const endorseGivenRows = fileMap.has("endorsement_given_info.csv")
            ? Papa.parse<Record<string, string>>(fileMap.get("endorsement_given_info.csv")!, { header: true, skipEmptyLines: true }).data
            : [];
          const recRows = fileMap.has("recommendations_received.csv")
            ? Papa.parse<Record<string, string>>(fileMap.get("recommendations_received.csv")!, { header: true, skipEmptyLines: true }).data
            : [];
          const invRows = fileMap.has("invitations.csv")
            ? Papa.parse<Record<string, string>>(fileMap.get("invitations.csv")!, { header: true, skipEmptyLines: true }).data
            : [];

          // Detect user's own profile URL from messages for accurate latent-tie counting
          const userProfileUrl = detectUserProfileUrl(
            parseMessages(msgRows), parsed
          );

          const messages = parseMessages(msgRows, userProfileUrl);
          const endorsements = parseEndorsements(endorseRows);
          const endorsementsGiven = parseEndorsementsGiven(endorseGivenRows);
          const recommendations = parseRecommendations(recRows);
          const invitations = parseInvitations(invRows);

          const enrichmentMap = computeConnectionEnrichments(
            messages, endorsements, recommendations, invitations, parsed, endorsementsGiven
          );

          // Apply enrichment to connections
          applyEnrichment(parsed, enrichmentMap, true);

          enrichment = buildEnrichmentSummary(
            fileSummary.loaded,
            enrichmentMap,
            invitations,
            messages.length,
            messages,
            parsed,
            userProfileUrl
          );
        }

        // Step 5: Build graph and gap analysis
        setParsingStage("Building network graph\u2026");
        const graph = buildGraphData(parsed);
        const gaps = analyzeGaps(parsed);

        // Step 6: Update state
        setConnections(parsed);
        setGraphData(graph);
        setGapAnalysis(gaps);
        setEnrichmentSummary(enrichment);
        // Determine display name: zip filename > folder name > fallback
        let displayFilename = "LinkedIn Export";
        const zipFile = files.find((f) => f.name.toLowerCase().endsWith(".zip"));
        if (zipFile) {
          displayFilename = zipFile.name;
        } else if (files[0]?.webkitRelativePath) {
          const folderName = files[0].webkitRelativePath.split("/")[0];
          if (folderName) displayFilename = folderName;
        }

        setCsvMeta({
          filename: displayFilename,
          generatedAt: new Date().toLocaleDateString("en-CA"),
        });

        // Step 7: Save to IndexedDB -- isolated try/catch
        // so a storage error doesn't mask the successful parse
        try {
          const { saveFullState } = await import("@/lib/localDB");
          await saveFullState({
            schemaVersion: 3,
            connections: parsed,
            gapAnalysis: gaps,
            uploadedAt: new Date().toISOString(),
            displayFilename,
            enrichment: enrichment || undefined,
          });
        } catch {
          console.warn("IndexedDB save failed -- data will not persist across refresh.");
        }

        // Step 8: Build system prompt
        const ctx = buildAgentContext(parsed, gaps);
        systemPromptRef.current = buildSystemPrompt(ctx);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to process files.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setParsingStage(null);
    }
  }, [connections]);

  // Handle manual contact addition
  const handleAddManualContact = useCallback((partial: Partial<Connection>) => {
    const today = new Date().toISOString().split("T")[0];
    const company = partial.company || "";
    const position = partial.position || "";
    const industryCluster = classifyIndustry(company, position);
    const ts = calculateTieStrength(today);
    const tieCategory = tieCategoryFromStrength(ts);
    const roleCategory = classifyRole(position);
    const daysSince = 0;

    // Rebuild bridge detection with current connections + new one
    const allForBridge = [...connections.map((c) => ({ industryCluster: c.industryCluster })), { industryCluster }];
    const clusterCounts = detectBridges(allForBridge);
    const bridge = isBridgeConnection(industryCluster, clusterCounts);
    const dominantCluster = connections.length > 0 ? getDominantCluster(connections) : industryCluster;
    const networkPosition = classifyNetworkPosition(industryCluster, dominantCluster, daysSince, bridge);
    const priority = activationPriority(ts, bridge, networkPosition);

    const newConn: Connection = {
      id: `manual-${Date.now()}`,
      name: partial.name || "Unknown",
      firstName: partial.firstName || "",
      lastName: partial.lastName || "",
      company,
      position,
      connectedOn: today,
      email: partial.email,
      tieStrength: ts,
      tieCategory,
      roleCategory,
      daysSinceConnected: daysSince,
      industryCluster,
      isBridge: bridge,
      networkPosition,
      confidenceLevel: assignConfidenceLevel(daysSince),
      activationPriority: priority,
      source: "manual_entry",
      sources: ["manual_entry"],
    };

    const updatedConns = [...connections, newConn];
    const graph = buildGraphData(updatedConns);
    const gaps = analyzeGaps(updatedConns);

    setConnections(updatedConns);
    setGraphData(graph);
    setGapAnalysis(gaps);
    setShowManualEntry(false);

    // Persist
    (async () => {
      try {
        const { saveFullState } = await import("@/lib/localDB");
        await saveFullState({
          schemaVersion: 3,
          connections: updatedConns,
          gapAnalysis: gaps,
          uploadedAt: new Date().toISOString(),
          displayFilename: csvMeta?.filename || "Network",
          enrichment: enrichmentSummary || undefined,
        });
      } catch {
        console.warn("IndexedDB save failed.");
      }
    })();

    const ctx = buildAgentContext(updatedConns, gaps);
    systemPromptRef.current = buildSystemPrompt(ctx);
  }, [connections, csvMeta, enrichmentSummary]);

  const handleReset = async () => {
    setConnections([]);
    setGraphData(null);
    setGapAnalysis(null);
    setSelectedNode(null);
    setHighlightedIds(new Set());
    setCsvMeta(null);
    setError(null);
    setActiveTab("contacts");
    setDraftMessages(new Map());
    setEnrichmentSummary(null);
    setBannerDismissed(false);
    localStorage.removeItem("navox-network-data");
    localStorage.removeItem("navox-enrich-banner-dismissed");
    try {
      const { clearAllData } = await import("@/lib/localDB");
      await clearAllData();
    } catch {}
  };

  // Handle enrichment file drops from EnrichBanner
  const handleEnrichFiles = useCallback(async (files: File[]) => {
    if (connections.length === 0) return;

    setIsEnriching(true);
    setEnrichResult(null);

    try {
      const fileMap = await ingestFiles(files);

      // Skip connections.csv -- we don't want to re-parse connections
      fileMap.delete("connections.csv");

      if (fileMap.size === 0) {
        setIsEnriching(false);
        return;
      }

      // Parse enrichment CSVs
      const msgRows = fileMap.has("messages.csv")
        ? Papa.parse<Record<string, string>>(fileMap.get("messages.csv")!, { header: true, skipEmptyLines: true }).data
        : [];
      const endorseRows = fileMap.has("endorsement_received_info.csv")
        ? Papa.parse<Record<string, string>>(fileMap.get("endorsement_received_info.csv")!, { header: true, skipEmptyLines: true }).data
        : [];
      const endorseGivenRows = fileMap.has("endorsement_given_info.csv")
        ? Papa.parse<Record<string, string>>(fileMap.get("endorsement_given_info.csv")!, { header: true, skipEmptyLines: true }).data
        : [];
      const recRows = fileMap.has("recommendations_received.csv")
        ? Papa.parse<Record<string, string>>(fileMap.get("recommendations_received.csv")!, { header: true, skipEmptyLines: true }).data
        : [];
      const invRows = fileMap.has("invitations.csv")
        ? Papa.parse<Record<string, string>>(fileMap.get("invitations.csv")!, { header: true, skipEmptyLines: true }).data
        : [];

      // Detect user's own profile URL for accurate latent-tie counting
      const userProfileUrl = detectUserProfileUrl(
        parseMessages(msgRows), connections
      );

      const messages = parseMessages(msgRows, userProfileUrl);
      const endorsements = parseEndorsements(endorseRows);
      const endorsementsGiven = parseEndorsementsGiven(endorseGivenRows);
      const recommendations = parseRecommendations(recRows);
      const invitations = parseInvitations(invRows);

      const enrichmentMap = computeConnectionEnrichments(
        messages, endorsements, recommendations, invitations, connections, endorsementsGiven
      );

      // Apply enrichment to existing connections (mutates in place)
      const updatedConns = [...connections];
      applyEnrichment(updatedConns, enrichmentMap, true);

      // Merge loaded files with any previously loaded files
      const previousFiles = enrichmentSummary?.filesLoaded ?? [];
      const newFiles = Array.from(fileMap.keys());
      const allFilesSet = new Set([...previousFiles, ...newFiles]);
      const allFiles = Array.from(allFilesSet);
      // Ensure connections.csv is always in the list
      if (!allFiles.includes("connections.csv")) allFiles.unshift("connections.csv");

      // Build summary from final connection state (not just current drop)
      // so stats accumulate correctly across multiple enrichment drops
      const enrichment = buildEnrichmentSummaryFromConnections(
        allFiles,
        updatedConns,
        invitations,
        messages,
        userProfileUrl
      );

      // Recalculate graph and gap analysis
      const graph = buildGraphData(updatedConns);
      const gaps = analyzeGaps(updatedConns);

      // Update state
      setConnections(updatedConns);
      setGraphData(graph);
      setGapAnalysis(gaps);
      setEnrichmentSummary(enrichment);

      // Save to IndexedDB
      try {
        const { saveFullState } = await import("@/lib/localDB");
        await saveFullState({
          schemaVersion: 3,
          connections: updatedConns,
          gapAnalysis: gaps,
          uploadedAt: new Date().toISOString(),
          displayFilename: csvMeta?.filename || "LinkedIn Export",
          enrichment,
        });
      } catch {
        console.warn("IndexedDB save failed -- data will not persist across refresh.");
      }

      // Rebuild system prompt
      const ctx = buildAgentContext(updatedConns, gaps);
      systemPromptRef.current = buildSystemPrompt(ctx);

      // Count new signals for success message
      let signalCount = 0;
      enrichmentMap.forEach((e) => {
        if (e.messageCount > 0) signalCount++;
        if (e.endorsementReceived) signalCount++;
        if (e.recommendationReceived) signalCount++;
        if (e.initiatedBy) signalCount++;
      });

      setEnrichResult(`Analysis updated with ${signalCount} new interaction signals`);

      // Auto-clear success message after 4 seconds
      setTimeout(() => setEnrichResult(null), 4000);
    } catch (e) {
      console.error("Enrichment failed:", e);
    } finally {
      setIsEnriching(false);
    }
  }, [connections, enrichmentSummary]);

  // Draft message via AI (on-demand, cached)
  const handleDraftMessage = useCallback(async (conn: Connection) => {
    if (draftMessages.has(conn.id) || draftingId) return;

    const config = getAIConfig();
    if (!config) {
      setDraftMessages((prev) => new Map(prev).set(conn.id, DRAFT_NO_KEY));
      return;
    }

    // Abort any previous draft stream
    draftAbortRef.current?.abort();
    const controller = new AbortController();
    draftAbortRef.current = controller;

    setDraftingId(conn.id);
    try {
      const prompt = getDraftPrompt(conn);
      let content = "";

      for await (const chunk of streamAIResponse(
        config,
        [{ role: "user", content: prompt }],
        "You are a professional networking message writer. Write ONLY the message body. No commentary.",
        controller.signal
      )) {
        content += chunk;
        setDraftMessages((prev) => new Map(prev).set(conn.id, content));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setDraftMessages((prev) => new Map(prev).set(conn.id, "Failed to generate. Check your API key and try again."));
    } finally {
      setDraftingId(null);
    }
  }, [draftMessages, draftingId]);

  // Import handler -- opens ImportModal
  const handleImport = useCallback(() => {
    setImportModalOpen(true);
  }, []);

  // Phase 2: Status change handler -- persists to IndexedDB
  const handleStatusChange = useCallback(async (id: string, status: ConnectionStatus) => {
    const updatedConns = connections.map(c =>
      c.id === id ? { ...c, status, statusUpdatedAt: new Date().toISOString() } : c
    );
    setConnections(updatedConns);
    try {
      const { updateConnection } = await import("@/lib/localDB");
      await updateConnection(id, { status, statusUpdatedAt: new Date().toISOString() });
    } catch {
      console.warn("Failed to persist status change to IndexedDB.");
    }
  }, [connections]);

  // Phase 3: Notes change handler -- persists to IndexedDB
  const handleNotesChange = useCallback(async (id: string, notes: string) => {
    const updatedConns = connections.map(c => c.id === id ? { ...c, notes } : c);
    setConnections(updatedConns);
    try {
      const { updateConnection } = await import("@/lib/localDB");
      await updateConnection(id, { notes });
    } catch {
      console.warn("Failed to persist notes change to IndexedDB.");
    }
  }, [connections]);

  // Phase 3: Voice change handler -- persists to IndexedDB
  const handleVoiceChange = useCallback(async (id: string, voice: OutreachVoice) => {
    const updatedConns = connections.map(c => c.id === id ? { ...c, outreachVoice: voice } : c);
    setConnections(updatedConns);
    try {
      const { updateConnection } = await import("@/lib/localDB");
      await updateConnection(id, { outreachVoice: voice });
    } catch {
      console.warn("Failed to persist voice change to IndexedDB.");
    }
  }, [connections]);

  // Phase 2: Delete contacts handler -- persists full state
  const handleDeleteContacts = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids);
    const updatedConns = connections.filter(c => !idSet.has(c.id));
    setConnections(updatedConns);

    const graph = buildGraphData(updatedConns);
    const gaps = analyzeGaps(updatedConns);
    setGraphData(graph);
    setGapAnalysis(gaps);

    try {
      const { saveFullState } = await import("@/lib/localDB");
      await saveFullState({
        schemaVersion: 3,
        connections: updatedConns,
        gapAnalysis: gaps,
        uploadedAt: new Date().toISOString(),
        displayFilename: csvMeta?.filename || "Network",
        enrichment: enrichmentSummary || undefined,
      });
    } catch {
      console.warn("Failed to persist deletion to IndexedDB.");
    }

    const ctx = buildAgentContext(updatedConns, gaps);
    systemPromptRef.current = buildSystemPrompt(ctx);
  }, [connections, csvMeta, enrichmentSummary]);

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      connectionCount={connections.length}
      onImport={handleImport}
      onAddContact={() => setShowManualEntry(true)}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      {/* Contacts tab */}
      {activeTab === "contacts" && (
        connections.length === 0 ? (
          <EmptyState
            onImport={handleImport}
            onAddContact={() => setShowManualEntry(true)}
          />
        ) : selectedContactId && connections.find(c => c.id === selectedContactId) ? (
          <ContactDetail
            connection={connections.find(c => c.id === selectedContactId)!}
            onBack={() => setSelectedContactId(null)}
            onStatusChange={handleStatusChange}
            onNotesChange={handleNotesChange}
            onVoiceChange={handleVoiceChange}
            onDraftMessage={handleDraftMessage}
            draftMessage={draftMessages.get(selectedContactId)}
            isDrafting={draftingId === selectedContactId}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        ) : (
          <ContactsTable
            connections={connections}
            onSelectContact={(id) => setSelectedContactId(id)}
            onStatusChange={handleStatusChange}
            onDeleteContacts={handleDeleteContacts}
            activeView={listView}
            onViewChange={setListView}
            searchQuery={contactsSearchQuery}
            onSearchChange={setContactsSearchQuery}
            onImport={handleImport}
            onAddContact={() => setShowManualEntry(true)}
          />
        )
      )}

      {/* Graph tab -- always mounted, visibility toggled so force sim state persists */}
      <div
        className={`h-full w-full relative overflow-hidden ${
          activeTab === "graph" ? "block" : "hidden"
        }`}
      >
        {graphData && (
          <GraphView
            graphData={graphData}
            connections={connections}
            highlightedIds={highlightedIds}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            onDraftMessage={handleDraftMessage}
            draftMessages={draftMessages}
            draftingId={draftingId}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {!graphData && activeTab === "graph" && (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)] font-mono">
            Import contacts to view the network graph
          </div>
        )}
      </div>

      {/* Pipeline tab */}
      {activeTab === "pipeline" && (
        connections.length === 0 ? (
          <EmptyState
            onImport={handleImport}
            onAddContact={() => setShowManualEntry(true)}
          />
        ) : (
          <PipelineView
            connections={connections}
            onSelectContact={(id) => {
              setSelectedContactId(id);
              setActiveTab("contacts");
            }}
            onStatusChange={handleStatusChange}
          />
        )
      )}

      {/* Modals */}
      <AskCoachDialog
        isOpen={askCoachOpen}
        onClose={() => setAskCoachOpen(false)}
        systemPrompt={currentSystemPrompt}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onFiles={handleFiles}
        onAddManual={() => {
          setImportModalOpen(false);
          setShowManualEntry(true);
        }}
        isLoading={isLoading}
        error={error}
        parsingStage={parsingStage}
      />

      {showManualEntry && (
        <ManualEntryForm
          onAdd={handleAddManualContact}
          onCancel={() => setShowManualEntry(false)}
        />
      )}
    </AppShell>
  );
}
