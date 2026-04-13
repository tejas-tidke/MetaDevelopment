import React, { useEffect, useMemo, useState } from "react";
import { useAuthProtection } from "../hooks/useAuthProtection";
import api from "../services/api";
import WorkspaceHeader from "./WorkspaceHeader";
import PageLayout from "./ui/PageLayout";
import AppCard from "./ui/AppCard";
import AppButton from "./ui/AppButton";
import AppAlert from "./ui/AppAlert";

function Conversations() {
  useAuthProtection();

  const [flows, setFlows] = useState([]);
  const [flowsLoading, setFlowsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);

  const [sessions, setSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [events, setEvents] = useState([]);

  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [startPhoneNumber, setStartPhoneNumber] = useState("");
  const [profileName, setProfileName] = useState("");
  const [filterPhoneNumber, setFilterPhoneNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [listLimit, setListLimit] = useState("30");

  const [isStarting, setIsStarting] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const selectedFlow = useMemo(
    () => flows.find((flow) => String(flow.id) === String(selectedFlowId)),
    [flows, selectedFlowId]
  );

  useEffect(() => {
    loadFlows();
  }, []);

  useEffect(() => {
    if (flows.length > 0 && !selectedFlowId) {
      setSelectedFlowId(String(flows[0].id));
    }
  }, [flows, selectedFlowId]);

  useEffect(() => {
    loadSessions();
    loadResults();
    loadEvents();
    // Initial fetch only; subsequent refreshes are user-triggered from the Apply/Refresh controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFlows = async () => {
    try {
      setFlowsLoading(true);
      const res = await api.get("/waba/conversations/flows");
      if (res.data?.status === "success") {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setFlows(list);
      } else {
        throw new Error(res.data?.message || "Failed to load flows.");
      }
    } catch (error) {
      console.error("Failed to load configured flows", error);
      setAlert({
        tone: "error",
        message: "Could not load configured conversation flows."
      });
    } finally {
      setFlowsLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const params = new URLSearchParams();
      params.set("limit", listLimit || "30");
      if (filterPhoneNumber.trim()) {
        params.set("phoneNumber", filterPhoneNumber.trim());
      }
      if (selectedFlowId) {
        params.set("flowId", selectedFlowId);
      }
      if (filterStatus) {
        params.set("status", filterStatus);
      }

      const res = await api.get(`/waba/conversations/sessions?${params.toString()}`);
      if (res.data?.status === "success") {
        setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
      } else {
        throw new Error(res.data?.message || "Failed to load sessions.");
      }
    } catch (error) {
      console.error("Failed to load sessions", error);
      setAlert({
        tone: "error",
        message: "Could not load flow sessions."
      });
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      setResultsLoading(true);
      const params = new URLSearchParams();
      params.set("limit", listLimit || "30");
      if (filterPhoneNumber.trim()) {
        params.set("phoneNumber", filterPhoneNumber.trim());
      }
      if (selectedFlowId) {
        params.set("flowId", selectedFlowId);
      }

      const res = await api.get(`/waba/conversations/results?${params.toString()}`);
      if (res.data?.status === "success") {
        setResults(Array.isArray(res.data?.data) ? res.data.data : []);
      } else {
        throw new Error(res.data?.message || "Failed to load results.");
      }
    } catch (error) {
      console.error("Failed to load results", error);
      setAlert({
        tone: "error",
        message: "Could not load flow results."
      });
    } finally {
      setResultsLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      setEventsLoading(true);
      const params = new URLSearchParams();
      params.set("limit", listLimit || "30");
      if (filterPhoneNumber.trim()) {
        params.set("phoneNumber", filterPhoneNumber.trim());
      }
      if (selectedFlowId) {
        params.set("flowId", selectedFlowId);
      }
      params.set("direction", "OUTBOUND");

      const res = await api.get(`/waba/conversations/events?${params.toString()}`);
      if (res.data?.status === "success") {
        setEvents(Array.isArray(res.data?.data) ? res.data.data : []);
      } else {
        throw new Error(res.data?.message || "Failed to load events.");
      }
    } catch (error) {
      console.error("Failed to load events", error);
      setAlert({
        tone: "error",
        message: "Could not load delivery events."
      });
    } finally {
      setEventsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadSessions(), loadResults(), loadEvents()]);
  };

  const handleStartFlow = async () => {
    if (!selectedFlowId) {
      setAlert({ tone: "warn", message: "Select a flow first." });
      return;
    }
    if (!startPhoneNumber.trim()) {
      setAlert({ tone: "warn", message: "Enter a phone number to start the flow." });
      return;
    }

    try {
      setIsStarting(true);
      setAlert(null);
      const payload = {
        flowId: selectedFlowId,
        phoneNumber: startPhoneNumber.trim(),
        profileName: profileName.trim() || null
      };
      const res = await api.post("/waba/conversations/start", payload);
      if (res.data?.status === "success") {
        const outboundStatus = String(res.data?.outboundStatus || "");
        if (outboundStatus.startsWith("SUCCESS")) {
          setAlert({
            tone: "success",
            message: `Flow started for ${startPhoneNumber.trim()}.`
          });
        } else if (outboundStatus) {
          const detail = extractErrorMessage(res.data?.outboundResponse);
          setAlert({
            tone: "error",
            message: `Flow session started but WhatsApp send failed (${outboundStatus}). ${detail}`
          });
        } else {
          setAlert({
            tone: "warn",
            message: "Flow session started but delivery status is unknown. Check recent outbound events below."
          });
        }
        await Promise.all([loadSessions(), loadResults(), loadEvents()]);
      } else {
        setAlert({
          tone: "error",
          message: res.data?.message || "Could not start flow."
        });
      }
    } catch (error) {
      console.error("Failed to start flow", error);
      setAlert({
        tone: "error",
        message: error?.response?.data?.message || "Could not start flow."
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <PageLayout shellClassName="shell-xl">
      <WorkspaceHeader
        title="Conversation Monitor"
        subtitle="Start configured flows and monitor live sessions and outcomes."
        backFallback="/welcome"
      />

      <div className="pb-6 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <AppCard className="xl:col-span-4 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Start Conversation</h2>
            <p className="mt-1 text-xs text-gray-500">Kick off a configured flow for a phone number.</p>
          </div>

          <div className="p-5 space-y-4">
            {alert && (
              <AppAlert
                tone={alert.tone || "info"}
                title={alert.tone === "success" ? "Success" : alert.tone === "warn" ? "Attention" : "Update"}
                toastKey={`conversation:${alert.tone}:${alert.message}`}
                onClose={() => setAlert(null)}
              >
                {alert.message}
              </AppAlert>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flow</label>
              <select
                value={selectedFlowId}
                onChange={(e) => setSelectedFlowId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                disabled={flowsLoading || flows.length === 0}
              >
                {flowsLoading ? (
                  <option>Loading flows...</option>
                ) : flows.length === 0 ? (
                  <option value="">No flows found</option>
                ) : (
                  flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name || flow.id}
                    </option>
                  ))
                )}
              </select>
              {selectedFlow && (
                <p className="mt-1 text-xs text-gray-500 break-all">ID: {selectedFlow.id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={startPhoneNumber}
                onChange={(e) => setStartPhoneNumber(e.target.value)}
                placeholder="e.g. 9198XXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Name (optional)</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Contact name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <AppButton
              variant="primary"
              fullWidth
              onClick={handleStartFlow}
              disabled={isStarting || !selectedFlowId || !startPhoneNumber.trim()}
            >
              {isStarting ? "Starting..." : "Start Flow"}
            </AppButton>
          </div>
        </AppCard>

        <div className="xl:col-span-8 grid grid-cols-1 gap-4">
          <AppCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
                <p className="mt-1 text-xs text-gray-500">Apply filters then refresh sessions and results.</p>
              </div>
              <AppButton variant="secondary" onClick={handleRefresh}>
                Refresh
              </AppButton>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Filter</label>
                <input
                  type="text"
                  value={filterPhoneNumber}
                  onChange={(e) => setFilterPhoneNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status Filter</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Any</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ABANDONED">ABANDONED</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
                <select
                  value={listLimit}
                  onChange={(e) => setListLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="10">10</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <div className="flex items-end">
                <AppButton variant="primary" fullWidth onClick={handleRefresh}>
                  Apply
                </AppButton>
              </div>
            </div>
          </AppCard>

          <AppCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Recent Sessions</h2>
              <p className="mt-1 text-xs text-gray-500">Current step and captured answer snapshot per session.</p>
            </div>
            <div className="p-4">
              {sessionsLoading ? (
                <p className="text-sm text-gray-600">Loading sessions...</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-gray-600">No sessions found for current filters.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-3 bg-white/80">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {session.phoneNumber} | {session.flowId}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          session.status === "ACTIVE"
                            ? "bg-blue-100 text-blue-800"
                            : session.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : session.status === "ERROR"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-gray-100 text-gray-700"
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">Step: {session.currentStepId || "-"}</p>
                      <p className="mt-1 text-xs text-gray-600">Updated: {formatDate(session.updatedAt)}</p>
                      <pre className="mt-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2 overflow-auto">
                        {safePretty(session.answers)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AppCard>

          <AppCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Recent Results</h2>
              <p className="mt-1 text-xs text-gray-500">Saved scoring/result snapshots from completed assessments.</p>
            </div>
            <div className="p-4">
              {resultsLoading ? (
                <p className="text-sm text-gray-600">Loading results...</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-gray-600">No results found for current filters.</p>
              ) : (
                <div className="space-y-2">
                  {results.map((result) => (
                    <div key={result.id} className="border border-gray-200 rounded-lg p-3 bg-white/80">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {result.phoneNumber} | {result.flowId}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {result.resultCode || "-"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-700">
                        Score: {result.score ?? "-"} | Session: {result.sessionId}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">Created: {formatDate(result.createdAt)}</p>
                      {result.resultSummary && (
                        <p className="mt-2 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2">
                          {result.resultSummary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AppCard>

          <AppCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Recent Outbound Events</h2>
              <p className="mt-1 text-xs text-gray-500">Use this to diagnose delivery failures immediately.</p>
            </div>
            <div className="p-4">
              {eventsLoading ? (
                <p className="text-sm text-gray-600">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-600">No outbound events found for current filters.</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-3 bg-white/80">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {event.eventType} | {event.phoneNumber}
                        </p>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          String(event.status || "").startsWith("SUCCESS")
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {event.status || "-"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">Flow: {event.flowId || "-"} | At: {formatDate(event.createdAt)}</p>
                      {event.response && (
                        <pre className="mt-2 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded-md p-2 overflow-auto">
                          {safePretty(event.response)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AppCard>
        </div>
      </div>
    </PageLayout>
  );
}

function safePretty(value) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}

function extractErrorMessage(responsePayload) {
  if (!responsePayload) {
    return "";
  }
  try {
    if (typeof responsePayload === "string") {
      const parsed = JSON.parse(responsePayload);
      return extractErrorMessage(parsed);
    }
    if (responsePayload.error?.message) {
      return responsePayload.error.message;
    }
    if (Array.isArray(responsePayload?.errors) && responsePayload.errors[0]?.message) {
      return responsePayload.errors[0].message;
    }
    return "";
  } catch {
    return "";
  }
}

export default Conversations;
