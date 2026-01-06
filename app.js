// ================================
// Environment-aware API base
// ================================
const API_BASE =
  window.location.hostname.includes("azurestaticapps.net")
    ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
    : "http://localhost:7071";

// ================================
// DOM
// ================================
const input = document.getElementById("questionInput");
const btn = document.getElementById("askBtn");
const status = document.getElementById("status");
const answer = document.getElementById("answer");
const summary = document.getElementById("summary");
const data = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");

// ================================
// Events
// ================================
btn.addEventListener("click", ask);
input.addEventListener("keydown", e => {
  if (e.key === "Enter") ask();
});

// ================================
// Main flow
// ================================
async function ask() {
  const question = input.value.trim();
  if (!question) return;

  resetUI();
  showStatus("⏳ Running analysis…");

  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!res.ok) throw new Error("API error");

    const json = await res.json();

    hideStatus();
    answer.classList.remove("hidden");
    summary.textContent = json.summary || "Query executed successfully.";

    if (json.rows && json.rows.length) {
      renderTable(json.rows);
      data.classList.remove("hidden");
    } else {
      tableContainer.innerHTML = "<em>No data returned</em>";
    }

  } catch (err) {
    console.error(err);
    showStatus("❌ Failed to connect to backend", true);
  }
}

// ================================
// Rendering
// ================================
function renderTable(rows) {
  const table = document.createElement("table");
  const headers = Object.keys(rows[0]);

  table.innerHTML =
    "<thead><tr>" +
    headers.map(h => `<th>${h}</th>`).join("") +
    "</tr></thead>";

  const tbody = document.createElement("tbody");
  rows.forEach(r => {
    tbody.innerHTML +=
      "<tr>" +
      headers.map(h => `<td>${r[h]}</td>`).join("") +
      "</tr>";
  });

  table.appendChild(tbody);
  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);
}

// ================================
// UI helpers
// ================================
function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.className = "status" + (isError ? " error" : "");
  status.classList.remove("hidden");
}

function hideStatus() {
  status.classList.add("hidden");
}

function resetUI() {
  hideStatus();
  answer.classList.add("hidden");
  data.classList.add("hidden");
  tableContainer.innerHTML = "";
}
