import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";

function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const [contactsRes, filesRes] = await Promise.all([api.get("/user-details"), api.get("/files")]);
        setContacts(Array.isArray(contactsRes?.data?.data) ? contactsRes.data.data : []);
        const uploadedFiles = Array.isArray(filesRes?.data?.data)
          ? filesRes.data.data
          : Array.isArray(filesRes?.data)
            ? filesRes.data
            : [];
        setFiles(uploadedFiles);
      } catch (error) {
        console.error("Failed to load contacts", error);
      }
    };
    loadContacts();
  }, []);

  const filtered = contacts.filter((contact) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [contact?.name, contact?.email, contact?.phoneNo, contact?.companyName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  return (
    <div className="app-page">
      <section className="app-grid-3">
        <article className="app-stat">
          <p className="app-stat-label">Total Contacts</p>
          <p className="app-stat-value">{contacts.length}</p>
        </article>
        <article className="app-stat">
          <p className="app-stat-label">Imported Files</p>
          <p className="app-stat-value">{files.length}</p>
        </article>
        <article className="app-stat">
          <p className="app-stat-label">Ready for Campaigns</p>
          <p className="app-stat-value">{contacts.filter((contact) => contact?.phoneNo).length}</p>
        </article>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Contacts</h2>
            <p>Manage contact data independently from campaign execution.</p>
          </div>
          <button type="button" className="app-btn-primary" onClick={() => navigate("/app/contacts/import")}>
            Import Contacts
          </button>
        </div>
        <div className="app-section-body">
          <div className="app-field" style={{ maxWidth: "360px", marginBottom: "0.9rem" }}>
            <label htmlFor="contact-search">Search contacts</label>
            <input
              id="contact-search"
              className="app-input"
              placeholder="Search by name, email, phone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState>No contacts found for the current filters.</EmptyState>
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
                  {filtered.map((contact, index) => (
                    <tr key={contact.id || `${contact.email}-${index}`}>
                      <td>{contact.name || "-"}</td>
                      <td>{contact.email || "-"}</td>
                      <td>{contact.phoneNo || "-"}</td>
                      <td>{contact.companyName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="app-section-card">
        <div className="app-section-head">
          <div>
            <h2>Recent Imports</h2>
            <p>Imported files that can be reused inside campaign audience selection.</p>
          </div>
        </div>
        <div className="app-section-body">
          {files.length === 0 ? (
            <EmptyState>No files imported yet.</EmptyState>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Status</th>
                    <th>Processed</th>
                    <th>Uploaded At</th>
                  </tr>
                </thead>
                <tbody>
                  {files.slice(0, 10).map((file) => (
                    <tr
                      key={file.id}
                      onClick={() => navigate(`/app/contacts/imports/${file.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{file.fileName}</td>
                      <td>
                        <StatusBadge value={file.status || "pending"} />
                      </td>
                      <td>
                        {(file.processedRecords || 0) + (file.errorRecords || 0)} (
                        {file.processedRecords || 0} valid)
                      </td>
                      <td>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : "-"}</td>
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

export default ContactsPage;

