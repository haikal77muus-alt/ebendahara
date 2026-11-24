/**
 * ============================================================
 * E-Bendahara — app.js
 * Seluruh Logika Interaktif Frontend, Kalkulator Cek Fisik,
 * Render Tabel, Modal, Cetak LPJ, & Backup/Restore JSON
 * ============================================================
 */

// ============================================================
// STATE APLIKASI
// ============================================================
let currentTab = 'dashboard';
let periodeList = [];
let activePeriodeId = null;
let matriksData = [];
let matriksTipeBulan = 'juli_juni';
let bukukasData = [];
let pinjamanData = [];
let allMasterSantri = [];
let currentCicilSisa = 0;

// ============================================================
// HELPER: Format Rupiah & Tanggal & Ikon Aman
// ============================================================
function renderIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try { lucide.createIcons(); } catch (e) { console.warn('[Lucide] Error:', e); }
    }
}

function formatRp(num) {
    const n = parseFloat(num) || 0;
    return 'Rp ' + n.toLocaleString('id-ID');
}

function formatTanggal(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return hari[d.getDay()] + ', ' + d.getDate() + ' ' + bln[d.getMonth()] + ' ' + d.getFullYear();
}

function formatHariTanggal(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const pad = (n) => String(n).padStart(2, '0');
    return `${hari[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTanggalShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ============================================================
// HELPER: Bulan & Urutan
// ============================================================
const BULAN_NAMA = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BULAN_SHORT = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function getBulanNama(m) {
    return BULAN_NAMA[m] || ('Bulan ' + m);
}

function getBulanShort(m) {
    return BULAN_SHORT[m] || String(m);
}

function getBulanOrder(tipe) {
    if (tipe === 'juli_juni') return [7,8,9,10,11,12,1,2,3,4,5,6];
    return [1,2,3,4,5,6,7,8,9,10,11,12];
}

// ============================================================
// TOAST NOTIFICATION (Modern Toast tanpa alert() bawaan)
// ============================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        info: 'info',
        warning: 'alert-triangle'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 shrink-0"></i><span>${message}</span>`;
    container.appendChild(toast);
    renderIcons();
    setTimeout(() => { 
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ============================================================
// MODAL CONTROLLER
// ============================================================
function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('show');
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('show');
    }
}

// ============================================================
// TAB NAVIGATION
// ============================================================
const TAB_TITLES = {
    dashboard: { icon: 'layout-dashboard', text: 'Dashboard Ringkasan Kas' },
    matriks:   { icon: 'grid-3x3',         text: 'Kas Santri Bulanan' },
    bukukas:   { icon: 'book-open',        text: 'Buku Kas Umum' },
    pinjaman:  { icon: 'hand-coins',       text: 'Pinjaman / Kasbon' }
};

function switchTab(tab) {
    currentTab = tab;
    // Simpan tab aktif agar tidak reset saat refresh
    try { sessionStorage.setItem('ebendahara_active_tab', tab); } catch(e) {}
    // Update active tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    // Toggle active panels & trigger fade-in
    document.querySelectorAll('.tab-content').forEach(panel => {
        const isCurrent = (panel.id === 'tab-' + tab);
        panel.classList.toggle('hidden', !isCurrent);
        if (isCurrent) {
            panel.classList.remove('animate-fade-in');
            void panel.offsetWidth;
            panel.classList.add('animate-fade-in');
        }
    });
    // Update toolbar title
    const info = TAB_TITLES[tab] || TAB_TITLES['dashboard'];
    document.getElementById('page-title').innerHTML =
        `<i data-lucide="${info.icon}" class="w-5 h-5 text-blue-500"></i> ${info.text}`;
    renderIcons();

    // Terapkan hak akses UI
    Auth.applyUIPermissions();

    // Reload tab data
    if (activePeriodeId) {
        if (tab === 'dashboard') loadDashboard();
        if (tab === 'matriks')   loadMatriks();
        if (tab === 'bukukas')   loadBukuKas();
        if (tab === 'pinjaman')  loadPinjaman();
    }
}

function renderCurrentTab() {
    // Pulihkan tab terakhir yang dibuka sebelum refresh (jangan selalu ke dashboard)
    const savedTab = sessionStorage.getItem('ebendahara_active_tab');
    const validTabs = ['dashboard', 'matriks', 'bukukas', 'pinjaman'];
    const targetTab = (savedTab && validTabs.includes(savedTab)) ? savedTab : (currentTab || 'dashboard');
    switchTab(targetTab);
}

// ============================================================
// PERIODE (TAHUN AJARAN)
// ============================================================
function loadPeriode() {
    periodeList = Storage.getPeriodes();
    renderPeriodeDropdown();
}

function renderPeriodeDropdown() {
    const sel = document.getElementById('periode-select');
    if (!sel) return;
    sel.innerHTML = '';
    periodeList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.nama_periode;
        if (p.is_active === 1) opt.selected = true;
        sel.appendChild(opt);
    });

    const active = Storage.getActivePeriode();
    if (active) {
        activePeriodeId = active.id;
        sel.value = activePeriodeId;
    } else if (periodeList.length > 0) {
        activePeriodeId = periodeList[0].id;
        sel.value = activePeriodeId;
    }

    // Status tombol hapus periode
    const btnHapus = document.getElementById('btn-hapus-periode');
    if (btnHapus) {
        if (!Auth.isBendaharaUtama()) {
            btnHapus.style.display = 'none';
        } else {
            btnHapus.style.display = 'inline-flex';
            if (periodeList.length <= 1) {
                btnHapus.classList.add('opacity-40', 'cursor-not-allowed');
                btnHapus.title = 'Minimal harus tersisa 1 periode aktif (tidak dapat dihapus)';
            } else {
                btnHapus.classList.remove('opacity-40', 'cursor-not-allowed');
                btnHapus.title = 'Hapus Periode Aktif';
            }
        }
    }

    if (activePeriodeId) {
        loadAllData();
    }
}

function onPeriodeChange() {
    const sel = document.getElementById('periode-select');
    activePeriodeId = parseInt(sel.value);
    Storage.setActivePeriode(activePeriodeId);
    loadAllData();
}

function loadAllData() {
    loadDashboard();
    if (currentTab === 'matriks')  loadMatriks();
    if (currentTab === 'bukukas')  loadBukuKas();
    if (currentTab === 'pinjaman') loadPinjaman();
}

// ============================================================
// TAMBAH PERIODE BARU (Modal)
// ============================================================
function openModalTambahPeriode() {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    document.getElementById('mp-nama').value = '';
    document.getElementById('mp-tipe').value = 'juli_juni';
    document.getElementById('mp-saldo').checked = true;
    openModal('modal-periode');
}

function simpanPeriodeBaru() {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    const nama  = document.getElementById('mp-nama').value.trim();
    const tipe  = document.getElementById('mp-tipe').value;
    const saldo = document.getElementById('mp-saldo').checked;

    if (!nama) {
        showToast('Nama periode wajib diisi', 'warning');
        return;
    }

    try {
        const p = Storage.addPeriode({
            nama_periode: nama,
            tipe_bulan: tipe,
            bawa_saldo: saldo,
            dari_periode_id: activePeriodeId
        });
        showToast(`Periode baru "${p.nama_periode}" berhasil dibuat!`, 'success');
        closeModal('modal-periode');
        loadPeriode();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============================================================
// HAPUS PERIODE AKTIF (Modal Khusus Bendahara Utama)
// ============================================================
function konfirmasiHapusPeriode() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk menghapus periode.', 'warning');
        return;
    }

    if (!activePeriodeId) {
        showToast('Tidak ada periode aktif yang dipilih', 'warning');
        return;
    }

    if (periodeList.length <= 1) {
        showToast('Tidak dapat menghapus: Minimal harus tersisa 1 periode aktif dalam sistem!', 'warning');
        return;
    }

    const currentP = periodeList.find(p => p.id === activePeriodeId);
    const nama = currentP ? currentP.nama_periode : 'Periode ini';
    document.getElementById('mhp-nama-periode').textContent = `"${nama}"`;
    openModal('modal-hapus-periode');
    renderIcons();
}

