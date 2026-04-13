import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthProtection } from "../hooks/useAuthProtection";
import api from "../services/api";
import WorkspaceHeader from "./WorkspaceHeader";
import AppCard from "./ui/AppCard";
import AppButton from "./ui/AppButton";
import AppAlert from "./ui/AppAlert";
import PageLayout from "./ui/PageLayout";

function Flows() {
  const navigate = useNavigate();
  const location = useLocation();
  useAuthProtection();

  const selectedFromState = useMemo(() => {
    return Array.isArray(location.state?.selected) ? location.state.selected : [];
  }, [location.state]);

  const [flows, setFlows] = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [flowsError, setFlowsError] = useState(null);
  const [selectedFlowId, setSelectedFlowId] = useState("");

  const [recipientsText, setRecipientsText] = useState("");
  const [flowAction, setFlowAction] = useState("navigate");
  const [draftMode, setDraftMode] = useState(false);
  const [flowToken, setFlowToken] = useState(generateFlowToken());
  const [flowCta, setFlowCta] = useState("Open Flow!");
  const [headerText, setHeaderText] = useState("Quick Service Flow");
  const [bodyText, setBodyText] = useState("Please continue in the flow.");
  const [footerText, setFooterText] = useState("");
  const [startScreen, setStartScreen] = useState("");
  const [customData, setCustomData] = useState("{}");

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    if (selectedFromState.length > 0) {
      const selectedNumbers = selectedFromState
        .map((user) => (user?.phoneNo || "").toString().trim())
        .filter(Boolean);
      setRecipientsText(selectedNumbers.join("\n"));
    }
  }, [selectedFromState]);

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        setLoadingFlows(true);
        setFlowsError(null);
        const res = await api.get("/waba/flows");
        if (res.data?.status === "success") {
          const list = Array.isArray(res.data.data) ? res.data.data : [];
          setFlows(list);
          if (list.length > 0) {
            setSelectedFlowId(String(list[0].id));
          }
        } else {
          setFlowsError(res.data?.message || "Failed to fetch flows.");
        }
      } catch (error) {
        console.error("Error loading flows:", error);
        setFlowsError("Error loading flows. Check backend and WABA setup.");
      } finally {
        setLoadingFlows(false);
      }
    };
    fetchFlows();
  }, []);

  const recipients = useMemo(() => {
    return recipientsText
      .split(/\r?\n|,|;/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((value) => value.replace(/[^\d+]/g, ""))
      .map((value) => (value.startsWith("+") ? value.slice(1) : value))
      .map((value) => (value.startsWith("00") ? value.slice(2) : value))
      .filter(Boolean);
  }, [recipientsText]);

  const selectedFlow = flows.find((flow) => String(flow.id) === String(selectedFlowId));
  const canSend = !sending && recipients.length > 0 && selectedFlow;

  const handleSend = async () => {
    if (!selectedFlow) {
      setSendResult({ status: "error", message: "Please select a flow first." });
      return;
    }
    if (recipients.length === 0) {
      setSendResult({ status: "error", message: "Please add at least one recipient." });
      return;
    }

    let parsedData = {};
    try {
      const value = (customData || "").trim();
      parsedData = value ? JSON.parse(value) : {};
      if (parsedData !== null && typeof parsedData !== "object") {
        throw new Error("Custom data must be a JSON object.");
      }
    } catch {
      setSendResult({ status: "error", message: "Invalid custom data JSON." });
      return;
    }

    const payload = {
      to: recipients,
      flowId: String(selectedFlow.id),
      flowName: selectedFlow.name || "",
      flowToken: flowToken.trim(),
      flowAction: flowAction.trim(),
      flowCta: flowCta.trim(),
      headerText: headerText.trim(),
      bodyText: bodyText.trim(),
      footerText: footerText.trim(),
      mode: draftMode ? "draft" : null,
      screen: startScreen.trim() || null,
      data: parsedData
    };

    try {
      setSending(true);
      setSendResult(null);
      const res = await api.post("/waba/send-flow", payload);
      if (res.data?.status === "success" || res.data?.status === "partial_success") {
        setSendResult({
          status: res.data.status === "success" ? "success" : "warn",
          message: res.data?.message || "Flow sent."
        });
      } else {
        setSendResult({
          status: "error",
          message: res.data?.message || "Failed to send flow."
        });
      }
    } catch (error) {
      console.error("Send flow error:", error);
      setSendResult({
        status: "error",
        message: error?.response?.data?.message || "Failed to send flow."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <PageLayout shellClassName="shell-xl">
      <WorkspaceHeader
        title="WhatsApp Flows"
        subtitle="Select a flow, set recipients, and send an interactive flow message."
        backFallback="/existing-list"
      />

      <div className="pb-6 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <AppCard className="overflow-hidden flex flex-col xl:col-span-4">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Available Flows</h2>
            <p className="mt-1 text-xs text-gray-500">{flows.length} flow{flows.length === 1 ? "" : "s"} loaded</p>
          </div>

          <div className="p-4 min-h-0 overflow-auto">
            {loadingFlows ? (
              <div className="text-sm text-gray-600">Loading flows...</div>
            ) : flowsError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-md">{flowsError}</div>
            ) : flows.length === 0 ? (
              <div className="text-sm text-gray-600">No flows found in this WABA account.</div>
            ) : (
              <div className="space-y-2">
                {flows.map((flow) => {
                  const isActive = String(selectedFlowId) === String(flow.id);
                  const status = (flow.status || "-").toString();
                  return (
                    <button
                      key={flow.id || flow.name}
                      type="button"
                      onClick={() => setSelectedFlowId(String(flow.id))}
                      className={`w-full text-left border rounded-lg p-3 transition ${
                        isActive ? "border-blue-500 ring-1 ring-blue-300 bg-blue-50/30" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{flow.name || "Unnamed Flow"}</div>
                          <div className="text-xs text-gray-500 mt-0.5 break-all">ID: {flow.id}</div>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${
                          status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : status === "DRAFT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                        }`}>
                          {status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </AppCard>

        <AppCard className="overflow-hidden xl:col-span-8">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Send Flow</h2>
            <p className="mt-1 text-xs text-gray-500">This is a basic Phase-1 sender for interactive flows.</p>
          </div>

          <div className="p-5 space-y-5">
            {sendResult && (
              <AppAlert
                tone={sendResult.status === "success" ? "success" : sendResult.status === "warn" ? "warn" : "error"}
                title={sendResult.status === "success" ? "Flow Sent" : sendResult.status === "warn" ? "Partial Success" : "Send Failed"}
                toastKey={`flow-send:${sendResult.status}:${sendResult.message}`}
                onClose={() => setSendResult(null)}
              >
                {sendResult.message}
              </AppAlert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selected Flow</label>
                <input
                  type="text"
                  value={selectedFlow ? `${selectedFlow.name || "Unnamed"} (${selectedFlow.id})` : ""}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={flowAction}
                  onChange={(e) => setFlowAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="navigate">navigate</option>
                  <option value="data_exchange">data_exchange</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipients ({recipients.length})
              </label>
              <textarea
                value={recipientsText}
                onChange={(e) => setRecipientsText(e.target.value)}
                rows={4}
                placeholder="Enter one phone per line or comma-separated"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: numbers selected from Existing List are auto-filled here.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flow Token</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={flowToken}
                    onChange={(e) => setFlowToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <AppButton variant="secondary" onClick={() => setFlowToken(generateFlowToken())}>Regenerate</AppButton>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  value={flowCta}
                  onChange={(e) => setFlowCta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Header Text (optional)</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text (optional)</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Screen (optional)</label>
                <input
                  type="text"
                  value={startScreen}
                  onChange={(e) => setStartScreen(e.target.value)}
                  placeholder="e.g. START_SCREEN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="flex items-center mt-7">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={draftMode}
                    onChange={(e) => setDraftMode(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Send in draft mode</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Data (JSON object)</label>
              <textarea
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <AppButton variant="secondary" onClick={() => navigate("/existing-list")}>
                Back to Existing List
              </AppButton>

              <AppButton onClick={handleSend} variant="primary" disabled={!canSend}>
                {sending ? "Sending..." : `Send Flow${recipients.length > 0 ? ` (${recipients.length})` : ""}`}
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>
    </PageLayout>
  );
}

function generateFlowToken() {
  const now = Date.now().toString();
  return `flow_${now.slice(-10)}`;
}

export default Flows;
