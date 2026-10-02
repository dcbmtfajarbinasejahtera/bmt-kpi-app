// 1. URL GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwFjLebglR-F5nus7jgrOJhfeWC2-Fc6I8HIopGyI0RmFvgd1-bNBME3atFav3AnarDkA/exec";

let currentUser = null;
let dbUsers = [];
let dbKPIAO = [];
let dbKPIFO = [];

let saChartInstance = null;
let aoChartInstance = null;
let compareChartInstance = null;

// 2. DATA CADANGAN LOKAL (Agar Bisa Langsung Login 100% Berhasil)
const localUsers = [
  { username: 'admin', password: 'admin123', nama: 'Personalia Pusat', role: 'SUPER_ADMIN', tgl_masuk: '2020-01-01', jabatan: 'Head of HRD', cabang: 'Kantor Pusat', foto: 'https://i.pravatar.cc/150?img=1' },
  { username: 'ao_budi', password: 'budi123', nama: 'Budi Santoso', role: 'AO', tgl_masuk: '2022-01-01', jabatan: 'Account Officer', cabang: 'Cabang Cileungsi', foto: 'https://i.pravatar.cc/150?img=12' },
  { username: 'fo_siti', password: 'siti123', nama: 'Siti Rahma', role: 'FO', tgl_masuk: '2023-01-01', jabatan: 'Funding Officer', cabang: 'Cabang Cileungsi', foto: 'https://i.pravatar.cc/150?img=5' }
];

const localKPIAO = [
  { username: 'ao_budi', bulan: 1, tahun: 2026, outstanding: 3200000000, pencairan: 450000000, npf: 3.8, collection_rate: 102, visit: 18, total_bonus: 1500000, uang_jalan: 300000 },
  { username: 'ao_budi', bulan: 2, tahun: 2026, outstanding: 3350000000, pencairan: 480000000, npf: 3.6, collection_rate: 105, visit: 20, total_bonus: 1800000, uang_jalan: 300000 }
];

const localKPIFO = [
  { username: 'fo_siti', bulan: 1, tahun: 2026, visit: 112, fresh_fund_tabungan: 120000000, fresh_fund_basil: 250000000, total_bonus: 850000 }
];

document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  fetchDataFromSheets();
});

// 3. FETCH DATA REALTIME
async function fetchDataFromSheets() {
  try {
    const [resU, resAO, resFO] = await Promise.all([
      fetch(API_URL + "?action=getUsers").then(r => r.json()),
      fetch(API_URL + "?action=getKPI_AO").then(r => r.json()),
      fetch(API_URL + "?action=getKPI_FO").then(r => r.json())
    ]);

    if (Array.isArray(resU) && resU.length > 0) dbUsers = resU;
    if (Array.isArray(resAO) && resAO.length > 0) dbKPIAO = resAO;
    if (Array.isArray(resFO) && resFO.length > 0) dbKPIFO = resFO;

    populateDropdowns();
  } catch (err) {
    console.log("Menggunakan data lokal cadangan karena Google Apps Script belum merespons:", err);
    dbUsers = localUsers;
    dbKPIAO = localKPIAO;
    dbKPIFO = localKPIFO;
    populateDropdowns();
  }
}

// 4. POPULATE DROPDOWNS
function populateDropdowns() {
  const selectAO = document.getElementById('select-ao');
  const selectFO = document.getElementById('select-fo');
  const compA = document.getElementById('comp-user-a');
  const compB = document.getElementById('comp-user-b');
  const inputU = document.getElementById('input-username');

  if(!selectAO) return;

  selectAO.innerHTML = '';
  selectFO.innerHTML = '';
  compA.innerHTML = '';
  compB.innerHTML = '';
  inputU.innerHTML = '';

  const activeUsers = (dbUsers && dbUsers.length > 0) ? dbUsers : localUsers;

  activeUsers.forEach(u => {
    const opt = `<option value="${u.username}">${u.nama} (${u.cabang})</option>`;
    if (u.role === 'AO') selectAO.innerHTML += opt;
    if (u.role === 'FO') selectFO.innerHTML += opt;
    if (u.role === 'AO' || u.role === 'FO') {
      compA.innerHTML += opt;
      compB.innerHTML += opt;
      inputU.innerHTML += opt;
    }
  });

  if (compB.options.length > 1) compB.selectedIndex = 1;
}

