import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthProtection } from "../hooks/useAuthProtection";
import api from "../services/api";
import WorkspaceHeader from "./WorkspaceHeader";
import PageLayout from "./ui/PageLayout";
import AppCard from "./ui/AppCard";
import AppButton from "./ui/AppButton";
import AppAlert from "./ui/AppAlert";

const TEMPLATE_CATEGORIES = ["UTILITY", "MARKETING", "AUTHENTICATION"];

const LANGUAGE_OPTIONS = [
  "en_US",
  "en_GB",
  "hi",
  "mr",
  "ta",
  "te",
  "bn",
  "gu",
  "kn",
  "ml",
];

const HEADER_FORMATS = ["TEXT", "IMAGE", "VIDEO", "DOCUMENT", "LOCATION"];

const BUTTON_TYPES = ["QUICK_REPLY", "URL", "PHONE_NUMBER"];

function TemplateCreate() {
  useAuthProtection();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("UTILITY");
  const [language, setLanguage] = useState("en_US");
  const [allowCategoryChange, setAllowCategoryChange] = useState(true);

  const [includeHeader, setIncludeHeader] = useState(false);
  const [headerFormat, setHeaderFormat] = useState("TEXT");
  const [headerText, setHeaderText] = useState("");
  const [headerExamples, setHeaderExamples] = useState([]);
  const [headerMediaHandle, setHeaderMediaHandle] = useState("");

  const [bodyText, setBodyText] = useState("");
  const [bodyExamples, setBodyExamples] = useState([]);

  const [includeFooter, setIncludeFooter] = useState(false);
  const [footerText, setFooterText] = useState("");

  const [buttons, setButtons] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const headerVariableCount = useMemo(() => {
    if (!includeHeader || headerFormat !== "TEXT") return 0;
    return countPlaceholders(headerText);
  }, [includeHeader, headerFormat, headerText]);

  const bodyVariableCount = useMemo(() => countPlaceholders(bodyText), [bodyText]);

  useEffect(() => {
    syncExampleArrayLength(headerVariableCount, setHeaderExamples);
  }, [headerVariableCount]);

  useEffect(() => {
    syncExampleArrayLength(bodyVariableCount, setBodyExamples);
  }, [bodyVariableCount]);

  const isNameValid = /^[a-z0-9_]+$/.test(name.trim());
  const hasRequiredBody = bodyText.trim().length > 0;
  const needsHeaderHandle =
    includeHeader && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat);

  const hasValidHeader = !includeHeader
    || (headerFormat === "TEXT" ? headerText.trim().length > 0 : !needsHeaderHandle || headerMediaHandle.trim().length > 0);

  const isFormValid = isNameValid && hasRequiredBody && language.trim() && category.trim() && hasValidHeader;

  const addButton = () => {
    setButtons((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "QUICK_REPLY",
        text: "",
        url: "",
        phoneNumber: "",
        urlExample: "",
      },
    ]);
  };

  const updateButton = (id, updater) => {
    setButtons((prev) => prev.map((item) => (item.id === id ? { ...item, ...updater } : item)));
  };

  const removeButton = (id) => {
    setButtons((prev) => prev.filter((item) => item.id !== id));
  };

  const submitTemplate = async () => {
    if (!isFormValid) {
      setResult({ tone: "error", message: "Please complete all required fields before submitting." });
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);

      const components = [];

      for (const button of buttons) {
        if (button.type === "URL") {
          if (!button.url.trim()) {
            setResult({ tone: "error", message: "URL button requires a valid URL value." });
            setSubmitting(false);
            return;
          }
          if (countPlaceholders(button.url) > 0 && !button.urlExample.trim()) {
            setResult({ tone: "error", message: "URL button with variables requires a sample URL value." });
            setSubmitting(false);
            return;
          }
        }
        if (button.type === "PHONE_NUMBER" && !button.phoneNumber.trim()) {
          setResult({ tone: "error", message: "Phone number button requires a phone number." });
          setSubmitting(false);
          return;
        }
      }

      if (includeHeader) {
        const headerComponent = { type: "HEADER", format: headerFormat };
        if (headerFormat === "TEXT") {
          headerComponent.text = headerText.trim();
          if (headerVariableCount > 0) {
            headerComponent.example = {
              header_text: [headerExamples.map((value, i) => (value || `sample_${i + 1}`).trim())],
            };
          }
        } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) && headerMediaHandle.trim()) {
          headerComponent.example = {
            header_handle: [headerMediaHandle.trim()],
          };
        }
        components.push(headerComponent);
      }

      const bodyComponent = { type: "BODY", text: bodyText.trim() };
      if (bodyVariableCount > 0) {
        bodyComponent.example = {
          body_text: [bodyExamples.map((value, i) => (value || `sample_${i + 1}`).trim())],
        };
      }
      components.push(bodyComponent);

      if (includeFooter && footerText.trim()) {
        components.push({ type: "FOOTER", text: footerText.trim() });
      }

      if (buttons.length > 0) {
        const buttonItems = buttons
          .filter((button) => button.text.trim())
          .map((button) => {
            if (button.type === "URL") {
              const item = {
                type: "URL",
                text: button.text.trim(),
                url: button.url.trim(),
              };
              if (countPlaceholders(button.url) > 0 && button.urlExample.trim()) {
                item.example = [button.urlExample.trim()];
              }
              return item;
            }

            if (button.type === "PHONE_NUMBER") {
              return {
                type: "PHONE_NUMBER",
                text: button.text.trim(),
                phone_number: button.phoneNumber.trim(),
              };
            }

            return {
              type: "QUICK_REPLY",
              text: button.text.trim(),
            };
          });

        if (buttonItems.length > 0) {
          components.push({
            type: "BUTTONS",
            buttons: buttonItems,
          });
        }
      }

      const payload = {
        name: name.trim(),
        category,
        language: language.trim(),
        allow_category_change: allowCategoryChange,
        components,
      };

      const res = await api.post("/waba/templates", payload);
      if (res.data?.status === "success") {
        setResult({
          tone: "success",
          message: "Template submitted successfully. Meta will now review and approve it.",
        });
        return;
      }

      const backendMessage = res.data?.message || "Unable to submit template.";
      const metaError = res.data?.metaError ? ` ${res.data.metaError}` : "";
      setResult({ tone: "error", message: `${backendMessage}${metaError}`.trim() });
    } catch (err) {
      console.error("Create template error:", err);
      const backendMessage = err?.response?.data?.message || "Unable to submit template.";
      const metaError = err?.response?.data?.metaError ? ` ${err.response.data.metaError}` : "";
      setResult({ tone: "error", message: `${backendMessage}${metaError}`.trim() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout shellClassName="h-full flex flex-col overflow-hidden">
      <WorkspaceHeader
        title="Create WhatsApp Template"
        subtitle="Fill the Meta-required fields and submit directly to WhatsApp Cloud API."
        backFallback="/templates"
        actions={
          <AppButton variant="secondary" onClick={() => navigate("/templates")}>
            Back to Templates
          </AppButton>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 md:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-3">
          <AppCard className="lg:col-span-2 p-5">
            <h2 className="text-lg font-semibold text-[var(--brand-secondary)]">Template Details</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted-text)]">
              Required by Meta: `name`, `language`, `category`, and at least one BODY component.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Template Name*" hint="lowercase letters, numbers, and underscore only">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="order_received_update"
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                />
                {name && !isNameValid ? (
                  <p className="mt-1 text-xs text-[var(--brand-error)]">Use only `a-z`, `0-9`, and `_`.</p>
                ) : null}
              </Field>

              <Field label="Category*">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none"
                >
                  {TEMPLATE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Language*">
                <div className="flex gap-2">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none"
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    placeholder="Custom locale"
                    className="w-36 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                  />
                </div>
              </Field>

              <Field label="Category Change">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--brand-text)]">
                  <input
                    type="checkbox"
                    checked={allowCategoryChange}
                    onChange={(e) => setAllowCategoryChange(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--brand-border)]"
                  />
                  Allow Meta to update category if needed
                </label>
              </Field>
            </div>

            <SectionDivider title="Header (Optional)" />
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--brand-text)]">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--brand-border)]"
                />
                Include Header component
              </label>

              {includeHeader ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Header Format">
                    <select
                      value={headerFormat}
                      onChange={(e) => setHeaderFormat(e.target.value)}
                      className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none"
                    >
                      {HEADER_FORMATS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {headerFormat === "TEXT" ? (
                    <Field label="Header Text">
                      <input
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Order update for {{1}}"
                        className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                      />
                    </Field>
                  ) : ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerFormat) ? (
                    <Field label="Sample Media Handle" hint="Meta may require a sample media handle for review">
                      <input
                        value={headerMediaHandle}
                        onChange={(e) => setHeaderMediaHandle(e.target.value)}
                        placeholder="4::aW1hZ2UvanBlZw==:..."
                        className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                      />
                    </Field>
                  ) : (
                    <Field label="Info">
                      <p className="rounded-lg bg-[var(--brand-soft-bg)] px-3 py-2 text-sm text-[var(--brand-muted-text)]">
                        For media/location headers, Meta may ask sample assets during review.
                      </p>
                    </Field>
                  )}
                </div>
              ) : null}

              {includeHeader && headerFormat === "TEXT" && headerVariableCount > 0 ? (
                <ExampleInputs
                  title="Header Variable Samples"
                  values={headerExamples}
                  onChange={setHeaderExamples}
                />
              ) : null}
            </div>

            <SectionDivider title="Body (Required)" />
            <Field label="Body Text*">
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Hello {{1}}, your order {{2}} is confirmed."
                rows={4}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
              />
            </Field>

            {bodyVariableCount > 0 ? (
              <ExampleInputs
                title="Body Variable Samples"
                values={bodyExamples}
                onChange={setBodyExamples}
              />
            ) : null}

            <SectionDivider title="Footer (Optional)" />
            <label className="inline-flex items-center gap-2 text-sm text-[var(--brand-text)]">
              <input
                type="checkbox"
                checked={includeFooter}
                onChange={(e) => setIncludeFooter(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--brand-border)]"
              />
              Include Footer component
            </label>
            {includeFooter ? (
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={2}
                placeholder="Powered by MetaDevelopment"
                className="mt-3 w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
              />
            ) : null}

            <SectionDivider title="Buttons (Optional)" />
            <div className="space-y-3">
              {buttons.map((button, idx) => (
                <div key={button.id} className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--brand-secondary)]">Button {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeButton(button.id)}
                      className="text-xs font-medium text-[var(--brand-error)]"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Type">
                      <select
                        value={button.type}
                        onChange={(e) =>
                          updateButton(button.id, { type: e.target.value, url: "", phoneNumber: "", urlExample: "" })
                        }
                        className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none"
                      >
                        {BUTTON_TYPES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Button Text">
                      <input
                        value={button.text}
                        onChange={(e) => updateButton(button.id, { text: e.target.value })}
                        placeholder="Track Order"
                        className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                      />
                    </Field>

                    {button.type === "URL" ? (
                      <>
                        <Field label="URL">
                          <input
                            value={button.url}
                            onChange={(e) => updateButton(button.id, { url: e.target.value })}
                            placeholder="https://example.com/order/{{1}}"
                            className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                          />
                        </Field>
                        <Field label="URL Variable Sample">
                          <input
                            value={button.urlExample}
                            onChange={(e) => updateButton(button.id, { urlExample: e.target.value })}
                            placeholder="12345"
                            className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                          />
                        </Field>
                      </>
                    ) : null}

                    {button.type === "PHONE_NUMBER" ? (
                      <Field label="Phone Number">
                        <input
                          value={button.phoneNumber}
                          onChange={(e) => updateButton(button.id, { phoneNumber: e.target.value })}
                          placeholder="+14155552671"
                          className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
                        />
                      </Field>
                    ) : null}
                  </div>
                </div>
              ))}

              <AppButton variant="secondary" onClick={addButton}>
                + Add Button
              </AppButton>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <AppButton variant="primary" onClick={submitTemplate} disabled={submitting || !isFormValid}>
                {submitting ? "Submitting..." : "Submit To Meta"}
              </AppButton>
              <AppButton variant="secondary" onClick={() => navigate("/templates")}>
                Cancel
              </AppButton>
            </div>
          </AppCard>

          <AppCard soft className="p-5">
            <h3 className="text-base font-semibold text-[var(--brand-secondary)]">Meta Requirements</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--brand-muted-text)]">
              <li>1. Name must be lowercase with letters, numbers, or `_`.</li>
              <li>2. `language`, `category`, and BODY text are required.</li>
              <li>
                3. If you use <code>{"{{variables}}"}</code>, provide sample values.
              </li>
              <li>4. Buttons can be QUICK_REPLY, URL, or PHONE_NUMBER.</li>
            </ul>

            {result ? (
              <div className="mt-4">
                <AppAlert tone={result.tone === "success" ? "success" : "error"} title={result.tone === "success" ? "Submitted" : "Submission Failed"}>
                  {result.message}
                </AppAlert>
              </div>
            ) : null}
          </AppCard>
        </div>
      </div>
    </PageLayout>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-[var(--brand-secondary)]">{label}</span>
      {hint ? <span className="mb-1 block text-xs text-[var(--brand-muted-text)]">{hint}</span> : null}
      {children}
    </label>
  );
}

