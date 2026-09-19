// State Management
let currentLanguage = 'en'; // 'en' or 'hi'
let selectedCategory = 'roads';
let userLat = 26.2389;
let userLng = 73.0243;
let map, marker, wardPolygon;
let mediaRecorder, audioChunks = [], isRecording = false, timerInterval, secondsElapsed = 0;
let webcamStream = null;
let audioBlob = null;
let selectedImageFile = null;

// Bilingual Translations Dictionary
const translations = {
  en: {
    tagline: "Citizen Infrastructure Reporting",
    langBtn: "हिंदी में देखें",
    userName: "Alex Rivera",
    userLoc: "Jodhpur, RJ",
    titleUserInfo: "Your Contact Details",
    subUserInfo: "Enter your information so authorities can update you on resolution",
    lblName: "Full Name *",
    lblPhone: "Phone Number (+91) *",
    lblAddress: "Location / Address Details *",
    btnDetectLoc: "Detect My Location",
    titleCategory: "Select Problem Category",
    subCategory: "What type of public infrastructure needs repair or attention?",
    catRoadsTitle: "Civil / Roads & Potholes",
    catRoadsDesc: "Potholes, broken asphalt, damaged pavements, open manholes, footpaths",
    catElecTitle: "Electrical & Lighting",
    catElecDesc: "Non-functional streetlights, hanging dangerous wires, damaged transformers",
    catSanitationTitle: "Sanitation & Garbage",
    catSanitationDesc: "Overflowing garbage dumps, uncleaned waste, sewer leaks, drainage blockage",
    catInfraTitle: "Public Infrastructure",
    catInfraDesc: "Damaged bus stands, broken public park benches, leaking public water pipes",
    titleMap: "Pin Exact Problem Location",
    subMap: "Drag the red map pin directly over the damaged area",
    lblWardTitle: "Ward Detected:",
    titleDescribe: "Describe & Attach Evidence",
    subDescribe: "Use any or all of the 3 modes below to explain the issue",
    modeTextTitle: "1. Write Text Description",
    modeTextSub: "Provide written details, landmarks, or severity",
    textPlaceholder: "Describe the problem in detail (e.g., Deep pothole near the main crossing causing traffic hazard)...",
    modeVoiceTitle: "2. Record Audio Voice Note",
    modeVoiceSub: "Speak your complaint into your microphone",
    voiceIdle: "Click button to start recording",
    voiceActive: "Recording live audio...",
    modePhotoTitle: "3. Take Photo or Upload Image",
    modePhotoSub: "Capture live photo using camera or upload file",
    txtStartCam: "Open Camera",
    txtSnapPhoto: "Snap Photo",
    txtDropzone: "Click or Drag & Drop photo here",
    txtDropzoneSub: "PNG, JPG up to 10MB",
    btnSubmitText: "Submit Infrastructure Complaint",
    titleRecent: "Recent Reported Issues in Jodhpur",
    subRecent: "Community issues submitted by citizens in nearby wards",
    modalSuccessTitle: "Complaint Registered Successfully!",
    modalMsg: "Your report has been dispatched to the Municipal Corporation maintenance desk.",
    lblModCat: "Category:",
    lblModWard: "Assigned Ward:",
    lblModEst: "Estimated Dispatch:"
  },
  hi: {
    tagline: "नागरिक अवसंरचना रिपोर्टिंग",
    langBtn: "Switch to English",
    userName: "अलेक्स रिवेरा",
    userLoc: "जोधपुर, राजस्थान",
    titleUserInfo: "आपकी संपर्क जानकारी",
    subUserInfo: "अपनी जानकारी दर्ज करें ताकि अधिकारी समस्या समाधान पर आपको अपडेट दे सकें",
    lblName: "पूरा नाम *",
    lblPhone: "फ़ोन नंबर (+91) *",
    lblAddress: "स्थान / पता का विवरण *",
    btnDetectLoc: "मेरा स्थान खोजें",
    titleCategory: "समस्या की श्रेणी चुनें",
    subCategory: "किस सार्वजनिक ढांचे को मरम्मत या ध्यान देने की आवश्यकता है?",
    catRoadsTitle: "सिविल / सड़कें और गड्ढे",
    catRoadsDesc: "सड़क के गड्ढे, टूटी डामर सड़क, क्षतिग्रस्त फुटपाथ, खुले मैनहोल",
    catElecTitle: "इलेक्ट्रिकल और स्ट्रीटलाइट",
    catElecDesc: "बंद पड़ी स्ट्रीटलाइट्स, लटकते खतरनाक तार, खराब ट्रांसफार्मर",
    catSanitationTitle: "स्वच्छता और कचरा",
    catSanitationDesc: "कचरे के ढेर, सीवर का पानी बहना, नालियों का अवरोध",
    catInfraTitle: "सार्वजनिक बुनियादी ढांचा",
    catInfraDesc: "टूटे बस स्टॉप, पार्कों की टूटी बेंच, लीक होती सार्वजनिक पानी की पाइप",
    titleMap: "मानचित्र (Map) पर सटीक स्थान चुनें",
    subMap: "लाल पिन को खींचकर ठीक क्षतिग्रस्त जगह पर रखें",
    lblWardTitle: "पहचाना गया वार्ड:",
    titleDescribe: "समस्या का विवरण और साक्ष्य दें",
    subDescribe: "समस्या बताने के लिए नीचे दिए गए 3 माध्यमों में से किसी का भी उपयोग करें",
    modeTextTitle: "1. विवरण लिखकर बताएं",
    modeTextSub: "लिखित विवरण, लैंडमार्क या समस्या की गंभीरता दर्ज करें",
    textPlaceholder: "समस्या का विस्तार से वर्णन करें (जैसे: मुख्य चौराहे के पास गहरा गड्ढा जिससे दुर्घटना का खतरा है)...",
    modeVoiceTitle: "2. अपनी आवाज़ रिकॉर्ड करें",
    modeVoiceSub: "माइक में बोलकर अपनी शिकायत दर्ज कराएं",
    voiceIdle: "रिकॉर्डिंग शुरू करने के लिए बटन दबाएं",
    voiceActive: "आवाज़ रिकॉर्ड हो रही है...",
    modePhotoTitle: "3. फोटो खींचें या अपलोड करें",
    modePhotoSub: "कैमरे से फोटो खींचें या फ़ाइल अपलोड करें",
    txtStartCam: "कैमरा खोलें",
    txtSnapPhoto: "फोटो खींचें",
    txtDropzone: "फोटो यहां ड्रैग करें या क्लिक करके चुनें",
    txtDropzoneSub: "PNG, JPG 10MB तक",
    btnSubmitText: "शिकायत दर्ज करें",
    titleRecent: "जोधपुर में हाल ही में दर्ज शिकायतें",
    subRecent: "आस-पास के वार्डों में नागरिकों द्वारा दर्ज कराई गई समस्याएं",
    modalSuccessTitle: "शिकायत सफलतापूर्वक दर्ज की गई!",
    modalMsg: "आपकी शिकायत नगर निगम रखरखाव विभाग को भेज दी गई है।",
    lblModCat: "श्रेणी:",
    lblModWard: "आवंटित वार्ड:",
    lblModEst: "अनुमानित समय:"
  }
};

