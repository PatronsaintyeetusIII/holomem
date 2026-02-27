const EMBEDDED_API_KEY = "1a57d506-cfc8-4eb5-9a54-cf307dcd5b45";   // ← CHANGE THIS

const API_BASE = "https://holodex.net/api/v2";
let API_KEY = EMBEDDED_API_KEY || localStorage.getItem("holodex_key") || "";

let calendar = null;
let allVideos = [];

const birthdays = {
  "Usada Pekora": "01-12",
  "Ayunda Risu": "01-15",
  "Aragami Oga": "01-15",
  "Regis Altare": "01-29",
  "Omaru Polka": "01-30",
  "Fuwawa Abyssgard": "02-01",
  "Mococo Abyssgard": "02-02",
  "Nekomata Okayu": "02-22",
  "Hoshimachi Suisei": "03-22",
  "Momosuzu Nene": "03-02",
  // Add more...
};

const debuts = {
  "Tokino Sora": "2017-09-07",
  "Roboco-san": "2018-03-04",
  "Hoshimachi Suisei": "2018-03-22",
  "Yozora Mel (Graduated)": "2018-05-13",
  "Shirakami Fubuki": "2018-06-01",
  "Natsuiro Matsuri": "2018-06-01",
  "Aki Rosenthal": "2018-06-01",
  "Akai Haato": "2018-06-02",
  "Hitomi Chris (Graduated)": "2018-06-03",
  "Sakura Miko": "2018-08-01",
  "Minato Aqua (Graduated)": "2018-08-08",
  "Nakiri Ayame": "2018-09-03",
  "Yuzuki Choco": "2018-09-04",
  "Oozora Subaru": "2018-09-16",
  "Azki": "2018-11-15",
  "Ookami Mio": "2018-12-07",
  "Nekomata Okayu": "2019-04-06",
  "Inugami Korone": "2019-04-13",
  "Usada Pekora": "2019-07-17",
  "Uruha Rushia": "2019-07-18",
  "Shiranui Flare": "2019-08-07",
  "Shirogane Noel": "2019-08-08",
  "Houshou Marine": "2019-08-11",
  "Amane Kanata": "2019-12-27",
  "Kiryu Coco": "2019-12-28",
  "Tsunomaki Watame": "2019-12-29",
  "Tokoyami Towa": "2020-01-03",
  "Himemori Luna": "2020-01-04",
  "Ayunda Risu": "2020-04-10",
  "Moona Hoshinova": "2020-04-11",
  "Airani Iofifteen": "2020-04-12",
  "Moona Hoshinova": "2020-07-18",
  "Moona Hoshinova": "2020-07-18",
  "Moona Hoshinova": "2020-07-18",
  "Moona Hoshinova": "2020-07-18",



  // Add more...
};

function timeUntil(iso) {
  if (!iso) return "TBA";
  const diff = new Date(iso) - Date.now();
  if (diff < 0) return "Started";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleString([], {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
}

function daysUntil(monthDayStr) {
  if (!monthDayStr) return "TBA";
  const [m, d] = monthDayStr.split('-').map(Number);
  const today = new Date();
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  if (m === 2 && d === 29 && !isLeapYear(next.getFullYear())) next.setDate(28);
  const diffMs = next - today;
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  if (days === 0) return hours > 0 ? `In ${hours}h 🎉` : "Today! 🎂";
  if (days === 1) return "Tomorrow!";
  return `${days}d ${hours}h`;
}

function daysUntilAnniv(yyyyMmDd) {
  if (!yyyyMmDd) return "TBA";

  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const today = new Date();
  let next = new Date(today.getFullYear(), m - 1, d);

  if (next < today) {
    next.setFullYear(next.getFullYear() + 1);
  }

  const diffMs = next - today;
  if (diffMs <= 0) return "Today! 🎉";

  const totalSeconds = Math.floor(diffMs / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const totalDays = Math.floor(totalSeconds / 86400);

  const months = Math.floor(totalDays / 30.437);
  const days = Math.floor(totalDays % 30.437);

  let parts = [];
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || months === 0) parts.push(`${days}d`);
  parts.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);

  return parts.join(' ');
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// ─── Tab Switching ────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.dataset.active = (btn.dataset.tab === tab) ? "true" : "false";
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("hidden", p.id !== `panel-${tab}`);
  });
  console.log("Switched to tab:", tab);

  if (tab === "anniversaries") {
    updateNextAnniversaryCountdown();
  }
}