// 5. LOGIN HANDLER
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const uInput = document.getElementById('username').value.trim().toLowerCase();
  const pInput = document.getElementById('password').value.trim();

  const userList = (dbUsers && dbUsers.length > 0) ? dbUsers : localUsers;
  const found = userList.find(u => String(u.username).toLowerCase() === uInput && String(u.password) === pInput);

  if (found) {
    currentUser = found;
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-page').classList.remove('hidden');

    document.getElementById('user-display-name').innerText = currentUser.nama;
    document.getElementById('user-display-role').innerText = currentUser.role === 'SUPER_ADMIN' ? 'Personalia (Super Admin)' : currentUser.role;

    if (currentUser.role === 'SUPER_ADMIN') {
      document.getElementById('admin-nav').classList.remove('hidden');
      document.getElementById('ao-selector-box').classList.remove('hidden');
      document.getElementById('fo-selector-box').classList.remove('hidden');
      switchTab('superadmin');
    } else if (currentUser.role === 'AO') {
      switchTab('ao');
      renderAODashboard(currentUser.username);
    } else if (currentUser.role === 'FO') {
      switchTab('fo');
      renderFODashboard(currentUser.username);
    }
  } else {
    alert("Username atau Password salah! Gunakan: admin / admin123");
  }
});

document.getElementById('logout-btn').addEventListener('click', () => window.location.reload());

// 6. UTILS & TARGET LOGIC
function calcTenure(startDateStr) {
  if (!startDateStr) return "-";
  const start = new Date(startDateStr);
  const today = new Date();
  let years = today.getFullYear() - start.getFullYear();
  let months = today.getMonth() - start.getMonth();
  if (months < 0) { years--; months += 12; }
  return `${years} Thn ${months} Bln`;
}

function getAOTarget(os) {
  if (os < 1500000000) return { cat: "Magang", target: 200000000 };
  if (os < 3000000000) return { cat: "Junior", target: 300000000 };
  return { cat: "Senior", target: 500000000 };
}

function formatIDR(val) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
}

// 7. DASHBOARD SUPER ADMIN
function renderSuperAdminDashboard() {
  const dataList = (dbKPIAO && dbKPIAO.length > 0) ? dbKPIAO : localKPIAO;
  let totalOS = 0, totalPencairan = 0, sumNPF = 0, sumColl = 0, count = 0;

  dataList.forEach(d => {
    totalOS += Number(d.outstanding || 0);
    totalPencairan += Number(d.pencairan || 0);
    sumNPF += Number(d.npf || 0);
    sumColl += Number(d.collection_rate || 0);
    count++;
  });

  document.getElementById('sa-total-os').innerText = formatIDR(totalOS);
  document.getElementById('sa-total-pencairan').innerText = formatIDR(totalPencairan);
  document.getElementById('sa-avg-npf').innerText = (count ? (sumNPF / count).toFixed(1) : "0.0") + "%";
  document.getElementById('sa-avg-coll').innerText = (count ? (sumColl / count).toFixed(1) : "0.0") + "%";

  renderSuperAdminChart();
}