// Ward Boundary Polygons Mock Data (Jodhpur Area)
const wardsData = [
  {
    name: "Ward 101 - Shastri Nagar",
    color: "#1a73e8",
    polygon: [
      [26.245, 73.015],
      [26.245, 73.030],
      [26.230, 73.030],
      [26.230, 73.015]
    ]
  },
  {
    name: "Ward 102 - Ratanada",
    color: "#34a853",
    polygon: [
      [26.245, 73.030],
      [26.245, 73.045],
      [26.230, 73.045],
      [26.230, 73.030]
    ]
  }
];

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  renderSampleTickets();
});

// Map Initialization (Leaflet)
function initMap() {
  map = L.map('map').setView([userLat, userLng], 14);

  // Google Maps Style Canvas Layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  // Render Ward Polygons
  wardsData.forEach(w => {
    L.polygon(w.polygon, {
      color: w.color,
      fillColor: w.color,
      fillOpacity: 0.15,
      weight: 2
    }).addTo(map).bindPopup(w.name);
  });

  // Draggable Marker Pin
  marker = L.marker([userLat, userLng], { draggable: true }).addTo(map);

  marker.on('dragend', function (e) {
    const coord = e.target.getLatLng();
    userLat = coord.lat;
    userLng = coord.lng;
    checkPointInWard(userLat, userLng);
    updateAddressFromCoordinates(userLat, userLng);
  });

  map.on('click', function(e) {
    userLat = e.latlng.lat;
    userLng = e.latlng.lng;
    marker.setLatLng(e.latlng);
    checkPointInWard(userLat, userLng);
    updateAddressFromCoordinates(userLat, userLng);
  });
}