// ─── Core Functions ──────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, v);
  });

  const headers = { "Accept": "application/json" };
  if (API_KEY) headers["X-APIKEY"] = API_KEY;

  try {
    const r = await fetch(url, { headers });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      throw new Error(`HTTP ${r.status} - ${errText}`);
    }
    return await r.json();
  } catch (err) {
    console.error("API fetch failed:", err);
    document.getElementById("status").textContent = `Error: ${err.message}`;
    return [];
  }
}

async function loadData() {
  const status = document.getElementById("status");
  status.textContent = "Loading Hololive streams... (2–10 sec)";

  try {
    const videos = await apiFetch("/live", {
      org: "Hololive",
      type: "stream",
      status: "live,upcoming",
      max_upcoming_hours: 168,
      include: "live_info,channel_stats",
      limit: 300
    });

    console.log("API returned", videos.length, "streams");

    allVideos = videos
      .filter(v => v && v.id && v.channel)
      .sort((a, b) => {
        const ta = a.start_scheduled || a.start_actual || a.available_at || "9999-12-31";
        const tb = b.start_scheduled || b.start_actual || b.available_at || "9999-12-31";
        return new Date(ta) - new Date(tb);
      });

    renderEverything();
    status.textContent = `Updated ${new Date().toLocaleTimeString()} • ${allVideos.length} items`;
  } catch (err) {
    status.textContent = "Failed to load – check console (F12)";
    console.error(err);
  }
}

// ─── Render Functions ──────────────────────────────────────────
function renderLive(streams) {
  const container = document.getElementById("panel-live");
  container.innerHTML = "";

  if (!streams || streams.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-16 text-gray-500 text-xl">No live streams right now…</div>';
    return;
  }

  streams.forEach(s => {
    const ch = s.channel || {};
    const viewers = s.live_viewers ? s.live_viewers.toLocaleString() : "?";
    const photo = ch.photo || 'https://via.placeholder.com/640x360?text=Hololive';

    container.innerHTML += `
      <a href="https://youtu.be/${s.id}" target="_blank" class="block bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-red-500/50 transition shadow-lg">
        <div class="relative">
          <img src="${photo}" class="w-full aspect-video object-cover">
          <div class="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 pulse">
            <i class="fa-solid fa-circle fa-xs"></i> LIVE
          </div>
          <div class="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            ${viewers} watching
          </div>
        </div>
        <div class="p-4">
          <div class="font-semibold line-clamp-2 mb-1">${s.title || 'No title'}</div>
          <div class="text-purple-300 text-sm">${ch.english_name || ch.name || 'Unknown'}</div>
        </div>
      </a>`;
  });
}

function renderUpcoming(streams) {
  const container = document.getElementById("panel-upcoming");
  container.innerHTML = "";

  if (!streams || streams.length === 0) {
    container.innerHTML = '<div class="text-center py-16 text-gray-500 text-xl">No upcoming streams…</div>';
    return;
  }

  streams.forEach(s => {
    const ch = s.channel || {};
    const start = s.start_scheduled || s.available_at;
    const timeLeft = start ? timeUntil(start) : "TBA";
    const photo = ch.photo || 'https://via.placeholder.com/96';

    container.innerHTML += `
      <a href="https://youtu.be/${s.id}" target="_blank" 
         class="flex gap-4 bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition shadow">
        <img src="${photo}" class="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0">
        <div class="flex-1 min-w-0">
          <div class="font-semibold line-clamp-2">${s.title || 'No title'}</div>
          <div class="text-purple-300 text-sm mt-1">${ch.english_name || ch.name || 'Unknown'}</div>
          <div class="text-gray-300 text-sm mt-2">
            <i class="far fa-clock mr-1"></i> ${timeLeft} • ${formatDate(start)}
          </div>
        </div>
      </a>`;
  });
}



