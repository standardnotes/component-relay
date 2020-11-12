document.addEventListener("DOMContentLoaded", function (event) {
  const rootElement = document.getElementById("root");
  const loadingText = document.getElementById("loading-text");
  const componentManager = new ComponentManager({ onReady: () => {
    loadingText.remove();
    const infoElement =  document.createElement("div");
    infoElement.innerHTML = `<h2>All systems go!</h2><p>Component UUID: ${componentManager.getSelfComponentUUID()}</p>`;
    rootElement.appendChild(infoElement);
  }});
});
