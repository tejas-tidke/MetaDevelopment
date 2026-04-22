import React, { useEffect, useState } from "react";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

function ConversationsPage() {
  const [flows, setFlows] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [flowId, setFlowId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("info");

  const loadData = async () => {
    try {
      setLoading(true);
      const flowsRes = await api.get("/waba/conversations/flows");
      const flowList = Array.isArray(flowsRes?.data?.data) ? flowsRes.data.data : [];
      setFlows(flowList);
      const selectedFlowId = flowId || (flowList[0] ? String(flowList[0].id) : "");
      if (!flowId && selectedFlowId) {
        setFlowId(selectedFlowId);
      }

      const params = new URLSearchParams();
      params.set("limit", "30");
      if (selectedFlowId) {
        params.set("flowId", selectedFlowId);
      }
      const sessionsRes = await api.get(`/waba/conversations/sessions?${params.toString()}`);
      setSessions(Array.isArray(sessionsRes?.data?.data) ? sessionsRes.data.data : []);
    } catch (error) {
      console.error("Failed to load conversations", error);
      setMessage("Could not load conversation data.");
      setTone("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartConversation = async () => {
    if (!flowId || !phoneNumber.trim()) {
      setMessage("Flow and phone number are required.");
      setTone("error");
      return;
    }

    try {
      setStarting(true);
      setMessage("");
      await api.post("/waba/conversations/start", {
        flowId: Number(flowId),
        phoneNumber: phoneNumber.trim(),
      });
      setMessage("Conversation flow started successfully.");
      setTone("success");
      setPhoneNumber("");
      await loadData();
    } catch (error) {
      console.error("Failed to start conversation", error);
      setMessage(error?.response?.data?.message || "Failed to start conversation.");
      setTone("error");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="app-page">
      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Start Conversation Flow</h2>
            <p>Trigger interactive conversation workflows for a recipient.</p>
          </div>
        </div>
        <div className="app-section-body">
          <div className="app-field-grid">
            <div className="app-field">
              <label htmlFor="flow">Flow</label>
              <select id="flow" className="app-select" value={flowId} onChange={(event) => setFlowId(event.target.value)}>
                <option value="">Select flow</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name || flow.trigger || `Flow ${flow.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="app-field">
              <label htmlFor="phoneNumber">Recipient phone</label>
              <input
                id="phoneNumber"
                className="app-input"
                placeholder="919999999999"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
            </div>
          </div>

          {message && (
            <div style={{ marginTop: "0.8rem" }}>
              <StatusBadge tone={tone}>{message}</StatusBadge>
            </div>
          )}

          <div className="app-inline-actions">
            <span />
            <button type="button" className="app-btn-primary" onClick={handleStartConversation} disabled={starting}>
              {starting ? "Starting..." : "Start Flow"}
            </button>
          </div>
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Recent Sessions</h2>
            <p>Latest conversation sessions and statuses</p>
          </div>
          <button type="button" className="app-btn-secondary" onClick={loadData}>
            Refresh
          </button>
        </div>
        <div className="app-section-body">
          {loading ? (
            <StatusBadge tone="info">Loading sessions...</StatusBadge>
          ) : sessions.length === 0 ? (
            <EmptyState>No sessions found.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Flow</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id || `${session.flowId}-${session.phoneNumber}`}>
                      <td>{session.flowName || session.flowId || "-"}</td>
                      <td>{session.phoneNumber || "-"}</td>
                      <td>
                        <StatusBadge value={session.status || "unknown"} />
                      </td>
                      <td>{session.startedAt ? new Date(session.startedAt).toLocaleString() : "-"}</td>
                      <td>{session.lastActivityAt ? new Date(session.lastActivityAt).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ConversationsPage;