function prosesHapusPeriode() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Akses ditolak!', 'error');
        closeModal('modal-hapus-periode');
        return;
    }

    if (!activePeriodeId) return;

    try {
        const deleted = Storage.deletePeriode(activePeriodeId);
        showToast(`Periode "${deleted.nama_periode}" berhasil dihapus`, 'success');
        closeModal('modal-hapus-periode');
        loadPeriode();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============================================================
// DASHBOARD
// ============================================================
function loadDashboard() {
    if (!activePeriodeId) return;

    // 1. Buku Kas Summary
    const bkResult = Storage.getBukuKas(activePeriodeId);
    bukukasData = bkResult.data;
    document.getElementById('card-saldo').textContent  = formatRp(bkResult.saldo);
    document.getElementById('card-debit').textContent  = formatRp(bkResult.total_debit);
    document.getElementById('card-kredit').textContent = formatRp(bkResult.total_kredit);
    renderDashTransaksi(bkResult.data);

    // 2. Pinjaman Summary
    const pjResult = Storage.getPinjaman(activePeriodeId);
    pinjamanData = pjResult.data;
    document.getElementById('card-pinjaman').textContent = formatRp(pjResult.total_belum_kembali);
    renderDashPinjaman(pjResult.data);

    // 3. Matriks Data & Kepatuhan Iuran
    const mkResult = Storage.getMatriksByPeriode(activePeriodeId);
    matriksData = mkResult.data;
    matriksTipeBulan = mkResult.tipe_bulan;
    renderProgressBar();
}

function renderProgressBar() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Santri boyong TIDAK DIHITUNG TUNGGAKAN, hanya santri aktif yang dihitung
    const activeSantri = matriksData.filter(s => s.is_active === 1);
    const total = activeSantri.length;
    if (total === 0) {
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-label').textContent = '0%';
        document.getElementById('progress-detail').textContent = 'Belum ada data santri aktif pada periode ini';
        const elBelum = document.getElementById('dash-belum-santri');
        const elTarget = document.getElementById('dash-target-kurang');
        if (elBelum) elBelum.textContent = '0';
        if (elTarget) elTarget.textContent = 'Rp 0';
        return;
    }
    let sudah = 0;
    activeSantri.forEach(s => {
        if (s.status && s.status[currentMonth] === 'sudah') sudah++;
    });
    const sisaBelum = Math.max(0, total - sudah);
    const tarifKas = 10000;
    const targetKurang = sisaBelum * tarifKas;
    const pct = Math.round((sudah / total) * 100);

    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-label').textContent = pct + '%';
    document.getElementById('progress-detail').textContent =
        `${sudah} dari ${total} santri aktif sudah bayar kas bulan ${getBulanNama(currentMonth)}. Santri boyong dikecualikan dari perhitungan.`;

    const elBelum = document.getElementById('dash-belum-santri');
    const elTarget = document.getElementById('dash-target-kurang');
    if (elBelum) elBelum.textContent = sisaBelum;
    if (elTarget) elTarget.textContent = formatRp(targetKurang);
}

function renderDashPinjaman(data) {
    const container = document.getElementById('dash-pinjaman-list');
    const belumLunas = data.filter(p => p.total_kembali < p.total_ambil);
    if (belumLunas.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 flex items-center gap-1.5 py-2"><i data-lucide="check-circle" class="w-4 h-4 text-emerald-500"></i> Seluruh pinjaman sudah lunas tercatat</p>';
        renderIcons();
        return;
    }
    container.innerHTML = belumLunas.map(p => {
        const sisa = p.total_ambil - p.total_kembali;
        return `<div class="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
            <div>
                <p class="text-sm font-semibold text-slate-700">${escHtml(p.nama_peminjam)}</p>
                <p class="text-xs text-slate-400">${escHtml(p.keperluan || '-')}</p>
            </div>
            <span class="badge-kurang">Kurang ${formatRp(sisa)}</span>
        </div>`;
    }).join('');
}

function renderDashTransaksi(data) {
    const container = document.getElementById('dash-transaksi-list');
    const last5 = data.slice(-5).reverse();
    if (last5.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-400 py-2">Belum ada transaksi di Buku Kas</p>';
        return;
    }
    container.innerHTML = last5.map(t => {
        const isDebit = t.debit > 0;
        return `<div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
            <div>
                <p class="text-sm font-semibold text-slate-700">${escHtml(t.nama_barang || '-')}</p>
                <p class="text-xs text-slate-400">${formatTanggalShort(t.tanggal)} • ${escHtml(t.keterangan || '-')}</p>
            </div>
            <span class="text-sm font-bold ${isDebit ? 'text-green-600' : 'text-red-600'}">
                ${isDebit ? '+' : '-'} ${formatRp(isDebit ? t.debit : t.kredit)}
            </span>
        </div>`;
    }).join('');
}

// ============================================================
// MATRIKS KAS BULANAN
// ============================================================
function loadMatriks() {
    if (!activePeriodeId) return;
    const mkResult = Storage.getMatriksByPeriode(activePeriodeId);
    matriksData = mkResult.data;
    matriksTipeBulan = mkResult.tipe_bulan;
    renderMatriksTable();
    populateCalcBulan();
    hitungCekFisik();
}

let matriksSearchQuery = '';

function filterMatriksSantri() {
    const input = document.getElementById('matriks-search-input');
    const clearBtn = document.getElementById('btn-clear-search-matriks');
    matriksSearchQuery = (input?.value || '').trim().toLowerCase();
    if (clearBtn) {
        clearBtn.style.display = matriksSearchQuery ? 'inline-flex' : 'none';
    }
    renderMatriksTable();
}

function clearMatriksSearch() {
    const input = document.getElementById('matriks-search-input');
    if (input) input.value = '';
    filterMatriksSantri();
    if (input) input.focus();
}

