// 🔗 Production API base (YOUR LIVE FUNCTION APP)
const API_BASE =
  "https://abb-elip-epicor-chatbot-g2hvgdadgtdycsdm.eastus-01.azurewebsites.net/api";

const askBtn = document.getElementById("askBtn");
const questionInput = document.getElementById("questionInput");
const statusEl = document.getElementById("status");
const answerEl = document.getElementById("answer");
const summaryEl = document.getElementById("summary");
const dataEl = document.getElementById("data");
const tableContainer = document.getElementById("tableContainer");

askBtn.addEventListener("click", askQuestion);
questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") askQuestion();
});

function setStatus(msg, type = "") {
  statusEl.textContent = msg;
  statusEl.className = "status " + (type || "");
  statusEl.classList.remove("hidden");
}

function clearUI() {
  statusEl.classList.add("hidden");
  answerEl.classList.add("hidden");
  dataEl.classList.add("hidden");
  summaryEl.textContent = "";
  tableContainer.innerHTML = "";
}

async function askQuestion() {
  const question = questionInput.value.trim();
  if (!question) return;

  clearUI();
  setStatus("Thinking...");

  try {
    // 1) Ask router
    const askResp = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const askJson = await askResp.json();

    if (!askResp.ok || askJson.intent === "UNKNOWN") {
      throw new Error(askJson.message || "Could not understand the question.");
    }

    // 2) Call resolved endpoint
    const dataResp = await fetch(`${API_BASE}${askJson.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const dataJson = await dataResp.json();

    if (!dataResp.ok || dataJson.error) {
      throw new Error(dataJson.error || "Data request failed.");
    }

    // 3) Render
    setStatus("Success", "success");
    renderSummary(askJson.intent, dataJson);
    renderTable(dataJson.rows || []);

  } catch (err) {
    setStatus(err.message, "error");
  }
}

function renderSummary(intent, data) {
  let text = `Intent detected: ${intent}.`;
  if (data.year && data.quarter) {
    text += ` Period: ${data.quarter} ${data.year}.`;
  }
  answerEl.classList.remove("hidden");
  summaryEl.textContent = text;
}

function renderTable(rows) {
  if (!rows || rows.length === 0) return;

  const cols = Object.keys(rows[0]);
  let html = "<table><thead><tr>";
  cols.forEach(c => html += `<th>${c}</th>`);
  html += "</tr></thead><tbody>";

  rows.forEach(r => {
    html += "<tr>";
    cols.forEach(c => html += `<td>${r[c]}</td>`);
    html += "</tr>";
  });
  html += "</tbody></table>";

  tableContainer.innerHTML = html;
  dataEl.classList.remove("hidden");
}
