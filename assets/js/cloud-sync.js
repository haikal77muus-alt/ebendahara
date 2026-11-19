/**
 * ============================================================
 * E-Bendahara — cloud-sync.js
 * Sinkronisasi Cloud JSON Otomatis via api.npoint.io
 * Penyimpanan Ganda: localStorage + IndexedDB
 * Proteksi Timestamp lastSavedAt & Pencegahan Data Tertimpa Kosong
 * ============================================================
 */

const CLOUD_SYNC_KEY = 'ebendahara_cloud_bin_id';
const NPOINT_API = 'https://api.npoint.io';

// Helper pembersih Kode Bin (mendukung input ID mentah maupun URL lengkap npoint.io)
function cleanBinId(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    // Hilangkan URL prefix jika pengguna menempelkan link lengkap npoint
    s = s.replace(/^https?:\/\/(?:api\.|www\.)?npoint\.io\/(?:docs\/)?/i, '');
    // Hilangkan parameter query jika ada
    s = s.split('?')[0].split('#')[0];
    // Bersihkan karakter non-alfanumerik aman
    s = s.replace(/[^a-zA-Z0-9_-]/g, '');
    return s;
}

// ============================================================
// IndexedDB — Penyimpanan Cadangan Lokal Kedua (Dual Storage)
// ============================================================
const IDB = {
    DB_NAME: 'ebendahara_idb',
    STORE_NAME: 'appdata',
    DATA_KEY: 'main_database',

    _db: null,

    async open() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
            req.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            req.onerror = (e) => {
                console.warn('[IDB] Gagal membuka IndexedDB:', e);
                reject(e);
            };
        });
    },

    async save(data) {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readwrite');
                const store = tx.objectStore(this.STORE_NAME);
                store.put(data, this.DATA_KEY);
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => reject(e);
            });
        } catch (e) {
            console.warn('[IDB] Gagal menyimpan ke IndexedDB:', e);
        }
    },

    async load() {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(this.STORE_NAME, 'readonly');
                const store = tx.objectStore(this.STORE_NAME);
                const req = store.get(this.DATA_KEY);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = (e) => reject(e);
            });
        } catch (e) {
            console.warn('[IDB] Gagal membaca IndexedDB:', e);
            return null;
        }
    }
};

