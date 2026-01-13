// =====================================================
// Environment-aware API base
// =====================================================
const API_BASE =
  window.location.hostname.includes("azurestaticapps.net")
    ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
    : "http://localhost:7071";

// =====================================================
// DOM Elements
// =====================================================
const input = document.getElementById("questionInput");
const btn = document.getElementById("askBtn");
const status = document.getElementById("status");
const answer = document.getElementById("answer");
const summary = document.getElementById("summary");
const data = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");
const envPill = document.getElementById("envPill");
const copyBtn = document.getElementById("copyBtn");

envPill.textContent = window.location.hostname.includes("azurestaticapps.net")
  ? "Azure"
  : "Local";

// =====================================================
// Event Listeners
// =====================================================
btn.addEventListener("click", ask);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});
copyBtn.addEventListener("click", copyTableToClipboard);

// =====================================================
// UI Helpers
// =====================================================
function resetUI() {
  status.classList.add("hidden");
  status.classList.remove("error");
  answer.classList.add("hidden");
  data.classList.add("hidden");
  summary.textContent = "";
  tableContainer.innerHTML = "";
  copyBtn.classList.add("hidden");
}

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.classList.remove("hidden");
  status.classList.toggle("error", isError);
}

// =====================================================
// Quarter Formatting
// =====================================================
function quarterIndexToLabel(qi) {
  const year = Math.floor(qi / 4);
  const q = qi % 4 === 0 ? 4 : qi % 4;
  const adjustedYear = qi % 4 === 0 ? year - 1 : year;
  return `Q${q} ${adjustedYear}`;
}

// =====================================================
// Main Ask Function (SAFE)
// =====================================================
async function ask() {
  const question = input.value.trim();
  if (!question) return;

  resetUI();
  btn.disabled = true;
  showStatus("⏳ Running analysis…");

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    // ✅ SAFE RESPONSE PARSING
    let json = null;
    const text = await res.text();

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from backend");
      }
    }

    if (!res.ok) {
      throw new Error(json?.error || "Backend error");
    }

    status.classList.add("hidden");
    answer.classList.remove("hidden");

    summary.textContent =
      json?.summary ||
      "Analysis completed successfully based on available market data.";

    const rows = json?.data || [];
    if (Array.isArray(rows) && rows.length > 0) {
      data.classList.remove("hidden");
      renderTable(rows);
      copyBtn.classList.remove("hidden");
    } else {
      data.classList.remove("hidden");
      tableContainer.innerHTML = "<em>No data returned.</em>";
    }

  } catch (err) {
    console.error(err);
    showStatus(`❌ ${err.message || "Failed to connect to backend"}`, true);
  } finally {
    btn.disabled = false;
  }
}

// =====================================================
// Table Rendering (Executive-Safe)
// =====================================================
function renderTable(rows) {
  const table = document.createElement("table");

  const rawHeaders = Object.keys(rows[0]);
  const headers = rawHeaders.map(h =>
    h === "quarter_index" ? "Quarter" : h
  );

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

    rawHeaders.forEach(h => {
      const td = document.createElement("td");
      let val = r[h] ?? "";

      if (h === "quarter_index") {
        val = quarterIndexToLabel(val);
      }

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

// =====================================================
// Copy to Clipboard
// =====================================================
async function copyTableToClipboard() {
  const table = tableContainer.querySelector("table");
  if (!table) return;

  const rows = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells = [...tr.children].map(td =>
      (td.textContent || "").trim()
    );
    rows.push(cells.join("\t"));
  }

  await navigator.clipboard.writeText(rows.join("\n"));
  showStatus("✅ Table copied to clipboard.");
  setTimeout(() => status.classList.add("hidden"), 1400);
}
