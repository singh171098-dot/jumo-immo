const dot = document.getElementById("jumo-dot");
const statusText = document.getElementById("jumo-status-text");
const triggerButton = document.getElementById("jumo-trigger");
const resultBox = document.getElementById("jumo-result");

const STATUS_LABELS = {
  idle: "Prêt à analyser",
  scraping: "Analyse en cours…",
  success: "Dernière analyse réussie",
  error: "Dernière analyse en échec",
};

function setDot(status) {
  dot.className = `jumo-dot ${status}`;
}

function renderResult(lastResult) {
  if (!lastResult) {
    resultBox.innerHTML = "";
    return;
  }
  const { status, payload, error, timestamp } = lastResult;
  const date = timestamp ? new Date(timestamp).toLocaleTimeString("fr-FR") : "";

  if (status === "error") {
    resultBox.innerHTML = `<strong>Erreur</strong> (${date})<br>${error || "Échec inconnu"}`;
    return;
  }

  if (payload) {
    resultBox.innerHTML = `
      <strong>${payload.title || "Annonce"}</strong> (${date})<br>
      ${payload.price ? `${payload.price} € · ` : ""}${payload.surface ? `${payload.surface} m² · ` : ""}${payload.location || ""}
    `;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refreshStatus() {
  const tab = await getActiveTab();
  if (!tab?.id) {
    setDot("idle");
    statusText.textContent = "Aucun onglet actif";
    triggerButton.disabled = true;
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "JUMO_PING" });
    triggerButton.disabled = false;
  } catch {
    setDot("idle");
    statusText.textContent = "Non disponible sur cette page";
    triggerButton.disabled = true;
    return;
  }

  const stored = await chrome.storage.local.get(["jumoStatus", "jumoLastResult"]);
  const status = stored.jumoStatus || "idle";
  setDot(status);
  statusText.textContent = STATUS_LABELS[status] || STATUS_LABELS.idle;
  renderResult(stored.jumoLastResult);
}

triggerButton.addEventListener("click", async () => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  triggerButton.disabled = true;
  setDot("scraping");
  statusText.textContent = STATUS_LABELS.scraping;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "JUMO_TRIGGER_SCRAPE" });
  } catch {
    setDot("error");
    statusText.textContent = "Impossible de contacter la page";
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.jumoStatus) {
    setDot(changes.jumoStatus.newValue);
    statusText.textContent = STATUS_LABELS[changes.jumoStatus.newValue] || STATUS_LABELS.idle;
    triggerButton.disabled = false;
  }
  if (changes.jumoLastResult) {
    renderResult(changes.jumoLastResult.newValue);
  }
});

refreshStatus();