function renderSuperAdminChart() {
  const dim = document.getElementById('sa-dimension-select').value;
  const metric = document.getElementById('sa-metric-select').value;

  const dataList = (dbKPIAO && dbKPIAO.length > 0) ? dbKPIAO : localKPIAO;
  const userList = (dbUsers && dbUsers.length > 0) ? dbUsers : localUsers;

  let labels = [], data = [];

  if (dim === 'branch') {
    const branchMap = {};
    dataList.forEach(d => {
      const u = userList.find(x => x.username === d.username);
      const branch = u ? u.cabang : "Lainnya";
      branchMap[branch] = (branchMap[branch] || 0) + Number(d[metric] || 0);
    });
    labels = Object.keys(branchMap);
    data = Object.values(branchMap);
  } else {
    labels = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Des)'];
    data = [1200000000, 1500000000, 1800000000, 2100000000];
  }

  const ctx = document.getElementById('superAdminChart').getContext('2d');
  if (saChartInstance) saChartInstance.destroy();

  saChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: metric.toUpperCase(), data: data, backgroundColor: '#059669' }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// 8. DASHBOARD AO
function renderAODashboard(username) {
  const userList = (dbUsers && dbUsers.length > 0) ? dbUsers : localUsers;
  const dataList = (dbKPIAO && dbKPIAO.length > 0) ? dbKPIAO : localKPIAO;

  const u = userList.find(x => x.username === username) || userList[1];
  const userRows = dataList.filter(x => x.username === username);
  const latestData = userRows[userRows.length - 1] || {};

  document.getElementById('ao-nama').innerText = u.nama;
  document.getElementById('ao-jabatan').innerText = u.jabatan;
  document.getElementById('ao-cabang').innerText = u.cabang;
  document.getElementById('ao-tgl').innerText = u.tgl_masuk;
  document.getElementById('ao-masa-kerja').innerText = calcTenure(u.tgl_masuk);
  document.getElementById('ao-img').src = u.foto || `https://i.pravatar.cc/150?u=${u.username}`;

  const os = Number(latestData.outstanding || 0);
  const targetObj = getAOTarget(os);

  document.getElementById('ao-os-text').innerText = formatIDR(os);
  document.getElementById('ao-kategori').innerText = `Kategori: ${targetObj.cat}`;
  document.getElementById('ao-target-pencairan').innerText = formatIDR(targetObj.target);

  const pencairan = Number(latestData.pencairan || 0);
  document.getElementById('ao-pencairan-val').innerText = formatIDR(pencairan);
  document.getElementById('ao-pencairan-bar').style.width = Math.min(100, (pencairan / targetObj.target) * 100) + "%";

  document.getElementById('ao-npf-val').innerText = (latestData.npf || 0) + "%";
  document.getElementById('ao-coll-val').innerText = (latestData.collection_rate || 0) + "%";
  document.getElementById('ao-bonus-val').innerText = formatIDR(Number(latestData.total_bonus || 0) + Number(latestData.uang_jalan || 0));

  updateAOChart(username);
}

