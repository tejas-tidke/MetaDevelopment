import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

function ImportDetailPage() {
  const navigate = useNavigate();
  const { fileId } = useParams();
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!fileId) {
        setError("Missing file ID.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get(`/files/${fileId}/user-details`);
        setRecords(Array.isArray(response?.data?.data) ? response.data.data : []);
      } catch (fetchError) {
        console.error("Import detail fetch failed", fetchError);
        setError(fetchError?.response?.data?.message || "Failed to load import details.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fileId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((item) =>
      [item?.name, item?.email, item?.phoneNo, item?.companyName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [records, search]);

  const processed = Number(searchParams.get("processed") || records.length || 0);
  const errors = Number(searchParams.get("errors") || 0);

  return (
    <div className="app-page">
      <section className="app-grid-3">
        <article className="app-stat">
          <p className="app-stat-label">Processed</p>
          <p className="app-stat-value">{processed}</p>
        </article>
        <article className="app-stat">
          <p className="app-stat-label">Errors</p>
          <p className="app-stat-value">{errors}</p>
        </article>
        <article className="app-stat">
          <p className="app-stat-label">Ready Recipients</p>
          <p className="app-stat-value">{records.filter((item) => item?.phoneNo).length}</p>
        </article>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Imported Contact Records</h2>
            <p>File ID: {fileId}</p>
          </div>
          <div className="app-inline">
            <button type="button" className="app-btn-secondary" onClick={() => navigate("/app/contacts/import")}>
              Import Another
            </button>
            <button type="button" className="app-btn-primary" onClick={() => navigate("/app/campaigns/new/audience")}>
              Use In Campaign
            </button>
          </div>
        </div>
        <div className="app-section-body">
          <div className="app-field" style={{ maxWidth: "360px", marginBottom: "0.85rem" }}>
            <label htmlFor="record-search">Search imported contacts</label>
            <input
              id="record-search"
              className="app-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name/email/phone"
            />
          </div>

          {loading ? (
            <StatusBadge tone="info">Loading imported records...</StatusBadge>
          ) : error ? (
            <StatusBadge tone="error">{error}</StatusBadge>
          ) : filtered.length === 0 ? (
            <EmptyState>No records found for the current filters.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record, index) => (
                    <tr key={record.id || `${record.email}-${index}`}>
                      <td>{record.name || "-"}</td>
                      <td>{record.email || "-"}</td>
                      <td>{record.phoneNo || "-"}</td>
                      <td>{record.companyName || "-"}</td>
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

export default ImportDetailPage;