function renderMatriksTable() {
    const bulanOrder = getBulanOrder(matriksTipeBulan);
    const thead = document.getElementById('matriks-thead');
    const tbody = document.getElementById('matriks-tbody');
    const tarif = parseFloat(document.getElementById('calc-tarif')?.value) || 10000;

    // Header Kolom
    let headerHTML = '<tr><th class="col-no">No</th><th class="col-nama">Nama Santri</th>';
    bulanOrder.forEach(b => {
        headerHTML += `<th>${getBulanShort(b)}</th>`;
    });
    // Kolom Tunggakan setelah bulan terakhir, sebelum Aksi
    headerHTML += '<th class="col-tunggakan">Tunggakan</th>';
    if (!Auth.isReadOnly()) {
        headerHTML += '<th class="no-print col-aksi">Aksi</th>';
    }
    headerHTML += '</tr>';
    thead.innerHTML = headerHTML;

    // Filter pencarian santri jika input terisi
    let displayList = matriksData || [];
    if (matriksSearchQuery) {
        displayList = displayList.filter(s =>
            (s.nama_santri && s.nama_santri.toLowerCase().includes(matriksSearchQuery)) ||
            (s.kamar_kelas && s.kamar_kelas.toLowerCase().includes(matriksSearchQuery))
        );
    }

    const countDisplay = document.getElementById('matriks-count-display');
    if (countDisplay) {
        countDisplay.textContent = displayList.length;
    }

    // Body
    const totalCols = bulanOrder.length + (Auth.isReadOnly() ? 3 : 4);
    if (displayList.length === 0) {
        const msg = matriksSearchQuery 
            ? `Tidak ada santri yang cocok dengan kata kunci "${escHtml(matriksSearchQuery)}".`
            : `Belum ada data santri aktif. Tambahkan santri baru di form atas.`;
        tbody.innerHTML = `<tr><td colspan="${totalCols}" class="py-8 text-center text-slate-400 text-sm">${msg}</td></tr>`;
        return;
    }

    let bodyHTML = '';
    let totalTunggakanAll = 0;
    let totalBulanBelumAll = 0;

    displayList.forEach((s, idx) => {
        const isBoyong = (s.is_active === 0);
        const rowClass = isBoyong ? 'row-boyong' : '';
        bodyHTML += `<tr class="${rowClass}">`;
        bodyHTML += `<td class="col-no">${idx + 1}</td>`;
        const hasCustomClass = s.kamar_kelas && s.kamar_kelas !== 'Kamar Asrama' && s.kamar_kelas !== '-';
        bodyHTML += `<td class="col-nama">
            <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-semibold ${isBoyong ? 'text-slate-600' : 'text-slate-800'}">${escHtml(s.nama_santri)}</span>
                ${isBoyong ? '<span class="badge-status-boyong">Boyong</span>' : ''}
            </div>
            ${hasCustomClass ? `
                <span class="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] ${isBoyong ? 'text-slate-400 bg-slate-100' : 'text-blue-700 bg-blue-50 border border-blue-200'} font-medium">
                    ${escHtml(s.kamar_kelas)}
                </span>
            ` : (Auth.isReadOnly() ? '' : `
                <button type="button" class="text-[10px] text-slate-400 hover:text-blue-600 italic block mt-0.5 transition" title="Klik untuk atur kelas santri ini" onclick="openEditSantriModal(${s.id})">
                    + atur kelas
                </button>
            `)}
        </td>`;

        // Hitung tunggakan personal per-santri (semua yang BUKAN 'sudah' dihitung tunggakan)
        let bulanBelum = 0;
        bulanOrder.forEach(b => {
            const st = (s.status && s.status[b]) ? s.status[b] : 'kosong';
            const label = st === 'sudah' ? 'Sudah' : (st === 'belum' ? 'Blom' : '-');
            const clickAttr = Auth.isReadOnly()
                ? `onclick="showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah status kas.', 'warning')"`
                : `onclick="toggleStatus(${s.id}, ${b}, '${st}')"`;
            bodyHTML += `<td class="status-cell status-${st}" ${clickAttr} title="Klik untuk mengubah status">${label}</td>`;

            // Hitung tunggakan: semua bulan yang BUKAN 'sudah' = tunggakan (baik '-' maupun 'Blom')
            if (!isBoyong && st !== 'sudah') {
                bulanBelum++;
            }
        });

        // Kolom Tunggakan personal
        if (isBoyong) {
            bodyHTML += `<td class="col-tunggakan text-center text-xs text-slate-400 italic">Rp 0 <span class="block text-[10px]">(Boyong)</span></td>`;
        } else {
            const tunggakan = bulanBelum * tarif;
            totalTunggakanAll += tunggakan;
            totalBulanBelumAll += bulanBelum;
            if (bulanBelum === 0) {
                bodyHTML += `<td class="col-tunggakan text-center text-xs text-emerald-600 font-semibold">Rp 0 <span class="block text-[10px]">✓ Lunas</span></td>`;
            } else {
                bodyHTML += `<td class="col-tunggakan text-center text-xs text-rose-600 font-bold">${formatRp(tunggakan)} <span class="block text-[10px] font-normal text-rose-500">${bulanBelum} bln belum</span></td>`;
            }
        }

        if (!Auth.isReadOnly()) {
            bodyHTML += `<td class="no-print col-aksi">
                <div class="flex items-center justify-center gap-1">
                    <button class="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition" title="Edit Data & Kelas Santri" onclick="openEditSantriModal(${s.id})">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                    ${isBoyong ? `
                        <button class="px-2 py-0.5 text-[11px] rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium" title="Aktifkan Kembali ke Pondok" onclick="toggleStatusSantri(${s.id}, 1, '${escHtml(s.nama_santri)}')">Aktifkan</button>
                    ` : `
                        <button class="px-1.5 py-0.5 text-[11px] rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium" title="Tandai Santri Lulus / Boyong" onclick="toggleStatusSantri(${s.id}, 0, '${escHtml(s.nama_santri)}')">Boyong</button>
                    `}
                    <button class="btn-danger p-1" title="Hapus Permanen dari Master Data" onclick="konfirmasiHapusSantri(${s.id}, '${escHtml(s.nama_santri)}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </td>`;
        }
        bodyHTML += '</tr>';
    });

    // Footer subtotal tunggakan keseluruhan santri aktif
    const activeSantriCount = displayList.filter(s => s.is_active === 1).length;
    bodyHTML += `<tr class="bg-slate-50 border-t-2 border-slate-300 font-semibold">
        <td colspan="${bulanOrder.length + 2}" class="text-right text-xs text-slate-600 py-2.5 px-3">
            Total Tunggakan ${activeSantriCount} Santri Aktif (${totalBulanBelumAll} bulan belum):
        </td>
        <td class="text-center text-sm font-bold ${totalTunggakanAll > 0 ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'} py-2.5 rounded">
            ${totalTunggakanAll > 0 ? formatRp(totalTunggakanAll) : 'Rp 0 ✓'}
        </td>
        ${!Auth.isReadOnly() ? '<td class="no-print col-aksi"></td>' : ''}
    </tr>`;

    tbody.innerHTML = bodyHTML;
    renderIcons();
}

function toggleStatus(santriId, bulan, currentStatus) {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah status kas.', 'warning');
        return;
    }

    // Siklus status: sudah -> belum -> kosong (-) -> sudah
    const cycle = { 'sudah': 'belum', 'belum': 'kosong', 'kosong': 'sudah' };
    const newStatus = cycle[currentStatus] || 'sudah';

    Storage.updateMatriksStatus(activePeriodeId, santriId, bulan, newStatus);

    // Update state lokal
    const santri = matriksData.find(s => s.id === santriId);
    if (santri) {
        if (!santri.status) santri.status = {};
        santri.status[bulan] = newStatus;
    }
    renderMatriksTable();
    hitungCekFisik();
    renderProgressBar();
}