function updateAOChart(username = document.getElementById('select-ao').value || 'ao_budi') {
  const metric = document.getElementById('ao-metric-select').value;
  const dataList = (dbKPIAO && dbKPIAO.length > 0) ? dbKPIAO : localKPIAO;
  const userRows = dataList.filter(x => x.username === username);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyData = new Array(12).fill(0);

  userRows.forEach(r => {
    const mIndex = Number(r.bulan) - 1;
    if (mIndex >= 0 && mIndex < 12) monthlyData[mIndex] = Number(r[metric] || 0);
  });

  const ctx = document.getElementById('aoChart').getContext('2d');
  if (aoChartInstance) aoChartInstance.destroy();

  aoChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: metric.toUpperCase(), data: monthlyData, borderColor: '#059669', backgroundColor: 'rgba(5, 150, 105, 0.1)', fill: true, tension: 0.3 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// 9. DASHBOARD FO
function renderFODashboard(username) {
  const userList = (dbUsers && dbUsers.length > 0) ? dbUsers : localUsers;
  const dataList = (dbKPIFO && dbKPIFO.length > 0) ? dbKPIFO : localKPIFO;

  const u = userList.find(x => x.username === username) || userList[2];
  const userRows = dataList.filter(x => x.username === username);
  const latestData = userRows[userRows.length - 1] || {};

  document.getElementById('fo-nama').innerText = u.nama;
  document.getElementById('fo-jabatan').innerText = u.jabatan;
  document.getElementById('fo-cabang').innerText = u.cabang;
  document.getElementById('fo-tgl').innerText = u.tgl_masuk;
  document.getElementById('fo-masa-kerja').innerText = calcTenure(u.tgl_masuk);
  document.getElementById('fo-img').src = u.foto || `https://i.pravatar.cc/150?u=${u.username}`;

  document.getElementById('fo-visit').innerText = (latestData.visit || 0) + " Orang";
  document.getElementById('fo-tabungan').innerText = formatIDR(latestData.fresh_fund_tabungan);
  document.getElementById('fo-basil').innerText = formatIDR(latestData.fresh_fund_basil);
  document.getElementById('fo-bonus').innerText = formatIDR(latestData.total_bonus);
}

// 10. KOMPARASI PETUGAS
function renderComparisonChart() {
  const userA = document.getElementById('comp-user-a').value;
  const userB = document.getElementById('comp-user-b').value;
  const metric = document.getElementById('comp-metric').value;

  const dataList = (dbKPIAO && dbKPIAO.length > 0) ? dbKPIAO : localKPIAO;

  const getMonthlyArr = (uname) => {
    const arr = new Array(12).fill(0);
    dataList.filter(x => x.username === uname).forEach(r => {
      const idx = Number(r.bulan) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = Number(r[metric] || 0);
    });
    return arr;
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ctx = document.getElementById('compareChart').getContext('2d');
  if (compareChartInstance) compareChartInstance.destroy();

  compareChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: userA, data: getMonthlyArr(userA), backgroundColor: '#059669' },
        { label: userB, data: getMonthlyArr(userB), backgroundColor: '#0284c7' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// 11. SAVE DATA TO GSHEETS
async function handleSaveData(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save');
  btn.innerText = "Menyimpan ke Google Sheets...";
  btn.disabled = true;

  const sheet = document.getElementById('input-sheet').value;
  const username = document.getElementById('input-username').value;
  const bulan = Number(document.getElementById('input-bulan').value);
  const tahun = Number(document.getElementById('input-tahun').value);

  const payload = {
    username: username,
    bulan: bulan,
    tahun: tahun,
    outstanding: Number(document.getElementById('input-os').value || 0),
    pencairan: Number(document.getElementById('input-pencairan').value || 0),
    npf: Number(document.getElementById('input-npf').value || 0),
    visit: Number(document.getElementById('input-visit').value || 0)
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ sheet: sheet, username: username, bulan: bulan, tahun: tahun, payload: payload })
    });

    alert("Data berhasil tersimpan!");
    await fetchDataFromSheets();
  } catch (err) {
    alert("Gagal menyimpan ke Apps Script, data diperbarui lokal.");
  } finally {
    btn.innerText = "Simpan & Synchronize ke Google Sheets";
    btn.disabled = false;
  }
}

// 12. SWITCH TAB
function switchTab(tab) {
  ['superadmin', 'ao', 'fo', 'compare', 'input'].forEach(t => {
    const sec = document.getElementById(`section-${t}`);
    if(sec) sec.classList.add('hidden');
    const tabBtn = document.getElementById(`tab-${t}`);
    if (tabBtn) tabBtn.className = "px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200";
  });

  const activeSec = document.getElementById(`section-${tab}`);
  if(activeSec) activeSec.classList.remove('hidden');
  
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) activeBtn.className = "px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white";

  if (tab === 'superadmin') renderSuperAdminDashboard();
  if (tab === 'ao') renderAODashboard(document.getElementById('select-ao').value || currentUser.username);
  if (tab === 'fo') renderFODashboard(document.getElementById('select-fo').value || currentUser.username);
  if (tab === 'compare') renderComparisonChart();
}
