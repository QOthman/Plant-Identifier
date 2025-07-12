// Global variables
let base64Image = "";
let stream = null;
let currentSuggestions = [];

// DOM elements
const imageInput = document.getElementById("imageInput");
const resultDiv = document.getElementById("result");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const cameraSection = document.getElementById("cameraSection");
const cameraBtn = document.getElementById("cameraBtn");
const captureBtn = document.getElementById("captureBtn");
const uploadSection = document.getElementById("uploadSection");
const header = document.getElementById("header");
const mainCard = document.getElementById("mainCard");
const themeToggle = document.getElementById("themeToggle");


// Event listeners
imageInput.addEventListener("change", handleImageUpload);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = stream;

    // Hide upload section with animation
    uploadSection.classList.add("fade-out");
    setTimeout(() => {
      uploadSection.classList.add("hidden");
    }, 300);

    // Show camera section and add expanded class
    cameraSection.classList.remove("hidden");
    cameraSection.classList.add("expanded");

    // Add camera-active class to header and main card
    header.classList.add("camera-active");
    mainCard.classList.add("camera-active");

    cameraBtn.disabled = true;

    // Clear previous results
    resultDiv.innerHTML = "";

  } catch (error) {
    console.error("Error accessing camera:", error);
    showAlert("Unable to access camera. Please check permissions or use photo selection instead.");
  }
}

function capturePhoto() {
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL('image/jpeg', 0.8);
  base64Image = dataURL.split(",")[1];

  stopCamera();

  resultDiv.innerHTML = "";
  identifyPlant();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  // Hide camera section and remove expanded class
  cameraSection.classList.add("hidden");
  cameraSection.classList.remove("expanded");

  // Remove camera-active class from header and main card
  header.classList.remove("camera-active");
  mainCard.classList.remove("camera-active");

  // Show upload section with animation
  uploadSection.classList.remove("fade-out");
  uploadSection.classList.remove("hidden");

  cameraBtn.disabled = false;
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    base64Image = reader.result.split(",")[1];

    resultDiv.innerHTML = "";
    identifyPlant();
  };
  reader.readAsDataURL(file);
}

async function identifyPlant() {
  if (!base64Image) {
    showAlert("Please select or take a photo of a plant first.");
    return;
  }

  resultDiv.innerHTML = `
        <div class="result-card fade-in">
          <div class="loading">
            <div class="spinner"></div>
            Identifying plant...
          </div>
        </div>
      `;

  try {

    const response = await fetch("/api/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ base64Image })
    });


    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.result.classification.suggestions && data.result.classification.suggestions.length > 0) {
      displaySuggestions(data.result.classification.suggestions);
    } else {
      resultDiv.innerHTML = `
            <div class="result-card fade-in">
              <h3>❌ Identification Failed</h3>
              <p>Could not identify the plant. Try taking a clearer photo with good lighting, focusing on the leaves or flowers.</p>
            </div>
          `;
    }
  } catch (error) {
    console.error("Error:", error);
    resultDiv.innerHTML = `
          <div class="result-card fade-in">
            <h3>⚠️ Service Error</h3>
            <p>The plant identification service is currently unavailable. Please try again later.</p>
          </div>
        `;
  }
}

function displayPlantResult(plant) {
  const plantName = plant.name || "Unknown Plant";
  const probability = plant.probability || 0;
  const commonNames = plant.details?.common_names || [];
  const url = plant.details?.url;
  // console.log("Plant details:", plant);

  resultDiv.innerHTML = `
        <div class="result-card fade-in">
          <button class="back-btn">← Back to Suggestions</button>
          <img src="${plant.similar_images[0]?.url || `data:image/jpeg;base64,${base64Image}`}" alt="${plantName}" class="plant-image" />
          <h3>🌿 ${plantName}</h3>
          <p><strong>Common Names:</strong> ${commonNames.length > 0 ? commonNames.join(", ") : "N/A"
    }</p>
          <p><strong>Confidence:</strong> ${(probability * 100).toFixed(1)}%</p>
          ${url ? `<p><a href="${url}" target="_blank" class="link">🔗 Learn More</a></p>` : ""}
        </div>
        ${generateCareInstructions(plantName)}
      `;
  document.querySelector(".back-btn").addEventListener("click", () => {
    displaySuggestions(currentSuggestions)
  });
}

function generateCareInstructions(plantName) {
  const careInstructions = {
    water: "Water when top inch of soil is dry",
    light: "Bright, indirect light",
    temperature: "65-75°F (18-24°C)",
    humidity: "Moderate humidity (40-60%)",
    fertilizer: "Monthly during growing season"
  };

  return `
        <div class="care-tips fade-in">
          <h4>🌱 Care Guide for ${plantName}</h4>
          <p><strong>💧 Watering:</strong> ${careInstructions.water}</p>
          <p><strong>☀️ Light:</strong> ${careInstructions.light}</p>
          <p><strong>🌡️ Temperature:</strong> ${careInstructions.temperature}</p>
          <p><strong>🍃 Humidity:</strong> ${careInstructions.humidity}</p>
          <p><strong>🌿 Fertilizer:</strong> ${careInstructions.fertilizer}</p>
        </div>
      `;
}

function clearResults() {
  resultDiv.innerHTML = "";
  base64Image = "";
  imageInput.value = "";
  stopCamera();
}

function showAlert(message) {
  // Create a custom alert that matches the design
  const alertDiv = document.createElement('div');
  alertDiv.className = 'result-card fade-in';
  alertDiv.innerHTML = `
        <h3>ℹ️ Information</h3>
        <p>${message}</p>
      `;

  resultDiv.innerHTML = '';
  resultDiv.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}


function displaySuggestions(plants) {
  if (plants.length === 0) return;
  resultDiv.innerHTML = "";
  const list = document.createElement('div');
  list.className = 'result-card fade-in';
  list.innerHTML = `<h4>🌿 Suggestions</h4>`;
  currentSuggestions = plants;
  plants.forEach((plant) => {
    const name = plant.name || "Unknown";
    const confidence = (plant.probability * 100).toFixed(1);
    const imgUrl = plant.similar_images?.[0]?.url;

    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
      ${imgUrl ? `<img src="${imgUrl}" alt="${name}" class="suggestion-thumb" />` : ""}
      <div class="suggestion-info">
        <strong>${name}</strong><br />
        Confidence: ${confidence}%
      </div>
    `;

    item.onclick = () => {
      displayPlantResult(plant);
    };

    list.appendChild(item);
  });

  resultDiv.appendChild(list);
}


// On change toggle class and store preference
themeToggle.addEventListener("change", () => {
  const isDark = themeToggle.checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Load saved preference on page load
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  const isDark = savedTheme === "dark";

  document.body.classList.toggle("dark", isDark);
  themeToggle.checked = isDark;
});