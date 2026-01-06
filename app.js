// ======================================
// Enterprise Analytics Copilot - app.js
// ======================================

// Detect environment (Azure vs local)
const API_BASE = window.location.hostname.includes("azurestaticapps.net")
  ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
  : "http://localhost:7071";

// DOM Elements (MATCHING YOUR HTML)
const questionInput = document.getElementById("questionInput");
const askBtn = document.getElementById("askBtn");

const statusSection = document.getElementById("status");
const answerSection = document.getElementById("answer");
const summaryEl = document.getElementById("summary");

const dataSection = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");

// ==========================
// Event Listeners
// ==========================
askBtn.addEventListener("click", askQuestion);

questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});

// ==========================
// Main Flow
// ==========================
async function askQuestion() {
  const question = questionInput.value.trim();

  if (!question) {
    showStatus("Please enter a question.", true);
    return;
  }

  resetUI();
  showStatus("⏳ Processing your question…");

  try {
    // Step 1: Intent routing
    const intentResponse = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!intentResponse.ok) {
      throw new Error("Failed to reach intent router.");
    }

    const intentResult = await intentResponse.json();

    if (!intentResult.endpoint) {
      showStatus("Unsupported question type.", true);
      return;
    }

    // Step 2: Call resolved endpoint
    await callEndpoint(intentResult.endpoint, question);

  } catch (err) {
    console.error(err);
    showStatus("❌ Unable to connect to backend.", true);
  }
}

async function callEndpoint(endpoint, question) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error("Query execution failed.");
    }

    const data = await response.json();
    renderResponse(data);

  } catch (err) {
    console.error(err);
    showStatus("❌ Error while processing query.", true);
  }
}

// ==========================
// Rendering
// ==========================
function renderResponse(data) {
  hideStatus();

  answerSection.classList.remove("hidden");
  summaryEl.textContent = data.summary || "Query executed successfully.";

  if (Array.isArray(data.rows) && data.rows.length > 0) {
    renderTable(data.rows);
  } else {
    tableContainer.innerHTML = "<em>No data returned.</em>";
    dataSection.classList.remove("hidden");
  }
}

function renderTable(rows) {
  dataSection.classList.remove("hidden");
  tableContainer.innerHTML = "";

  const table = document.createElement("table");
  table.className = "result-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(rows[0]).forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    Object.values(row).forEach(val => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  tableContainer.appendChild(table);
}

// ==========================
// UI Helpers
// ==========================
function showStatus(message, isError = false) {
  statusSection.textContent = message;
  statusSection.classList.remove("hidden");
  statusSection.style.color = isError ? "red" : "black";
}

function hideStatus() {
  statusSection.classList.add("hidden");
}

function resetUI() {
  hideStatus();
  answerSection.classList.add("hidden");
  dataSection.classList.add("hidden");
  summaryEl.textContent = "";
  tableContainer.innerHTML = "";
}
