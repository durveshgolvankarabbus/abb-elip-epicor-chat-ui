// =====================================================
// ENVIRONMENT-AWARE API BASE
// =====================================================
const API_BASE = window.location.hostname.includes("azurestaticapps.net")
  ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
  : "http://localhost:7071";

// =====================================================
// DOM ELEMENTS
// =====================================================
const input = document.getElementById("questionInput");
const btn = document.getElementById("askBtn");
const status = document.getElementById("status");
const answer = document.getElementById("answer");
const summary = document.getElementById("summary");
const dataPanel = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");
const envPill = document.getElementById("envPill");
const copyBtn = document.getElementById("copyBtn");

// =====================================================
// ENV LABEL
// =====================================================
envPill.textContent = window.location.hostname.includes("azurestaticapps.net")
  ? "Azure"
  : "Local";

// =====================================================
// EVENT BINDINGS
// =====================================================
btn.addEventListener("click", ask);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});

copyBtn.addEventListener("click", copyTableToClipboard);

// Make example questions clickable (Copilot style)
document.querySelectorAll(".panel.hint li").forEach(li => {
  li.addEventListener("click", () => {
    input.value = li.textContent;
    ask();
  });
});

// =====================================================
// UI HELPERS
// =====================================================
function resetUI() {
  status.classList.add("hidden");
  answer.classList.add("hidden");
  dataPanel.classList.add("hidden");
  summary.textContent = "";
  tableContainer.innerHTML = "";
  copyBtn.classList.add("hidden");
}

function showStatus(msg) {
  status.textContent = msg;
  status.classList.remove("hidden");
}

function showError(msg) {
  status.textContent = `❌ ${msg}`;
  status.classList.remove("hidden");
}

// =====================================================
// MAIN ASK FLOW
// =====================================================
async function ask() {
  const question = input.value.trim();
  if (!question) return;

  resetUI();
  btn.disabled = true;

  // Copilot-style thinking state
  showStatus("Thinking…");

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.reason || json?.error || "Request failed");
    }

    // -------------------------
    // SUMMARY (COPILOT STYLE)
    // -------------------------
    answer.classList.remove("hidden");

    summary.innerHTML = `
      <strong>Result:</strong> ${json.metric_definition}<br/>
      <strong>Confidence:</strong> ${(json.confidence_score * 100).toFixed(0)}%<br/>
      <strong>Time Window:</strong> ${formatTimeWindow(json.time_window_applied)}
    `;

    // -------------------------
    // TABLE
    // -------------------------
    const rows = json.data || [];
    dataPanel.classList.remove("hidden");

    if (Array.isArray(rows) && rows.length > 0) {
      renderTable(rows);
      copyBtn.classList.remove("hidden");
    } else {
      tableContainer.innerHTML = "<em>No data returned.</em>";
    }

    status.classList.add("hidden");
  } catch (err) {
    console.error(err);
    showError(err.message || "Failed to connect to backend");
  } finally {
    btn.disabled = false;
  }
}

// =====================================================
// HELPERS
// =====================================================
function formatTimeWindow(tw) {
  if (!tw) return "N/A";
  if (tw.type === "rolling") return `Last ${tw.value} quarters`;
  if (tw.type === "point") return `Year ${tw.value}`;
  if (tw.type === "yoy") return "Year-over-Year";
  if (tw.type === "qoq") return "Quarter-over-Quarter";
  return tw.type;
}

function renderTable(rows) {
  const table = document.createElement("table");
  const headers = Object.keys(rows[0]);

  const thead = document.createElement("thead");
  const hr = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);

  const tbody = document.createElement("tbody");
  rows.forEach(r => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      const val = r[h] ?? "";
      td.textContent = String(val);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);

  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);
}

async function copyTableToClipboard() {
  const table = tableContainer.querySelector("table");
  if (!table) return;

  const rows = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells = [...tr.children].map(td => (td.textContent || "").trim());
    rows.push(cells.join("\t"));
  }
  await navigator.clipboard.writeText(rows.join("\n"));
  showStatus("Copied to clipboard");
  setTimeout(() => status.classList.add("hidden"), 1200);
}
