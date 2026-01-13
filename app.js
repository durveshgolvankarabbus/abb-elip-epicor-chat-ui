// =====================================================
// ENVIRONMENT-AWARE API BASE
// =====================================================
const API_BASE =
  window.location.hostname.includes("azurestaticapps.net")
    ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
    : "http://localhost:7071";

// =====================================================
// DOM ELEMENTS
// =====================================================
const input = document.getElementById("questionInput");
const btn = document.getElementById("askBtn");
const status = document.getElementById("status");
const envPill = document.getElementById("envPill");
const tableContainer = document.getElementById("tableContainer");
const copyBtn = document.getElementById("copyBtn");

// Panels (reuse existing layout)
const answerPanel = document.getElementById("answer");
const summaryEl = document.getElementById("summary");
const dataPanel = document.getElementById("data");

// =====================================================
// ENV PILL
// =====================================================
envPill.textContent =
  window.location.hostname.includes("azurestaticapps.net") ? "Azure" : "Local";

// =====================================================
// EVENT WIRES
// =====================================================
btn.addEventListener("click", ask);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});
copyBtn.addEventListener("click", copyTableToClipboard);

// =====================================================
// UI HELPERS
// =====================================================
function resetUI() {
  status.classList.add("hidden");
  answerPanel.classList.add("hidden");
  dataPanel.classList.add("hidden");
  summaryEl.textContent = "";
  tableContainer.innerHTML = "";
  copyBtn.classList.add("hidden");
}

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.classList.remove("hidden");
  status.classList.toggle("error", isError);
}

function showThinking() {
  showStatus("Thinking");
}

function hideStatus() {
  status.classList.add("hidden");
}

// =====================================================
// MAIN ASK FLOW (COPILOT STYLE)
// =====================================================
async function ask() {
  const question = input.value.trim();
  if (!question) return;

  resetUI();
  btn.disabled = true;
  showThinking();

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.reason || json?.error || "Backend error");
    }

    hideStatus();

    // -------------------------
    // SUMMARY (CHAT RESPONSE)
    // -------------------------
    answerPanel.classList.remove("hidden");

    summaryEl.textContent =
      json.summary ||
      buildSummaryFromIntent(json) ||
      "Analysis completed successfully.";

    // -------------------------
    // DATA TABLE (IF ANY)
    // -------------------------
    const rows = json.data || [];
    dataPanel.classList.remove("hidden");

    if (Array.isArray(rows) && rows.length > 0) {
      renderTable(rows);
      copyBtn.classList.remove("hidden");
    } else {
      tableContainer.innerHTML = "<em>No data returned.</em>";
    }
  } catch (err) {
    console.error(err);
    showStatus(`❌ ${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

// =====================================================
// SMART SUMMARY BUILDER
// =====================================================
function buildSummaryFromIntent(json) {
  const metric = json.metric_definition;
  const filters = json.filters_applied || {};
  const time = json.time_window_applied;

  let parts = [];

  if (metric === "market_share") {
    parts.push("Market share analysis");
  } else if (metric === "Dollars") {
    parts.push("Revenue analysis");
  }

  if (filters.ProductCategory) {
    parts.push(`for ${filters.ProductCategory}`);
  }

  if (filters.Manufacturer) {
    parts.push(`(${filters.Manufacturer})`);
  }

  if (time?.type === "rolling") {
    parts.push(`over the last ${time.value} quarters`);
  } else if (time?.value) {
    parts.push(`for ${time.value}`);
  }

  return parts.length ? parts.join(" ") + "." : null;
}

// =====================================================
// TABLE RENDERING
// =====================================================
function renderTable(rows) {
  const table = document.createElement("table");
  const headers = Object.keys(rows[0]);

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");

  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });

  thead.appendChild(hr);

  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    headers.forEach((h) => {
      const td = document.createElement("td");
      const val = r[h] ?? "";
      td.textContent = String(val);
      if (isNumericLike(val)) td.classList.add("num");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);
}

// =====================================================
// UTILITIES
// =====================================================
function isNumericLike(v) {
  if (typeof v === "number") return true;
  if (typeof v !== "string") return false;
  return /^-?\d+(,\d{3})*(\.\d+)?$/.test(v);
}

async function copyTableToClipboard() {
  const table = tableContainer.querySelector("table");
  if (!table) return;

  const rows = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells = [...tr.children].map((td) =>
      (td.textContent || "").trim()
    );
    rows.push(cells.join("\t"));
  }

  await navigator.clipboard.writeText(rows.join("\n"));
  showStatus("✅ Table copied to clipboard.");
  setTimeout(hideStatus, 1400);
}
