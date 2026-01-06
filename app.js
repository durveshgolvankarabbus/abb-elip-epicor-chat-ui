// Environment-aware API base
const API_BASE =
  window.location.hostname.includes("azurestaticapps.net")
    ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
    : "http://localhost:7071";

const input = document.getElementById("questionInput");
const btn = document.getElementById("askBtn");
const status = document.getElementById("status");
const answer = document.getElementById("answer");
const summary = document.getElementById("summary");
const data = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");
const envPill = document.getElementById("envPill");
const copyBtn = document.getElementById("copyBtn");

envPill.textContent = window.location.hostname.includes("azurestaticapps.net") ? "Azure" : "Local";

btn.addEventListener("click", ask);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ask();
});

copyBtn.addEventListener("click", copyTableToClipboard);

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

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "API error");

    status.classList.add("hidden");
    answer.classList.remove("hidden");
    summary.textContent = json.summary || "Query executed successfully.";

    const rows = json.rows || json.table || [];
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

function isNumericLike(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  // currency: $1,234 or $1,234.5
  if (/^\$\s?-?\d{1,3}(,\d{3})*(\.\d)?$/.test(s)) return true;
  // numeric with commas: 1,234 or 12,345
  if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) return true;
  return false;
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
      if (isNumericLike(String(val))) td.classList.add("num");
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
  const text = rows.join("\n");
  await navigator.clipboard.writeText(text);
  showStatus("✅ Table copied to clipboard.");
  setTimeout(() => status.classList.add("hidden"), 1400);
}