function tambahSantri() {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    const inputNama = document.getElementById('input-nama-santri');
    const inputKamar = document.getElementById('input-kamar-santri');
    const nama = inputNama ? inputNama.value.trim() : '';
    const kamar = inputKamar ? inputKamar.value.trim() : '';

    if (!nama) {
        showToast('Nama santri wajib diisi', 'warning');
        return;
    }

    try {
        // Tambahkan santri khusus ke periode aktif ini dan periode berikutnya (periode lampau tetap utuh)
        const s = Storage.addSantri({ nama_santri: nama, kamar_kelas: kamar }, activePeriodeId);
        showToast(`Santri "${s.nama_santri}" berhasil ditambahkan ke periode aktif ini!`, 'success');
        inputNama.value = '';
        if (inputKamar) inputKamar.value = '';
        loadMatriks();
        loadDashboard();
        updateBoyongCountBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============================================================
// EDIT DATA & KELAS SANTRI
// ============================================================
function openEditSantriModal(id) {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    const santriList = Storage.getSantriByPeriode(activePeriodeId);
    let s = santriList.find(x => x.id === parseInt(id));
    if (!s) {
        const db = Storage.getData();
        s = (db.master_santri || []).find(x => x.id === parseInt(id));
    }
    if (!s) {
        showToast('Data santri tidak ditemukan!', 'error');
        return;
    }
    document.getElementById('edit-santri-id').value = s.id;
    document.getElementById('edit-santri-nama').value = s.nama_santri || '';
    document.getElementById('edit-santri-kelas').value = (s.kamar_kelas === 'Kamar Asrama' ? '' : s.kamar_kelas) || '';
    openModal('modal-edit-santri');
    setTimeout(() => {
        const kInput = document.getElementById('edit-santri-kelas');
        if (kInput) kInput.focus();
    }, 150);
}
window.openEditSantriModal = openEditSantriModal;

function setQuickKelas(val) {
    const kInput = document.getElementById('edit-santri-kelas');
    if (kInput) kInput.value = val;
}
window.setQuickKelas = setQuickKelas;

function simpanEditSantri() {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header.', 'warning');
        return;
    }
    const id = parseInt(document.getElementById('edit-santri-id').value);
    const nama = (document.getElementById('edit-santri-nama').value || '').trim();
    const kelas = (document.getElementById('edit-santri-kelas').value || '').trim() || 'Kamar Asrama';

    if (!nama) {
        showToast('Nama santri wajib diisi!', 'warning');
        return;
    }

    Storage.updateSantri(id, { nama_santri: nama, kamar_kelas: kelas }, activePeriodeId);
    closeModal('modal-edit-santri');
    showToast(`Data santri "${nama}" berhasil disimpan & diurutkan otomatis!`, 'success');

    // Re-render tampilan
    if (typeof loadMatriks === 'function') loadMatriks();
    if (typeof loadMasterSantriList === 'function') loadMasterSantriList();
    renderIcons();
}
window.simpanEditSantri = simpanEditSantri;

// ============================================================
// PENGELOLAAN MASTER DATA SANTRI (PER-PERIODE)
// ============================================================
function openModalMasterSantri() {
    openModal('modal-master-santri');
    loadMasterSantriList();
}

function loadMasterSantriList() {
    allMasterSantri = Storage.getAllSantri(activePeriodeId);
    renderMasterSantriTable(allMasterSantri);
}

function renderMasterSantriTable(list) {
    const tbody = document.getElementById('ms-table-body');
    if (!tbody) return;

    const totalCount = allMasterSantri.length;
    const aktifCount = allMasterSantri.filter(s => s.is_active === 1).length;
    const boyongCount = totalCount - aktifCount;

    document.getElementById('ms-total-count').textContent = totalCount;
    document.getElementById('ms-aktif-count').textContent = aktifCount;
    document.getElementById('ms-boyong-count').textContent = boyongCount;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Tidak ada santri pada periode ini</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((s, idx) => {
        const isAktif = (s.is_active === 1);
        const statusBadge = isAktif
            ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Aktif</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">Lulus / Boyong</span>';

        const toggleBtn = isAktif
            ? `<button class="px-2 py-1 text-[11px] rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium" onclick="toggleStatusSantri(${s.id}, 0, '${escHtml(s.nama_santri)}')">Set Boyong</button>`
            : `<button class="px-2 py-1 text-[11px] rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium" onclick="toggleStatusSantri(${s.id}, 1, '${escHtml(s.nama_santri)}')">Aktifkan</button>`;

        const aksiCol = !Auth.isReadOnly() ? `
            <td class="p-2 text-center col-aksi">
                <div class="flex items-center justify-center gap-1">
                    <button class="p-1 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 border border-blue-200" title="Edit Data & Kelas Santri" onclick="openEditSantriModal(${s.id})">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                    </button>
                    ${toggleBtn}
                    <button class="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50" title="Hapus dari Periode Ini" onclick="konfirmasiHapusSantri(${s.id}, '${escHtml(s.nama_santri)}')">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </td>` : `<td class="p-2 text-center col-aksi text-slate-400">-</td>`;

        return `<tr class="${!isAktif ? 'bg-rose-50/50 opacity-80' : ''}">
            <td class="p-2 text-center text-slate-400">${idx + 1}</td>
            <td class="p-2 font-medium text-slate-800">${escHtml(s.nama_santri)}</td>
            <td class="p-2 text-slate-500">${escHtml(s.kamar_kelas || '-')}</td>
            <td class="p-2 text-center">${statusBadge}</td>
            ${aksiCol}
        </tr>`;
    }).join('');
    renderIcons();
}

function filterMasterSantriTable() {
    const q = (document.getElementById('ms-search-input')?.value || '').toLowerCase().trim();
    if (!q) {
        renderMasterSantriTable(allMasterSantri);
        return;
    }
    const filtered = allMasterSantri.filter(s =>
        s.nama_santri.toLowerCase().includes(q) ||
        (s.kamar_kelas && s.kamar_kelas.toLowerCase().includes(q))
    );
    renderMasterSantriTable(filtered);
}

function toggleStatusSantri(santriId, newActive, nama) {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    try {
        if (newActive === 0) {
            Storage.boyongSantri(santriId, 'Lulus / Boyong Pondok', activePeriodeId);
            showToast(`Santri "${nama}" telah dipindahkan ke Arsip Santri Boyong pada periode ini.`, 'info');
        } else {
            Storage.reaktivasiSantri(santriId, activePeriodeId);
            showToast(`Santri "${nama}" berhasil diaktifkan kembali!`, 'success');
        }
        loadMasterSantriList();
        loadMatriks();
        loadDashboard();
        updateBoyongCountBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// ============================================================
// ARSIP SANTRI BOYONG & REAKTIVASI (PER-PERIODE)
// ============================================================
function updateBoyongCountBadge() {
    try {
        const boyongList = Storage.getBoyongSantri(activePeriodeId);
        const badge = document.getElementById('badge-boyong-count');
        if (badge) badge.textContent = boyongList.length;
        const totalAb = document.getElementById('ab-count-total');
        if (totalAb) totalAb.textContent = boyongList.length;
    } catch (e) {}
}

function openModalArsipBoyong() {
    openModal('modal-arsip-boyong');
    loadArsipBoyongList();
}

function loadArsipBoyongList() {
    const list = Storage.getBoyongSantri(activePeriodeId);
    renderArsipBoyongTable(list);
}

function renderArsipBoyongTable(list) {
    const tbody = document.getElementById('ab-table-body');
    const countEl = document.getElementById('ab-count-total');
    if (countEl) countEl.textContent = list.length;
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">Belum ada santri yang berstatus lulus atau boyong pada periode ini. Seluruh santri berstatus aktif mondok.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map((s, idx) => {
        const tgl = s.tgl_boyong ? s.tgl_boyong : '-';
        const alasan = s.alasan_boyong || 'Lulus / Boyong Pondok';

        const aksiCol = !Auth.isReadOnly() ? `
            <td class="p-2.5 text-center col-aksi">
                <button class="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold flex items-center gap-1 mx-auto transition shadow-sm active:scale-95"
                        onclick="reaktivasiSantriDariArsip(${s.id}, '${escHtml(s.nama_santri)}')">
                    <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-emerald-600"></i> Aktifkan Kembali
                </button>
            </td>` : `<td class="p-2.5 text-center text-slate-400 col-aksi">-</td>`;

        return `<tr>
            <td class="p-2.5 text-center text-slate-400 font-medium">${idx + 1}</td>
            <td class="p-2.5 font-bold text-slate-800">${escHtml(s.nama_santri)}</td>
            <td class="p-2.5 text-slate-600">${escHtml(s.kamar_kelas || '-')}</td>
            <td class="p-2.5 text-slate-500">
                <span class="font-medium text-slate-700 block">${escHtml(tgl)}</span>
                <span class="text-[10px] text-slate-400">${escHtml(alasan)}</span>
            </td>
            <td class="p-2.5 text-center">
                <span class="badge-status-boyong">Boyong</span>
            </td>
            ${aksiCol}
        </tr>`;
    }).join('');
    renderIcons();
}

function filterArsipBoyongTable() {
    const q = (document.getElementById('ab-search-input')?.value || '').toLowerCase().trim();
    const all = Storage.getBoyongSantri(activePeriodeId);
    if (!q) {
        renderArsipBoyongTable(all);
        return;
    }
    const filtered = all.filter(s =>
        s.nama_santri.toLowerCase().includes(q) ||
        (s.kamar_kelas && s.kamar_kelas.toLowerCase().includes(q))
    );
    renderArsipBoyongTable(filtered);
}

function reaktivasiSantriDariArsip(id, nama) {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    try {
        Storage.reaktivasiSantri(id, activePeriodeId);
        showToast(`Alhamdulillah! Santri "${nama}" berhasil diaktifkan kembali ke pondok!`, 'success');
        loadArsipBoyongList();
        loadMasterSantriList();
        loadMatriks();
        loadDashboard();
        updateBoyongCountBadge();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function konfirmasiHapusSantri(id, nama) {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    document.getElementById('confirm-message').textContent = `Hapus santri "${nama}" dari periode aktif ini?`;
    const btn = document.getElementById('confirm-btn');
    btn.onclick = () => {
        try {
            Storage.deleteSantri(id, activePeriodeId);
            showToast('Santri berhasil dihapus dari periode ini', 'success');
            closeModal('modal-confirm');
            loadMasterSantriList();
            loadMatriks();
            loadDashboard();
            updateBoyongCountBadge();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
    openModal('modal-confirm');
    renderIcons();
}

// ============================================================
// KALKULATOR CEK FISIK / COUNTDOWN TARGET KAS
// ============================================================
function populateCalcBulan() {
    const sel = document.getElementById('calc-bulan');
    if (!sel) return;
    const bulanOrder = getBulanOrder(matriksTipeBulan);
    sel.innerHTML = '';
    bulanOrder.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = getBulanNama(b);
        sel.appendChild(opt);
    });
    // Default ke bulan berjalan
    const curMonth = new Date().getMonth() + 1;
    if (bulanOrder.includes(curMonth)) {
        sel.value = curMonth;
    }
}

function hitungCekFisik() {
    const selBulan = document.getElementById('calc-bulan');
    const inputTarif = document.getElementById('calc-tarif');
    if (!selBulan || !inputTarif) return;

    const bulan = parseInt(selBulan.value) || 1;
    const tarif = parseFloat(inputTarif.value) || 10000;

    // Santri aktif periode ini (santri boyong tidak masuk target & tunggakan)
    const activeSantri = (matriksData || []).filter(s => s.is_active === 1);
    const totalSantriAktif = activeSantri.length;

    let jmlSudah = 0;
    activeSantri.forEach(s => {
        if (s.status && s.status[bulan] === 'sudah') jmlSudah++;
    });

    // Sistem countdown (pengurangan dari total):
    // Sisa Santri Belum Bayar = Total Santri Aktif Periode Ini - Jumlah Santri Aktif Berstatus Sudah
    const sisaBelum = Math.max(0, totalSantriAktif - jmlSudah);
    const targetAwal = totalSantriAktif * tarif;
    const terkumpul = jmlSudah * tarif;
    const targetKurang = sisaBelum * tarif;

    // Update UI Cek Fisik Countdown
    const elTotal = document.getElementById('calc-total-santri');
    const elSudah = document.getElementById('calc-jml-sudah');
    const elBelum = document.getElementById('calc-jml-belum');
    const elTargetAwal = document.getElementById('calc-target-awal');
    const elTargetKurang = document.getElementById('calc-target-kurang');
    const elTerkumpul = document.getElementById('calc-terkumpul');

    if (elTotal) elTotal.textContent = totalSantriAktif;
    if (elSudah) elSudah.textContent = jmlSudah;
    if (elBelum) elBelum.textContent = sisaBelum;
    if (elTargetAwal) elTargetAwal.textContent = formatRp(targetAwal);
    if (elTargetKurang) {
        if (sisaBelum === 0 && totalSantriAktif > 0) {
            elTargetKurang.innerHTML = 'Rp 0 <span class="text-xs font-bold text-emerald-600 block">(Lunas 100% 🎉)</span>';
        } else {
            elTargetKurang.textContent = formatRp(targetKurang);
        }
    }
    if (elTerkumpul) elTerkumpul.textContent = formatRp(terkumpul);

    // Fallback lama jika ada elemen yang membaca ID lama
    const elOldJml = document.getElementById('calc-jml');
    const elOldTarget = document.getElementById('calc-target');
    if (elOldJml) elOldJml.textContent = sisaBelum;
    if (elOldTarget) elOldTarget.textContent = formatRp(targetKurang);
}

// ============================================================
// BUKU KAS UMUM
// ============================================================
function loadBukuKas() {
    if (!activePeriodeId) return;
    const bkResult = Storage.getBukuKas(activePeriodeId);
    bukukasData = bkResult.data;
    renderBukuKasTable();
}

function renderBukuKasTable() {
    const tbody = document.getElementById('bukukas-tbody');
    const cardsContainer = document.getElementById('bukukas-cards');
    const colCount = Auth.isReadOnly() ? 8 : 9;
    if (bukukasData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="py-8 text-center text-slate-400 text-sm">Belum ada transaksi di Buku Kas.</td></tr>`;
        if (cardsContainer) cardsContainer.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">Belum ada transaksi di Buku Kas.</p>`;
        return;
    }

    let saldo = 0;
    let html = '';
    let cardHtml = '';
    bukukasData.forEach((row, idx) => {
        saldo += (parseFloat(row.debit) || 0) - (parseFloat(row.kredit) || 0);

        // === Desktop Table Row ===
        html += `<tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-center text-xs font-medium text-slate-600">${formatHariTanggal(row.tanggal)}</td>
            <td class="text-left font-medium text-slate-800">${escHtml(row.nama_barang || '')}</td>
            <td class="text-left text-slate-500 text-xs">${escHtml(row.keterangan || '')}</td>
            <td class="col-debit text-right font-semibold">${row.debit > 0 ? formatRp(row.debit) : ''}</td>
            <td class="col-kredit text-right font-semibold">${row.kredit > 0 ? formatRp(row.kredit) : ''}</td>
            <td class="col-saldo text-right font-bold">${formatRp(saldo)}</td>
            <td class="text-center text-xs text-slate-500">${escHtml(row.bukti || '-')}</td>
            ${!Auth.isReadOnly() ? `
            <td class="text-center col-aksi">
                <div class="flex items-center justify-center gap-1">
                    <button class="btn-success p-1" title="Edit Baris" onclick="openEditBukuKas(${row.id})"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                    <button class="btn-danger p-1" title="Hapus Baris" onclick="konfirmasiHapusBK(${row.id})"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </td>` : ''}
        </tr>`;

        // === Mobile Card ===
        const isDebit = row.debit > 0;
        const isKredit = row.kredit > 0;
        const borderColor = isDebit ? 'border-l-emerald-400' : (isKredit ? 'border-l-rose-400' : 'border-l-slate-300');
        cardHtml += `<div class="mobile-card-bk border-l-4 ${borderColor}">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <p class="font-semibold text-slate-800 text-sm truncate">${escHtml(row.nama_barang || '-')}</p>
                    <p class="text-[11px] text-slate-400">${formatHariTanggal(row.tanggal)}${row.keterangan ? ' · ' + escHtml(row.keterangan) : ''}${row.bukti && row.bukti !== '-' ? ' · ' + escHtml(row.bukti) : ''}</p>
                </div>
                <div class="text-right shrink-0">
                    ${isDebit ? `<p class="text-xs font-bold text-emerald-600">+${formatRp(row.debit)}</p>` : ''}
                    ${isKredit ? `<p class="text-xs font-bold text-rose-600">-${formatRp(row.kredit)}</p>` : ''}
                    <p class="text-[10px] text-slate-400 font-medium">Saldo: ${formatRp(saldo)}</p>
                </div>
            </div>
            ${!Auth.isReadOnly() ? `<div class="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                <button class="btn-success px-2.5 py-1 text-xs flex items-center gap-1 rounded-md" onclick="openEditBukuKas(${row.id})"><i data-lucide="edit-3" class="w-3 h-3"></i> Edit</button>
                <button class="btn-danger px-2.5 py-1 text-xs flex items-center gap-1 rounded-md" onclick="konfirmasiHapusBK(${row.id})"><i data-lucide="trash-2" class="w-3 h-3"></i> Hapus</button>
            </div>` : ''}
        </div>`;
    });
    tbody.innerHTML = html;
    if (cardsContainer) cardsContainer.innerHTML = cardHtml;
    renderIcons();
}

function tambahBukuKas() {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    const tanggal = document.getElementById('bk-tanggal').value;
    const nama    = document.getElementById('bk-nama').value.trim();
    const ket     = document.getElementById('bk-ket').value.trim();
    const debit   = parseFloat(document.getElementById('bk-debit').value) || 0;
    const kredit  = parseFloat(document.getElementById('bk-kredit').value) || 0;
    const bukti   = document.getElementById('bk-bukti').value.trim();

    if (!nama && debit === 0 && kredit === 0) {
        showToast('Isi minimal nama barang dan jumlah debit atau kredit', 'warning');
        return;
    }

    try {
        Storage.addBukuKas({
            periode_id: activePeriodeId,
            tanggal,
            nama_barang: nama,
            keterangan: ket,
            debit,
            kredit,
            bukti
        });
        showToast('Transaksi berhasil ditambahkan', 'success');
        document.getElementById('bk-tanggal').value = '';
        document.getElementById('bk-nama').value = '';
        document.getElementById('bk-ket').value = '';
        document.getElementById('bk-debit').value = '';
        document.getElementById('bk-kredit').value = '';
        document.getElementById('bk-bukti').value = '';
        loadBukuKas();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function openEditBukuKas(id) {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    const row = bukukasData.find(r => r.id === parseInt(id));
    if (!row) return;
    document.getElementById('edit-bk-id').value = row.id;
    document.getElementById('edit-bk-tanggal').value = row.tanggal || '';
    document.getElementById('edit-bk-nama').value = row.nama_barang || '';
    document.getElementById('edit-bk-ket').value = row.keterangan || '';
    document.getElementById('edit-bk-debit').value = row.debit || 0;
    document.getElementById('edit-bk-kredit').value = row.kredit || 0;
    document.getElementById('edit-bk-bukti').value = row.bukti || '';
    openModal('modal-edit-bk');
}

function simpanEditBukuKas() {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    const id      = document.getElementById('edit-bk-id').value;
    const tanggal = document.getElementById('edit-bk-tanggal').value;
    const nama    = document.getElementById('edit-bk-nama').value.trim();
    const ket     = document.getElementById('edit-bk-ket').value.trim();
    const debit   = parseFloat(document.getElementById('edit-bk-debit').value) || 0;
    const kredit  = parseFloat(document.getElementById('edit-bk-kredit').value) || 0;
    const bukti   = document.getElementById('edit-bk-bukti').value.trim();

    try {
        Storage.updateBukuKas({
            id: parseInt(id),
            tanggal,
            nama_barang: nama,
            keterangan: ket,
            debit,
            kredit,
            bukti
        });
        showToast('Data baris berhasil diperbarui', 'success');
        closeModal('modal-edit-bk');
        loadBukuKas();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function konfirmasiHapusBK(id) {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    document.getElementById('confirm-message').textContent = 'Hapus baris buku kas ini? Data yang terhapus tidak dapat dikembalikan.';
    const btn = document.getElementById('confirm-btn');
    btn.onclick = () => {
        try {
            Storage.deleteBukuKas(id);
            showToast('Baris transaksi berhasil dihapus', 'success');
            closeModal('modal-confirm');
            loadBukuKas();
            loadDashboard();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
    openModal('modal-confirm');
    renderIcons();
}

// ============================================================
// PINJAMAN / KASBON
// ============================================================
function loadPinjaman() {
    if (!activePeriodeId) return;
    const pjResult = Storage.getPinjaman(activePeriodeId);
    pinjamanData = pjResult.data;
    renderPinjamanTable();
}

function renderPinjamanTable() {
    const tbody = document.getElementById('pinjaman-tbody');
    const cardsContainer = document.getElementById('pinjaman-cards');
    const colCount = Auth.isReadOnly() ? 9 : 10;
    if (pinjamanData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colCount}" class="py-8 text-center text-slate-400 text-sm">Belum ada catatan pinjaman pada periode ini.</td></tr>`;
        if (cardsContainer) cardsContainer.innerHTML = `<p class="text-center text-slate-400 text-sm py-6">Belum ada catatan pinjaman pada periode ini.</p>`;
        return;
    }

    let html = '';
    let cardHtml = '';
    pinjamanData.forEach((row, idx) => {
        const sisa = row.total_ambil - row.total_kembali;
        const lunas = sisa <= 0;
        const badgeHTML = lunas
            ? '<span class="badge-lunas">✓ Lunas</span>'
            : `<span class="badge-kurang">Kurang ${formatRp(sisa)}</span>`;

        // === Desktop Table Row ===
        html += `<tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-sm text-center">${formatTanggalShort(row.tanggal)}</td>
            <td class="text-left font-semibold text-slate-800">${escHtml(row.nama_peminjam)}</td>
            <td class="text-left text-xs text-slate-500">${escHtml(row.keperluan || '-')}</td>
            <td class="font-semibold text-right">${formatRp(row.total_ambil)}</td>
            <td class="font-semibold text-green-600 text-right">${formatRp(row.total_kembali)}</td>
            <td class="text-sm text-center">${formatTanggalShort(row.tgl_kembali)}</td>
            <td class="text-xs text-slate-500 text-center">${escHtml(row.tanda_bukti || '-')}</td>
            <td class="text-center">${badgeHTML}</td>
            ${!Auth.isReadOnly() ? `
            <td class="text-center col-aksi">
                <div class="flex items-center justify-center gap-1">
                    ${!lunas ? `<button class="btn-success px-2 py-1 text-xs flex items-center gap-1" onclick="openCicilModal(${row.id})"><i data-lucide="banknote" class="w-3.5 h-3.5"></i> Cicil</button>` : ''}
                    <button class="btn-danger p-1" title="Hapus Pinjaman" onclick="konfirmasiHapusPinjaman(${row.id})"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </div>
            </td>` : ''}
        </tr>`;

        // === Mobile Card ===
        const statusBorder = lunas ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40';
        cardHtml += `<div class="mobile-card ${statusBorder}">
            <div class="flex items-start justify-between gap-2 mb-2">
                <div class="min-w-0">
                    <p class="font-bold text-slate-800 text-sm truncate">${escHtml(row.nama_peminjam)}</p>
                    <p class="text-[11px] text-slate-500">${escHtml(row.keperluan || '-')}</p>
                </div>
                <div class="shrink-0">${badgeHTML}</div>
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                <div><span class="text-slate-400">Tanggal:</span> <span class="font-medium text-slate-700">${formatTanggalShort(row.tanggal)}</span></div>
                <div><span class="text-slate-400">Ambil:</span> <span class="font-bold text-slate-800">${formatRp(row.total_ambil)}</span></div>
                <div><span class="text-slate-400">Kembali:</span> <span class="font-bold text-emerald-600">${formatRp(row.total_kembali)}</span></div>
                <div><span class="text-slate-400">Tgl Kembali:</span> <span class="font-medium text-slate-700">${formatTanggalShort(row.tgl_kembali)}</span></div>
                ${row.tanda_bukti && row.tanda_bukti !== '-' ? `<div class="col-span-2"><span class="text-slate-400">Bukti:</span> <span class="font-medium">${escHtml(row.tanda_bukti)}</span></div>` : ''}
            </div>
            ${!Auth.isReadOnly() ? `<div class="flex items-center gap-2 pt-1.5 border-t border-slate-100">
                ${!lunas ? `<button class="btn-success px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg" onclick="openCicilModal(${row.id})"><i data-lucide="banknote" class="w-3.5 h-3.5"></i> Cicil</button>` : ''}
                <button class="btn-danger px-3 py-1.5 text-xs flex items-center gap-1 rounded-lg" onclick="konfirmasiHapusPinjaman(${row.id})"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button>
            </div>` : ''}
        </div>`;
    });
    tbody.innerHTML = html;
    if (cardsContainer) cardsContainer.innerHTML = cardHtml;
    renderIcons();
}

function tambahPinjaman() {
    if (Auth.isReadOnly()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mengubah data.', 'warning');
        return;
    }
    const tanggal   = document.getElementById('pj-tanggal').value;
    const nama      = document.getElementById('pj-nama').value.trim();
    const keperluan = document.getElementById('pj-keperluan').value.trim();
    const jumlah    = parseFloat(document.getElementById('pj-jumlah').value) || 0;
    const bukti     = document.getElementById('pj-bukti').value.trim();

    if (!nama || jumlah <= 0) {
        showToast('Nama dan nominal pinjaman wajib diisi', 'warning');
        return;
    }

    try {
        Storage.addPinjaman({
            periode_id: activePeriodeId,
            tanggal,
            nama_peminjam: nama,
            keperluan,
            total_ambil: jumlah,
            tanda_bukti: bukti
        });
        showToast('Pinjaman berhasil dicatat & otomatis masuk ke Buku Kas (Kredit)', 'success');
        document.getElementById('pj-tanggal').value = '';
        document.getElementById('pj-nama').value = '';
        document.getElementById('pj-keperluan').value = '';
        document.getElementById('pj-jumlah').value = '';
        document.getElementById('pj-bukti').value = '';
        loadPinjaman();
        loadBukuKas();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function openCicilModal(id) {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    const row = pinjamanData.find(r => r.id === parseInt(id));
    if (!row) return;
    const sisa = row.total_ambil - row.total_kembali;
    currentCicilSisa = sisa;
    document.getElementById('cicil-id').value = row.id;
    document.getElementById('cicil-nama').textContent = row.nama_peminjam;
    document.getElementById('cicil-sisa').textContent = formatRp(sisa);
    document.getElementById('cicil-jumlah').value = '';
    document.getElementById('cicil-jumlah').max = sisa;
    document.getElementById('cicil-jumlah').placeholder = 'Maksimal: ' + formatRp(sisa);
    document.getElementById('cicil-tanggal').value = new Date().toISOString().split('T')[0];
    openModal('modal-cicil');
}

function setLunasiPenuh() {
    if (currentCicilSisa > 0) {
        document.getElementById('cicil-jumlah').value = currentCicilSisa;
    }
}

function prosesCicilan() {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    const id     = document.getElementById('cicil-id').value;
    const jumlah = parseFloat(document.getElementById('cicil-jumlah').value) || 0;
    const tgl    = document.getElementById('cicil-tanggal').value;

    if (jumlah <= 0) {
        showToast('Jumlah bayar harus lebih dari 0', 'warning');
        return;
    }

    try {
        const res = Storage.cicilPinjaman(id, jumlah, tgl);
        showToast(res.lunas ? 'Pinjaman telah LUNAS & pengembalian otomatis masuk ke Buku Kas (Debit)!' : 'Pengembalian pinjaman berhasil dicatat & masuk ke Buku Kas (Debit)', res.lunas ? 'success' : 'info');
        closeModal('modal-cicil');
        loadPinjaman();
        loadBukuKas();
        loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function konfirmasiHapusPinjaman(id) {
    if (Auth.isReadOnly()) {
        showToast('Akses ditolak!', 'warning');
        return;
    }
    document.getElementById('confirm-message').textContent = 'Hapus catatan pinjaman ini? (Catatan terkait di Buku Kas juga akan dihapus)';
    const btn = document.getElementById('confirm-btn');
    btn.onclick = () => {
        try {
            Storage.deletePinjaman(id);
            showToast('Pinjaman berhasil dihapus', 'success');
            closeModal('modal-confirm');
            loadPinjaman();
            loadBukuKas();
            loadDashboard();
        } catch (e) {
            showToast(e.message, 'error');
        }
    };
    openModal('modal-confirm');
    renderIcons();
}

// ============================================================
// CETAK LPJ (LAPORAN PERTANGGUNGJAWABAN)
// ============================================================
function openModalCetakLPJ() {
    const container = document.getElementById('cetak-content');
    const selPeriode = document.getElementById('periode-select');
    const periodeNama = (selPeriode && selPeriode.selectedOptions && selPeriode.selectedOptions[0]) 
        ? selPeriode.selectedOptions[0].textContent 
        : 'Periode Aktif';

    const bkResult = Storage.getBukuKas(activePeriodeId);
    const pjResult = Storage.getPinjaman(activePeriodeId);

    // Hitung saldo berjalan untuk cetak
    let saldoBerjalan = 0;
    const bkRows = bkResult.data.map((r, i) => {
        saldoBerjalan += (parseFloat(r.debit) || 0) - (parseFloat(r.kredit) || 0);
        return `<tr>
            <td style="text-align:center">${i+1}</td>
            <td style="text-align:center">${formatHariTanggal(r.tanggal)}</td>
            <td>${escHtml(r.nama_barang || '')}</td>
            <td>${escHtml(r.keterangan || '')}</td>
            <td style="text-align:right">${r.debit > 0 ? formatRp(r.debit) : ''}</td>
            <td style="text-align:right">${r.kredit > 0 ? formatRp(r.kredit) : ''}</td>
            <td style="text-align:right;font-weight:bold">${formatRp(saldoBerjalan)}</td>
        </tr>`;
    }).join('');

    const totalDebit = bkResult.total_debit;
    const totalKredit = bkResult.total_kredit;

    // Pinjaman belum lunas
    const pjBelumLunas = pjResult.data.filter(p => p.total_kembali < p.total_ambil);
    const pjRows = pjBelumLunas.map((p, i) => {
        const sisa = p.total_ambil - p.total_kembali;
        return `<tr>
            <td style="text-align:center">${i+1}</td>
            <td>${escHtml(p.nama_peminjam)}</td>
            <td>${escHtml(p.keperluan || '-')}</td>
            <td style="text-align:right">${formatRp(p.total_ambil)}</td>
            <td style="text-align:right">${formatRp(p.total_kembali)}</td>
            <td style="text-align:right;font-weight:bold;color:#dc2626">${formatRp(sisa)}</td>
        </tr>`;
    }).join('');

    const today = new Date();
    const tglCetak = formatTanggal(today.toISOString().split('T')[0]);
    const user = Auth.getCurrentUser();

    container.innerHTML = `
        <div style="text-align:center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.25rem; color: #1e293b;">LAPORAN PERTANGGUNGJAWABAN (LPJ) KAS</h2>
            <h3 style="font-size: 1rem; font-weight: 600; color: #475569;">E-Bendahara — Kas Asrama & Pondok</h3>
            <p style="font-size: 0.85rem; color: #64748b;">Periode: ${escHtml(periodeNama)}</p>
        </div>

        <h4 style="font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem; color: #1e293b;">A. Buku Kas Umum</h4>
        <table class="print-table" style="width:100%; border-collapse:collapse; margin-bottom: 1.25rem;">
            <thead>
                <tr>
                    <th style="width:40px">No</th>
                    <th style="width:100px">Tanggal</th>
                    <th>Nama Barang / Uraian</th>
                    <th>Keterangan</th>
                    <th style="width:100px">Debit</th>
                    <th style="width:100px">Kredit</th>
                    <th style="width:110px">Saldo</th>
                </tr>
            </thead>
            <tbody>
                ${bkRows || '<tr><td colspan="7" style="text-align:center; padding:12px">Tidak ada transaksi</td></tr>'}
            </tbody>
            <tfoot>
                <tr style="font-weight:bold; background:#f1f5f9">
                    <td colspan="4" style="text-align:right; padding:8px">TOTAL</td>
                    <td style="text-align:right; color:#16a34a">${formatRp(totalDebit)}</td>
                    <td style="text-align:right; color:#dc2626">${formatRp(totalKredit)}</td>
                    <td style="text-align:right; color:#1e40af">${formatRp(totalDebit - totalKredit)}</td>
                </tr>
            </tfoot>
        </table>

        ${pjBelumLunas.length > 0 ? `
        <h4 style="font-weight: 700; margin-bottom: 0.5rem; font-size: 0.9rem; color: #1e293b;">B. Rekapitulasi Pinjaman Belum Lunas</h4>
        <table class="print-table" style="width:100%; border-collapse:collapse; margin-bottom: 1.25rem;">
            <thead>
                <tr>
                    <th style="width:40px">No</th>
                    <th>Nama Peminjam</th>
                    <th>Keperluan</th>
                    <th style="width:100px">Total Ambil</th>
                    <th style="width:100px">Sudah Kembali</th>
                    <th style="width:110px">Sisa Hutang</th>
                </tr>
            </thead>
            <tbody>${pjRows}</tbody>
        </table>
        ` : ''}

        <div class="ttd-section" style="margin-top: 2.5rem;">
            <p style="text-align:right; font-size: 0.85rem; margin-bottom: 1.5rem; color: #475569;">
                Diketahui pada: ${tglCetak}
            </p>
            <div style="display:flex; justify-content: space-between; padding: 0 3rem;">
                <div class="ttd-box" style="text-align:center;">
                    <p style="font-weight: 600; margin-bottom: 0.25rem; font-size: 0.9rem;">Mengetahui,<br>Pembina Asrama & Pondok</p>
                    <div style="height: 70px;"></div>
                    <div style="border-top: 1px solid #333; display: inline-block; min-width: 190px; padding-top: 4px;">
                        <p style="font-size: 0.85rem;">( ________________________ )</p>
                    </div>
                </div>
                <div class="ttd-box" style="text-align:center;">
                    <p style="font-weight: 600; margin-bottom: 0.25rem; font-size: 0.9rem;">Dibuat oleh,<br>Bendahara</p>
                    <div style="height: 70px;"></div>
                    <div style="border-top: 1px solid #333; display: inline-block; min-width: 190px; padding-top: 4px;">
                        <p style="font-size: 0.85rem;">( ${escHtml(user ? user.nama : 'Bendahara')} )</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    openModal('modal-cetak');
}

// ============================================================
// BACKUP & RESTORE JSON
// ============================================================
function openModalBackup() {
    openModal('modal-backup');
}

function eksporDataJSON() {
    try {
        Storage.exportBackupJSON();
        showToast('Cadangan data JSON berhasil diunduh!', 'success');
    } catch (e) {
        showToast('Gagal ekspor data: ' + e.message, 'error');
    }
}

function imporDataJSON(e) {
    if (!Auth.isBendaharaUtama()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk memulihkan cadangan data.', 'warning');
        if (e && e.target) e.target.value = '';
        return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const content = event.target.result;
            Storage.importBackupJSON(content);
            showToast('Data berhasil dipulihkan dari file JSON!', 'success');
            closeModal('modal-backup');
            // Refresh seluruh state & UI
            loadPeriode();
            Auth.applyUIPermissions();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
}

function resetDataKeAwal() {
    if (!Auth.isBendaharaUtama()) {
        showToast('Kunci Tampilan aktif! Buka Mode Edit dengan PIN (1234) di header untuk mereset database.', 'warning');
        return;
    }
    document.getElementById('confirm-message').textContent = 'PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke setelan pabrik? Seluruh perubahan baru akan hilang.';
    const btn = document.getElementById('confirm-btn');
    btn.onclick = () => {
        Storage.resetToDefault();
        showToast('Database berhasil direset ke data awal!', 'success');
        closeModal('modal-confirm');
        closeModal('modal-backup');
        loadPeriode();
    };
    openModal('modal-confirm');
    renderIcons();
}

// ============================================================
// UTILITY: Escape HTML
// ============================================================
function escHtml(str) {
    if (!str && str !== 0) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================================
// PENGATURAN CLOUD SYNC (api.npoint.io)
// ============================================================
function openModalCloudSync() {
    openModal('modal-cloud-sync');
    if (typeof CloudSync !== 'undefined') {
        const input = document.getElementById('cs-binId');
        if (input) {
            input.value = CloudSync.binId || '';
        }
        CloudSync.updateUIStatusBadge();
    }
    renderIcons();
}

async function simpanCloudSync() {
    const input = document.getElementById('cs-binId');
    const val = input ? input.value.trim() : '';

    if (!val) {
        showToast('Masukkan Kode Bin atau Database URL terlebih dahulu!', 'warning');
        return;
    }

    try {
        if (typeof CloudSync !== 'undefined') {
            const cloudData = await CloudSync.saveBinId(val);
            if (cloudData) {
                showToast('Cloud terhubung dan data dari cloud berhasil dimuat!', 'success');
                if (typeof renderCurrentTab === 'function') renderCurrentTab();
            } else {
                const localData = Storage.getData();
                const pushOk = await CloudSync.pushToCloud(localData, true);
                if (pushOk) {
                    showToast('Cloud terhubung! Data lokal berhasil diunggah ke cloud.', 'success');
                } else {
                    showToast('Terhubung, namun unggah gagal: ' + CloudSync.statusMessage, 'warning');
                }
            }
            CloudSync.startAutoSync();
            closeModal('modal-cloud-sync');
        }
    } catch (e) {
        showToast('Gagal menghubungkan: ' + e.message, 'error');
    }
}

async function salinLinkSinkron() {
    if (typeof CloudSync !== 'undefined') {
        await CloudSync.copySyncLink();
    }
}

async function useOfflineMode() {
    if (typeof CloudSync !== 'undefined') {
        CloudSync.disconnect();
        showToast('Beralih ke mode offline (localStorage + IndexedDB). Data tetap aman di browser ini.', 'info');
        closeModal('modal-cloud-sync');
    }
}

async function resetCloudToDefault() {
    if (typeof CloudSync !== 'undefined' && CloudSync.resetToDefault) {
        await CloudSync.resetToDefault();
        showToast('Database Cloud dihubungkan kembali ke server utama!', 'success');
        if (typeof renderCurrentTab === 'function') renderCurrentTab();
        closeModal('modal-cloud-sync');
    }
}
window.resetCloudToDefault = resetCloudToDefault;

async function syncLocalToCloudNow() {
    if (typeof CloudSync !== 'undefined') {
        showToast('Memeriksa & menyinkronkan data cloud...', 'info');
        const pulled = await CloudSync.pullFromCloud(true);
        if (pulled) {
            showToast('Data terbaru dari Cloud Firebase berhasil dimuat!', 'success');
        } else if (CloudSync.status === 'connected') {
            showToast('Data lokal sudah sinkron dengan Cloud Firebase!', 'success');
        } else {
            showToast('Status: ' + CloudSync.statusMessage, 'warning');
        }
    }
}

// ============================================================
// AUTO REALTIME SYNC LISTENER
// ============================================================
Storage.subscribe(() => {
    // 1. Terapkan hak akses & status gembok yang tersinkron dari cloud
    if (typeof Auth !== 'undefined' && Auth.applyUIPermissions) {
        Auth.applyUIPermissions();
    }

    // 2. Refresh dropdown periode jika ada penambahan/perubahan periode dari perangkat lain
    if (typeof Storage !== 'undefined' && typeof renderPeriodeDropdown === 'function') {
        periodeList = Storage.getPeriodes();
        const sel = document.getElementById('periode-select');
        if (sel) {
            const currentSelected = activePeriodeId;
            sel.innerHTML = '';
            periodeList.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.nama_periode;
                if (p.is_active === 1) opt.selected = true;
                sel.appendChild(opt);
            });
            if (currentSelected && periodeList.some(p => p.id === currentSelected)) {
                activePeriodeId = currentSelected;
                sel.value = activePeriodeId;
            } else {
                const active = Storage.getActivePeriode();
                activePeriodeId = active ? active.id : (periodeList[0]?.id || null);
                if (activePeriodeId) sel.value = activePeriodeId;
            }
        }
    }

    updateBoyongCountBadge();

    // 3. Render ulang tab aktif jika ada perubahan dari cloud atau perangkat lain
    if (currentTab === 'dashboard') loadDashboard();
    else if (currentTab === 'matriks') loadMatriks();
    else if (currentTab === 'bukukas') loadBukuKas();
    else if (currentTab === 'pinjaman') loadPinjaman();
});

// Alias method global
window.quickAddSantri = function(nama, kamar) {
    if (nama && typeof Storage !== 'undefined') {
        return Storage.addSantri({ nama_santri: nama, kamar_kelas: kamar || '' }, activePeriodeId);
    }
    return tambahSantri();
};
window.submitPeriodeBaru = simpanPeriodeBaru;

// ============================================================
// INISIALISASI HALAMAN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 0. Pengaman beforeunload untuk auto-save permanen
    window.addEventListener('beforeunload', () => {
        if (typeof Storage !== 'undefined' && Storage.autoSaveSync) {
            Storage.autoSaveSync();
        }
    });

    // 1. Inisialisasi CloudSync & IndexedDB
    if (typeof CloudSync !== 'undefined') {
        CloudSync.init();
        if (CloudSync.isConnected()) {
            try {
                const cloudData = await CloudSync.pullFromCloud();
                if (cloudData && typeof Storage !== 'undefined') {
                    // Data cloud sudah otomatis tersimpan ke lokal
                }
            } catch (e) {
                console.warn('[App] Bypass initial cloud sync:', e);
            }
            CloudSync.startAutoSync();
        }
    }

    // 2. Cek autentikasi sesi pengguna
    const user = Auth.checkAuth(true);
    if (!user) return;

    // 3. Terapkan kontrol hak akses UI
    Auth.applyUIPermissions();

    // 4. Muat periode aktif dan seluruh data tab
    loadPeriode();

    // 5. Perbarui badge jumlah santri boyong
    updateBoyongCountBadge();

    // 6. Pulihkan tab yang tersimpan dari sessionStorage jika ada
    renderCurrentTab();

    // 7. Perbarui status cloud badge
    if (typeof CloudSync !== 'undefined' && CloudSync.updateUIStatusBadge) {
        CloudSync.updateUIStatusBadge();
    }

    // Inisialisasi ikon Lucide
    renderIcons();
});
