// ===============================
// Enterprise Analytics Copilot UI
// app.js
// ===============================

// Auto-detect backend URL (local vs Azure)
const API_BASE =
  window.location.hostname.includes("azurestaticapps.net")
    ? "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net"
    : "http://localhost:7071";

// DOM elements
const questionInput = document.getElementById("question");
const answerDiv = document.getElementById("answer");
const dataDiv = document.getElementById("data");
const askButton = document.getElementById("ask-btn");

// Attach click handler
askButton.addEventListener("click", askQuestion);

// Allow Enter key
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});

async function askQuestion() {
  const question = questionInput.value.trim();
  if (!question) {
    showError("Please enter a question.");
    return;
  }

  // Reset UI
  answerDiv.innerHTML = "⏳ Thinking…";
  dataDiv.innerHTML = "";

  try {
    const response = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    // If intent router response
    if (result.endpoint) {
      await callIntentEndpoint(result.endpoint, question);
      return;
    }

    // Fallback (health/help response)
    renderRaw(result);

  } catch (err) {
    showError("Failed to connect to backend.");
    console.error(err);
  }
}

async function callIntentEndpoint(endpoint, question) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    renderResponse(data);

  } catch (err) {
    showError("Query failed while processing data.");
    console.error(err);
  }
}

// ===============================
// Rendering Helpers
// ===============================

function renderResponse(data) {
  // Clear loading
  answerDiv.innerHTML = "";
  dataDiv.innerHTML = "";

  // Human summary (if present)
  if (data.summary) {
    answerDiv.innerHTML = `<strong>${data.summary}</strong>`;
  } else {
    answerDiv.innerHTML = "✅ Query executed successfully.";
  }

  // Tabular or JSON output
  if (Array.isArray(data.rows)) {
    renderTable(data.rows);
  } else {
    renderRaw(data);
  }
}

function renderTable(rows) {
  if (!rows.length) {
    dataDiv.innerHTML = "No data returned.";
    return;
  }

  const table = document.createElement("table");
  table.border = "1";
  table.cellPadding = "6";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  Object.keys(rows[0]).forEach(col => {
    const th = document.createElement("th");
    th.innerText = col;
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
      td.innerText = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  dataDiv.appendChild(table);
}

function renderRaw(obj) {
  dataDiv.innerHTML = `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
}

function showError(msg) {
  answerDiv.innerHTML = `❌ ${msg}`;
  dataDiv.innerHTML = "";
}