function SectionDivider({ title }) {
  return (
    <div className="my-4 border-t border-[var(--brand-border)] pt-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">{title}</h3>
    </div>
  );
}

function ExampleInputs({ title, values, onChange }) {
  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-soft-bg)] p-3">
      <p className="mb-2 text-sm font-semibold text-[var(--brand-secondary)]">{title}</p>
      <div className="grid grid-cols-1 gap-2">
        {values.map((value, idx) => (
          <input
            key={`sample-${idx}`}
            value={value}
            onChange={(e) => {
              const next = [...values];
              next[idx] = e.target.value;
              onChange(next);
            }}
            placeholder={`Sample for variable ${idx + 1}`}
            className="w-full rounded-lg border border-[var(--brand-border)] bg-[var(--brand-card-bg)] px-3 py-2 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,94,255,0.22)]"
          />
        ))}
      </div>
    </div>
  );
}

function countPlaceholders(text) {
  if (!text) return 0;
  const matches = text.match(/\{\{\s*[^{}]+\s*}}/g);
  return matches ? matches.length : 0;
}

function syncExampleArrayLength(count, setState) {
  setState((prev) => {
    const next = [...prev];
    while (next.length < count) next.push("");
    while (next.length > count) next.pop();
    return next;
  });
}

export default TemplateCreate;