// Ray-Casting Algorithm to find Ward Polygon
function checkPointInWard(lat, lng) {
  let foundWard = "Ward 103 - Sardarpura"; // Fallback

  for (let w of wardsData) {
    let poly = w.polygon;
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      let xi = poly[i][0], yi = poly[i][1];
      let xj = poly[j][0], yj = poly[j][1];

      let intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    if (inside) {
      foundWard = w.name;
      break;
    }
  }
  document.getElementById('wardBadgeName').innerText = foundWard;
}

async function updateAddressFromCoordinates(lat, lng) {
  const addressInput = document.getElementById('inputAddress');
  addressInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`
    );
    if (!response.ok) return;

    const result = await response.json();
    if (result.display_name) {
      addressInput.value = result.display_name;
    }
  } catch (error) {
    return;
  }
}

// Detect GPS Location
function detectUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      map.flyTo([userLat, userLng], 15);
      marker.setLatLng([userLat, userLng]);
      checkPointInWard(userLat, userLng);
      updateAddressFromCoordinates(userLat, userLng);
    }, () => {
      alert("GPS location access denied or unavailable.");
    });
  }
}

// Toggle Language (English ↔ Hindi)
function toggleLanguage() {
  currentLanguage = currentLanguage === 'en' ? 'hi' : 'en';
  const dict = translations[currentLanguage];

  // UI Text Translations
  document.getElementById('txt-tagline').innerText = dict.tagline;
  document.getElementById('langText').innerText = dict.langBtn;
  document.getElementById('profileName').innerText = dict.userName;
  document.getElementById('profileLoc').innerText = dict.userLoc;
  
  document.getElementById('title-user-info').innerText = dict.titleUserInfo;
  document.getElementById('sub-user-info').innerText = dict.subUserInfo;
  document.getElementById('lbl-name').innerText = dict.lblName;
  document.getElementById('lbl-phone').innerText = dict.lblPhone;
  document.getElementById('lbl-address').innerText = dict.lblAddress;
  document.getElementById('btn-detect-loc').innerText = dict.btnDetectLoc;

  document.getElementById('title-category').innerText = dict.titleCategory;
  document.getElementById('sub-category').innerText = dict.subCategory;
  document.getElementById('cat-roads-title').innerText = dict.catRoadsTitle;
  document.getElementById('cat-roads-desc').innerText = dict.catRoadsDesc;
  document.getElementById('cat-elec-title').innerText = dict.catElecTitle;
  document.getElementById('cat-elec-desc').innerText = dict.catElecDesc;
  document.getElementById('cat-sanitation-title').innerText = dict.catSanitationTitle;
  document.getElementById('cat-sanitation-desc').innerText = dict.catSanitationDesc;
  document.getElementById('cat-infra-title').innerText = dict.catInfraTitle;
  document.getElementById('cat-infra-desc').innerText = dict.catInfraDesc;

  document.getElementById('title-map').innerText = dict.titleMap;
  document.getElementById('sub-map').innerText = dict.subMap;
  document.getElementById('lbl-ward-title').innerText = dict.lblWardTitle;

  document.getElementById('title-describe').innerText = dict.titleDescribe;
  document.getElementById('sub-describe').innerText = dict.subDescribe;
  document.getElementById('mode-text-title').innerText = dict.modeTextTitle;
  document.getElementById('mode-text-sub').innerText = dict.modeTextSub;
  document.getElementById('textDescription').placeholder = dict.textPlaceholder;
  
  document.getElementById('mode-voice-title').innerText = dict.modeVoiceTitle;
  document.getElementById('mode-voice-sub').innerText = dict.modeVoiceSub;
  document.getElementById('voiceStatusLabel').innerText = isRecording ? dict.voiceActive : dict.voiceIdle;

  document.getElementById('mode-photo-title').innerText = dict.modePhotoTitle;
  document.getElementById('mode-photo-sub').innerText = dict.modePhotoSub;
  document.getElementById('txt-start-cam').innerText = dict.txtStartCam;
  document.getElementById('txt-snap-photo').innerText = dict.txtSnapPhoto;
  document.getElementById('txt-dropzone').innerText = dict.txtDropzone;
  document.getElementById('txt-dropzone-sub').innerText = dict.txtDropzoneSub;

  document.getElementById('btn-submit-text').innerText = dict.btnSubmitText;
  document.getElementById('title-recent').innerText = dict.titleRecent;
  document.getElementById('sub-recent').innerText = dict.subRecent;

  document.getElementById('modal-success-title').innerText = dict.modalSuccessTitle;
  document.getElementById('modalMsg').innerText = dict.modalMsg;
  document.getElementById('lbl-mod-cat').innerText = dict.lblModCat;
  document.getElementById('lbl-mod-ward').innerText = dict.lblModWard;
  document.getElementById('lbl-mod-est').innerText = dict.lblModEst;
}

// Category Selection Function
function selectCategory(cat, element) {
  selectedCategory = cat;
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('active'));
  element.classList.add('active');
}

// Voice Recorder Functions
async function toggleVoiceRecording() {
  const recordBtn = document.getElementById('recordBtn');
  const statusLabel = document.getElementById('voiceStatusLabel');
  const dict = translations[currentLanguage];

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        document.getElementById('audioPreview').src = audioUrl;
        document.getElementById('audioPlaybackContainer').style.display = 'flex';
      };

      mediaRecorder.start();
      isRecording = true;
      recordBtn.classList.add('recording');
      statusLabel.innerText = dict.voiceActive;
      startTimer();
      startWaveformVisualizer();

    } catch (err) {
      alert("Microphone permission denied or microphone not found.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.classList.remove('recording');
    statusLabel.innerText = dict.voiceIdle;
    stopTimer();
  }
}

function startTimer() {
  secondsElapsed = 0;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('voiceTimer').innerText = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function clearAudioNote() {
  document.getElementById('audioPlaybackContainer').style.display = 'none';
  document.getElementById('voiceTimer').innerText = "00:00";
}

function startWaveformVisualizer() {
  const canvas = document.getElementById('waveformCanvas');
  const ctx = canvas.getContext('2d');
  
  function draw() {
    if (!isRecording) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    requestAnimationFrame(draw);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ea4335';

    for (let i = 0; i < canvas.width; i += 8) {
      const h = Math.random() * canvas.height;
      ctx.fillRect(i, (canvas.height - h) / 2, 4, h);
    }
  }
  draw();
}

// Camera & Photo Upload Functions
async function startWebcam() {
  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById('webcamVideo').srcObject = webcamStream;
    document.getElementById('btnStartCamera').style.display = 'none';
    document.getElementById('btnSnapPhoto').style.display = 'inline-flex';
  } catch (err) {
    alert("Camera access denied or webcam not available.");
  }
}

function capturePhoto() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('photoCanvas');
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    selectedImageFile = new File([blob], 'camera-capture.png', { type: 'image/png' });
    displayPhotoPreview(canvas.toDataURL('image/png'));
  }, 'image/png');

  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
  }
  document.getElementById('btnSnapPhoto').style.display = 'none';
  document.getElementById('btnStartCamera').style.display = 'inline-flex';
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = function(e) {
      displayPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

function displayPhotoPreview(src) {
  document.getElementById('photoPreviewImg').src = src;
  document.getElementById('photoPreviewCard').style.display = 'flex';
}

function removePhoto() {
  selectedImageFile = null;
  document.getElementById('photoPreviewCard').style.display = 'none';
  document.getElementById('photoPreviewImg').src = '';
}

// Ticket Submission & Modal Control
async function submitTicket() {
  const ticketId = "CP-" + Math.floor(100000 + Math.random() * 900000);
  const ward = document.getElementById('wardBadgeName').innerText;

  const formData = new FormData();
  formData.append('name', document.getElementById('inputName').value);
  formData.append('phone', document.getElementById('inputPhone').value);
  formData.append('address', document.getElementById('inputAddress').value);
  formData.append('category', selectedCategory);
  formData.append('description', document.getElementById('textDescription').value);
  formData.append('latitude', userLat);
  formData.append('longitude', userLng);
  if (selectedImageFile) formData.append('image', selectedImageFile);
  if (audioBlob) formData.append('audio', audioBlob, 'voice-note.webm');

  try {
    const response = await fetch('/api/incidents', { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Input service rejected the report');
    document.getElementById('modalTicketId').innerText = result.ticket_id;
  } catch (error) {
    console.warn('Python input API unavailable; using local mock ticket.', error);
    document.getElementById('modalTicketId').innerText = ticketId;
  }

  document.getElementById('modalCat').innerText = selectedCategory.toUpperCase();
  document.getElementById('modalWard').innerText = ward;

  document.getElementById('confirmationModal').classList.add('show');
}

function closeModal() {
  document.getElementById('confirmationModal').classList.remove('show');
  document.getElementById('textDescription').value = '';
  removePhoto();
  clearAudioNote();
  audioBlob = null;
}

// Sample Feed Render
function renderSampleTickets() {
  const feed = document.getElementById('ticketsFeed');
  const samples = [
    { cat: "Roads", title: "Dangerous Pothole on Main Road", ward: "Ward 101 - Shastri Nagar", votes: 24, bg: "#fef7e0", color: "#b06000" },
    { cat: "Sanitation", title: "Overflowing Garbage Container", ward: "Ward 102 - Ratanada", votes: 18, bg: "#e6f4ea", color: "#137333" },
    { cat: "Electrical", title: "Streetlight outage near school", ward: "Ward 101 - Shastri Nagar", votes: 9, bg: "#e8f0fe", color: "#1a73e8" }
  ];

  feed.innerHTML = samples.map(item => `
    <div class="ticket-card">
      <div class="ticket-left">
        <span class="ticket-cat-tag" style="background:${item.bg}; color:${item.color}">${item.cat}</span>
        <div class="ticket-details">
          <h4>${item.title}</h4>
          <p>📍 ${item.ward} • 2 hours ago</p>
        </div>
      </div>
      <button class="upvote-btn" onclick="toggleUpvote(this)">
        👍 <span>${item.votes}</span>
      </button>
    </div>
  `).join('');
}

function toggleUpvote(btn) {
  const countSpan = btn.querySelector('span');
  let count = parseInt(countSpan.innerText);
  if (btn.classList.contains('active')) {
    btn.classList.remove('active');
    countSpan.innerText = count - 1;
  } else {
    btn.classList.add('active');
    countSpan.innerText = count + 1;
  }
}