function renderBirthdays() {
  const container = document.getElementById("birthdays-list");
  if (!container) {
    console.error("#birthdays-list not found");
    return;
  }
  container.innerHTML = "";

  Object.entries(birthdays).forEach(([name, dateStr]) => {
    const countdown = daysUntil(dateStr);
    if (countdown !== "TBA") {
      container.innerHTML += `
        <div class="event-card">
          <div class="text-lg birthday-name">${name}</div>
          <div class="text-sm text-gray-400">Birthday • ${dateStr}</div>
          <div class="countdown">${countdown}</div>
        </div>`;
    }
  });

  if (container.innerHTML.trim() === "") {
    container.innerHTML = '<div class="col-span-full text-center py-20 text-gray-500 text-lg">No upcoming birthdays found</div>';
  }
}

// ─── Next Debut Anniversary Countdown ────────────────────────────────
function updateNextAnniversaryCountdown() {
  const countdownContainer = document.getElementById('next-anniv-countdown');
  const nameEl = document.getElementById('next-anniv-name');

  if (!countdownContainer || !nameEl) {
    console.error("Countdown container or name element missing in HTML");
    return;
  }

  let soonestDate = null;
  let soonestName = '';
  let soonestDiff = Infinity;

  const today = new Date();

  Object.entries(debuts).forEach(([name, dateStr]) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;

    const [y, m, d] = dateStr.split('-').map(Number);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next < today) next.setFullYear(next.getFullYear() + 1);

    const diff = next - today;
    if (diff > 0 && diff < soonestDiff) {
      soonestDiff = diff;
      soonestName = name;
      soonestDate = next;
    }
  });

  if (soonestDiff === Infinity) {
    countdownContainer.innerHTML = "No upcoming anniversaries";
    nameEl.textContent = "";
    return;
  }

  nameEl.textContent = soonestName;

  function updateDisplay() {
    if (!soonestDate) return;

    const diff = soonestDate - Date.now();
    if (diff <= 0) {
      countdownContainer.innerHTML = "HAPPY ANNIVERSARY!";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const totalDays = Math.floor(totalSeconds / 86400);
    const months = Math.floor(totalDays / 30.437);
    const days = Math.floor(totalDays % 30.437);

    document.getElementById('months').textContent = months.toString().padStart(2, '0');
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
  }

  updateDisplay();
  setInterval(updateDisplay, 1000);
}
// ─── Manual Scroll + Per-Member Countdown ─────────────────────────────
function initAnniversariesScroll() {
  const cardContainer = document.getElementById('current-member-card');
  const progressEl = document.getElementById('anniv-progress');
  const prevBtn = document.getElementById('prev-member');
  const nextBtn = document.getElementById('next-member');

  if (!cardContainer || !prevBtn || !nextBtn) {
    console.error("Anniversaries scroll elements missing in HTML");
    return;
  }

  // === ADD YOUR MEMBER PHOTOS HERE ===
  // Key = exact name from debuts object
  // Value = filename (same folder) or full URL
  const memberPhotos = {
    "Tokino Sora": "sora.jpg",
    "Roboco-san": "roboco.jpg",
    "Hoshimachi Suisei": "suisei.jpg",
    "Yozora Mel (Graduated)": "mel.jpg",
    "Shirakami Fubuki": "fubuki.jpg",
    "Natsuiro Matsuri": "matsuri.jpg",
    "Aki Rosenthal": "aki.jpg",
    "Akai Haato": "haato.jpg",
    "Hitomi Chris (Graduated)": "chris.jpg",
    "Sakura Miko": "miko.png",
    "Minato Aqua (Graduated)": "aqua.jpg",
    "Murasaki Shion (Graduated)": "shion.jpg",
    // Add more members here, e.g.:
    // "Usada Pekora": "pekora.png",
    // "Gawr Gura": "https://i.imgur.com/gura.jpg",
  };

  // Build array of members with countdowns
  const members = Object.entries(debuts)
    .map(([name, dateStr]) => {
      const countdown = daysUntilAnniv(dateStr);
      if (countdown === "TBA") return null;
      return { name, dateStr, countdown };
    })
    .filter(Boolean);

  if (members.length === 0) {
    cardContainer.innerHTML = '<div class="text-center text-gray-400 text-xl py-12">No upcoming anniversaries found</div>';
    progressEl.textContent = "";
    return;
  }

  let currentIndex = 0;

  function showMember(index) {
    const member = members[index];
    const photoSrc = memberPhotos[member.name] || `https://via.placeholder.com/220?text=${encodeURIComponent(member.name)}`;

    cardContainer.innerHTML = `
      <img 
        src="${photoSrc}" 
        alt="${member.name}" 
        class="w-48 h-48 md:w-64 md:h-64 rounded-full mx-auto mb-6 shadow-2xl ring-4 ring-purple-500/50 object-cover"
      >
      <div class="text-3xl md:text-4xl font-bold text-white mb-2">${member.name}</div>
      <div class="text-xl text-gray-300 mb-6">Debut • ${member.dateStr}</div>
      <div class="text-4xl md:text-5xl font-mono font-extrabold text-purple-400 tracking-wider">
        ${member.countdown}
      </div>
    `;

    progressEl.textContent = `Member ${index + 1} of ${members.length}`;
  }

  // Show first member
  showMember(currentIndex);

  // Left arrow
  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + members.length) % members.length;
    showMember(currentIndex);
  });

  // Right arrow
  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % members.length;
    showMember(currentIndex);
  });
}