// ============================================================
// CloudSync — Sinkronisasi Otomatis api.npoint.io
// ============================================================
const CloudSync = {
    status: 'offline', // 'connected' | 'syncing' | 'offline' | 'error'
    statusMessage: 'Mode Lokal (Offline)',
    binId: null,
    isSyncing: false,
    syncInterval: null,
    lastSyncTime: 0,

    /**
     * Inisialisasi: Muat Bin ID dari URL parameter (?sync=KODE_BIN) atau localStorage
     */
    init() {
        // 1. Cek apakah ada parameter ?sync= di URL
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const syncParam = urlParams.get('sync');
            if (syncParam && syncParam.trim()) {
                const cleaned = cleanBinId(syncParam);
                if (cleaned) {
                    this.binId = cleaned;
                    localStorage.setItem(CLOUD_SYNC_KEY, this.binId);
                    // Bersihkan URL tanpa reload agar rapi di browser
                    const cleanUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            }
        } catch (e) {}

        // 2. Jika belum dari URL, ambil dari localStorage
        if (!this.binId) {
            this.binId = cleanBinId(localStorage.getItem(CLOUD_SYNC_KEY) || '');
        }

        if (this.binId) {
            this.setStatus('connected', 'Cloud Terhubung (npoint.io)');
        } else {
            this.setStatus('offline', 'Mode Lokal (Offline) — Belum ada Kode Sinkronisasi');
        }

        this.updateUIStatusBadge();
    },

    /**
     * Dapatkan URL sinkron lengkap untuk dibagikan ke HP / laptop lain
     */
    getSyncLink() {
        if (!this.binId) return '';
        const base = window.location.origin + window.location.pathname;
        return base + '?sync=' + this.binId;
    },

    /**
     * Salin link sinkronisasi ke clipboard dengan fallback aman
     */
    async copySyncLink() {
        const link = this.getSyncLink();
        if (!link) {
            if (typeof showToast === 'function') {
                showToast('Hubungkan Kode Sinkronisasi npoint.io terlebih dahulu!', 'warning');
            }
            return false;
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                throw new Error('Clipboard API tidak didukung');
            }
            if (typeof showToast === 'function') {
                showToast('Link sinkronisasi disalin! Buka link ini di perangkat lain untuk langsung terhubung.', 'success');
            }
            return true;
        } catch (err) {
            // Fallback execCommand
            try {
                const ta = document.createElement('textarea');
                ta.value = link;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                if (typeof showToast === 'function') {
                    showToast('Link sinkronisasi disalin! Buka link ini di perangkat lain untuk langsung terhubung.', 'success');
                }
                return true;
            } catch (e2) {
                if (typeof showToast === 'function') {
                    showToast('Gagal menyalin otomatis. Link: ' + link, 'info');
                }
                return false;
            }
        }
    },

    /**
     * Apakah cloud sync aktif
     */
    isConnected() {
        return !!this.binId;
    },

    /**
     * Set status dan update UI
     */
    setStatus(status, message) {
        this.status = status;
        this.statusMessage = message;
        this.updateUIStatusBadge();
    },

    /**
     * Update tampilan badge status cloud di header & modal
     */
    updateUIStatusBadge() {
        const textElem = document.getElementById('cloud-status-text');
        const dotElem = document.getElementById('cloud-indicator-dot');
        const pingElem = document.getElementById('cloud-indicator-ping');
        const btnElem = document.getElementById('btn-cloud-status');

        if (!dotElem) return;

        if (this.status === 'connected') {
            if (textElem) textElem.textContent = 'Cloud Terhubung';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
            if (pingElem) {
                pingElem.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
                pingElem.style.display = 'inline-flex';
            }
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer';
                btnElem.title = '🟢 Cloud Terhubung (npoint.io) — Klik untuk pengaturan sinkronisasi';
            }
        } else if (this.status === 'syncing') {
            if (textElem) textElem.textContent = 'Menyinkronkan...';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
            if (pingElem) {
                pingElem.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
                pingElem.style.display = 'inline-flex';
            }
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 cursor-pointer';
                btnElem.title = '🟡 Sedang menyinkronkan data...';
            }
        } else if (this.status === 'error') {
            if (textElem) textElem.textContent = 'Sinkron Gagal';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer';
                btnElem.title = '🔴 ' + this.statusMessage;
            }
        } else {
            if (textElem) textElem.textContent = 'Mode Lokal (Offline)';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer';
                btnElem.title = '⚪ Mode Lokal — Klik untuk menghubungkan Cloud';
            }
        }

        // Update status di modal jika terbuka
        const modalStatusText = document.getElementById('modal-cloud-status-desc');
        const modalStatusDot = document.getElementById('modal-cloud-status-dot');
        if (modalStatusText) modalStatusText.textContent = this.statusMessage;
        if (modalStatusDot) {
            modalStatusDot.className = 'w-3 h-3 rounded-full ' + (
                this.status === 'connected' ? 'bg-emerald-500 ring-4 ring-emerald-100' :
                this.status === 'syncing' ? 'bg-amber-500 ring-4 ring-amber-100' :
                this.status === 'error' ? 'bg-rose-500 ring-4 ring-rose-100' :
                'bg-slate-400 ring-4 ring-slate-100'
            );
        }
    },

    /**
     * Push data lokal ke cloud (npoint.io)
     * Memperbarui timestamp lastSavedAt sebelum dikirim
     */
    async pushToCloud(data, force = false) {
        if (!this.binId || this.isSyncing) return;
        this.isSyncing = true;
        this.setStatus('syncing', 'Mengunggah data ke cloud...');

        try {
            const payload = JSON.parse(JSON.stringify(data));
            payload.lastSavedAt = new Date().toISOString();

            const res = await fetch(`${NPOINT_API}/${this.binId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            this.lastSyncTime = Date.now();
            this.setStatus('connected', 'Cloud Terhubung & Data Tersinkron');
        } catch (e) {
            console.error('[CloudSync] Push gagal:', e);
            this.setStatus('error', 'Gagal mengunggah ke cloud: ' + e.message);
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * Tarik data dari cloud (npoint.io)
     * Membandingkan timestamp lastSavedAt:
     * - Hanya perbarui lokal jika cloud lebih baru ATAU lokal masih kosong bawaan
     * - Jangan pernah timpa data lokal yang valid dengan data kosong
     */
    async pullFromCloud() {
        if (!this.binId || this.isSyncing) return null;
        this.isSyncing = true;
        this.setStatus('syncing', 'Mengunduh data dari cloud...');

        try {
            const res = await fetch(`${NPOINT_API}/${this.binId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const cloudData = await res.json();

            // Validasi format dasar objek data cloud
            if (!cloudData || typeof cloudData !== 'object' || !Array.isArray(cloudData.periode)) {
                this.setStatus('connected', 'Cloud Terhubung (format data cloud belum diinisialisasi)');
                this.isSyncing = false;
                return null;
            }

            const localData = typeof Storage !== 'undefined' ? Storage.getData() : null;
            const cloudTime = cloudData.lastSavedAt ? new Date(cloudData.lastSavedAt).getTime() : 0;
            const localTime = localData && localData.lastSavedAt ? new Date(localData.lastSavedAt).getTime() : 0;

            // Periksa apakah data lokal memiliki catatan nyata pengguna
            const localHasContent = localData && (
                (Array.isArray(localData.buku_kas) && localData.buku_kas.length > 0) ||
                (Array.isArray(localData.pinjaman) && localData.pinjaman.length > 0) ||
                (Array.isArray(localData.periode) && localData.periode.some(p => Array.isArray(p.santri_list) && p.santri_list.length > 0)) ||
                (Array.isArray(localData.master_santri) && localData.master_santri.length > 0)
            );

            // Periksa apakah cloud memiliki catatan nyata
            const cloudHasContent = cloudData && (
                (Array.isArray(cloudData.buku_kas) && cloudData.buku_kas.length > 0) ||
                (Array.isArray(cloudData.pinjaman) && cloudData.pinjaman.length > 0) ||
                (Array.isArray(cloudData.periode) && cloudData.periode.some(p => Array.isArray(p.santri_list) && p.santri_list.length > 0)) ||
                (Array.isArray(cloudData.master_santri) && cloudData.master_santri.length > 0)
            );

            // Logika Proteksi:
            // 1. Jika cloud lebih baru, ATAU data lokal masih kosong bawaan sedangkan cloud sudah terisi
            if (cloudTime > localTime || (!localHasContent && cloudHasContent)) {
                if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                    Storage.saveLocalOnly(cloudData);
                }
                this.setStatus('connected', 'Cloud Terhubung & Data Tersinkron');
                this.isSyncing = false;
                return cloudData;
            } 
            // 2. Jika data lokal lebih baru dan memiliki konten, otomatis push ke cloud
            else if (localTime > cloudTime && localHasContent) {
                this.isSyncing = false;
                await this.pushToCloud(localData);
                return null;
            } 
            // 3. Status identik
            else {
                this.setStatus('connected', 'Cloud Terhubung & Data Tersinkron');
                this.isSyncing = false;
                return null;
            }
        } catch (e) {
            console.error('[CloudSync] Pull gagal:', e);
            this.setStatus('error', 'Gagal mengunduh dari cloud: ' + e.message);
            this.isSyncing = false;
            return null;
        }
    },

    /**
     * Simpan Bin ID dan langsung sinkronkan
     */
    async saveBinId(rawId) {
        const id = cleanBinId(rawId);
        if (!id) return;
        this.binId = id;
        localStorage.setItem(CLOUD_SYNC_KEY, this.binId);
        this.setStatus('connected', 'Cloud Terhubung (npoint.io)');

        // Tarik data dari cloud untuk pertama kali
        const cloudData = await this.pullFromCloud();
        return cloudData;
    },

    /**
     * Putuskan koneksi cloud (mode offline)
     */
    disconnect() {
        this.binId = null;
        localStorage.removeItem(CLOUD_SYNC_KEY);
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.setStatus('offline', 'Mode Lokal (Offline) — Data hanya tersimpan di browser ini');
    },

    /**
     * Mulai auto-sync periodik (setiap 30 detik)
     */
    startAutoSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        if (!this.binId) return;

        this.syncInterval = setInterval(async () => {
            if (!this.binId || this.isSyncing) return;
            try {
                await this.pullFromCloud();
            } catch (e) {
                console.warn('[CloudSync] Auto-sync error:', e);
            }
        }, 30000); // 30 detik
    },

    /**
     * Hentikan auto-sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
};

// Ekspor global
window.CloudSync = CloudSync;
window.IDB = IDB;