// Call this when anniversaries tab opens
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.dataset.active = (btn.dataset.tab === tab) ? "true" : "false";
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("hidden", p.id !== `panel-${tab}`);
  });
  console.log("Switched to tab:", tab);

  if (tab === "anniversaries") {
    // Call both: shared countdown + per-member scroll
    updateNextAnniversaryCountdown();
    initAnniversariesScroll();
  }
}

// ─── renderEverything ──────────────────────────────────────────────
function renderEverything() {
  console.log("Starting render — live + upcoming total:", allVideos.length);

  const live = allVideos.filter(v => v.status === "live");
  const upcoming = allVideos.filter(v => v.status === "upcoming");

  console.log("Live:", live.length, "Upcoming:", upcoming.length);

  document.getElementById("live-count").textContent     = live.length;
  document.getElementById("upcoming-count").textContent = upcoming.length;

  renderLive(live);
  renderUpcoming(upcoming);
 
  
  renderBirthdays();  // birthdays tab
}

// ─── Event Listeners & Auto-load ──────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  document.getElementById("refresh-btn")?.addEventListener("click", loadData);

  loadData();
  switchTab("live");
});

// ─── Background Music Playlist ──────────────────────────────────
const bgm = document.getElementById('bgm');
const playPauseBtn = document.getElementById('play-pause-bgm');
const nowPlaying = document.getElementById('now-playing');

const playlist = [
  "La Roja.mp3",
  // Add more filenames here
];

let currentIndex = 0;

function loadSong(index) {
  if (index >= playlist.length) currentIndex = 0;
  const songFile = playlist[currentIndex];
  bgm.src = songFile;
  bgm.load();
  nowPlaying.textContent = `Now playing: ${songFile.replace('.mp3', '')}`;
}

function playNext() {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadSong(currentIndex);
  bgm.play().catch(() => console.log("Next song blocked"));
}

window.addEventListener('load', () => {
  bgm.volume = 0.25;
  if (playlist.length > 0) {
    loadSong(0);
    bgm.play().then(() => {
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Music';
    }).catch(() => {
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
      nowPlaying.textContent = 'Click to start music';
    });
  }
});

playPauseBtn.addEventListener('click', () => {
  if (bgm.paused) {
    bgm.play();
    playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Music';
  } else {
    bgm.pause();
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play Music';
  }
});

bgm.addEventListener('ended', playNext);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    bgm.pause();
  } else if (!bgm.paused) {
    bgm.play().catch(() => {});
  }
});
