/**
 * ============================================================
 * E-Bendahara — cloud-sync.js
 * Sinkronisasi Cloud REST Otomatis Lintas Perangkat (Zero-Config)
 * Backend Utama: Firebase Realtime Database REST API (Native Fetch tanpa SDK)
 * Endpoint Permanen: https://ebendahara-asrama-default-rtdb.firebaseio.com/ebendahara_database.json
 * Penyimpanan Ganda: localStorage + IndexedDB
 * Proteksi Timestamp lastSavedAt & Auto Sync Realtime Dua Arah
 * ============================================================
 */

const CLOUD_SYNC_KEY = 'ebendahara_cloud_bin_id';
const DEFAULT_CLOUD_URL = 'https://ebendahara-asrama-default-rtdb.firebaseio.com/ebendahara_database.json';

// Helper pembersih Kode Bin / URL
function cleanBinId(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    s = s.split('?')[0].split('#')[0];
    return s;
}

/**
 * Normalisasi objek/array dari Firebase (karena Firebase kadang mengembalikan array sebagai objek {0:.., 1:..})
 */
function ensureArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'object') {
        return Object.values(val).filter(Boolean);
    }
    return [];
}

function sanitizeCloudData(data) {
    if (!data || typeof data !== 'object') return null;

    // Buka wrapper jika ada
    if (data.ebendahara_database && typeof data.ebendahara_database === 'object') {
        data = data.ebendahara_database;
    }
    if (data.ebendahara && typeof data.ebendahara === 'object') {
        data = data.ebendahara;
    }

    data.buku_kas = ensureArray(data.buku_kas);
    data.pinjaman = ensureArray(data.pinjaman);
    data.matriks_kas_bulanan = ensureArray(data.matriks_kas_bulanan);
    data.master_santri = ensureArray(data.master_santri);
    data.periode = ensureArray(data.periode);
    data.periode.forEach(p => {
        if (p && typeof p === 'object') {
            p.santri_list = ensureArray(p.santri_list);
        }
    });
    data.users = ensureArray(data.users);
    if (!data.settings || typeof data.settings !== 'object') {
        data.settings = { edit_pin: '1234', is_locked: false };
    }
    return data;
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
// CloudSync — REST Cloud Sync Otomatis Permanen
// ============================================================
const CloudSync = {
    status: 'connected', // 'connected' | 'syncing' | 'offline' | 'error'
    statusMessage: 'Cloud Terhubung (Otomatis)',
    binId: DEFAULT_CLOUD_URL,
    isSyncing: false,
    syncInterval: null,
    lastSyncTime: 0,

    /**
     * Inisialisasi: Gunakan DEFAULT_CLOUD_URL otomatis permanen (Zero Config)
     */
    init() {
        // Selalu gunakan database resmi Firebase tanpa perlu utak-atik lagi
        this.binId = DEFAULT_CLOUD_URL;
        try {
            localStorage.setItem(CLOUD_SYNC_KEY, DEFAULT_CLOUD_URL);
        } catch (e) { }

        this.setStatus('connected', 'Cloud Aktif (Firebase Cloud)');
        this.updateUIStatusBadge();
    },

    /**
     * Deteksi penyedia cloud (Permanen: Firebase REST API)
     */
    getProviderInfo() {
        return {
            type: 'firebase',
            name: 'Firebase Cloud',
            readUrl: DEFAULT_CLOUD_URL,
            writeUrl: DEFAULT_CLOUD_URL,
            method: 'PUT'
        };
    },

    getSyncLink() {
        return window.location.origin + window.location.pathname;
    },

    async copySyncLink() {
        const link = this.getSyncLink();
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                throw new Error('Clipboard fallback');
            }
            if (typeof showToast === 'function') {
                showToast('Link website disalin! Buka di HP atau perangkat lain, data otomatis sinkron.', 'success');
            }
            return true;
        } catch (err) {
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
                    showToast('Link website disalin! Buka di HP atau perangkat lain, data otomatis sinkron.', 'success');
                }
                return true;
            } catch (e2) {
                if (typeof showToast === 'function') {
                    showToast('Link: ' + link, 'info');
                }
                return false;
            }
        }
    },

    isConnected() {
        return true; // Selalu terhubung ke default database permanen
    },

    setStatus(status, message) {
        this.status = status;
        this.statusMessage = message;
        this.updateUIStatusBadge();
    },

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
                btnElem.title = '🟢 Cloud Aktif — Data sinkron otomatis di semua perangkat (HP & Laptop)';
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
            if (textElem) textElem.textContent = 'Mode Offline';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer';
                btnElem.title = '🔴 ' + this.statusMessage;
            }
        } else {
            if (textElem) textElem.textContent = 'Mode Lokal';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer';
                btnElem.title = '⚪ Mode Lokal';
            }
        }

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
     * Push data lokal ke cloud
     */
    async pushToCloud(data, force = false) {
        if (this.isSyncing) return false;
        this.isSyncing = true;
        this.setStatus('syncing', 'Menyimpan data ke cloud...');

        const provider = this.getProviderInfo();

        try {
            const payload = JSON.parse(JSON.stringify(data));
            payload.lastSavedAt = new Date().toISOString();

            const res = await fetch(provider.writeUrl, {
                method: provider.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            // Simpan juga ke lokal data dengan timestamp yang telah terverifikasi terunggah
            if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                Storage.saveLocalOnly(payload);
            }

            this.lastSyncTime = Date.now();
            this.setStatus('connected', 'Cloud Terhubung & Data Tersinkron');
            return true;
        } catch (e) {
            console.error('[CloudSync] Push gagal:', e);
            this.setStatus('error', 'Koneksi offline: ' + e.message);
            return false;
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * Tarik data dari cloud (pullFromCloud)
     */
    async pullFromCloud(force = false) {
        if (this.isSyncing) return null;
        this.isSyncing = true;
        this.setStatus('syncing', 'Memuat data dari cloud...');

        const provider = this.getProviderInfo();

        try {
            const res = await fetch(provider.readUrl);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const rawData = await res.json();
            const cloudData = sanitizeCloudData(rawData);

            if (!cloudData || !Array.isArray(cloudData.periode)) {
                this.setStatus('connected', 'Cloud Terhubung (Database Siap)');
                this.isSyncing = false;
                return null;
            }

            const localData = typeof Storage !== 'undefined' ? Storage.getData() : null;
            const cloudTime = cloudData.lastSavedAt ? new Date(cloudData.lastSavedAt).getTime() : 0;
            const localTime = localData && localData.lastSavedAt ? new Date(localData.lastSavedAt).getTime() : 0;

            const localHasContent = localData && (
                (Array.isArray(localData.buku_kas) && localData.buku_kas.length > 0) ||
                (Array.isArray(localData.pinjaman) && localData.pinjaman.length > 0) ||
                (Array.isArray(localData.periode) && localData.periode.some(p => Array.isArray(p.santri_list) && p.santri_list.length > 0)) ||
                (Array.isArray(localData.master_santri) && localData.master_santri.length > 0)
            );

            const cloudHasContent = cloudData && (
                (Array.isArray(cloudData.buku_kas) && cloudData.buku_kas.length > 0) ||
                (Array.isArray(cloudData.pinjaman) && cloudData.pinjaman.length > 0) ||
                (Array.isArray(cloudData.periode) && cloudData.periode.some(p => Array.isArray(p.santri_list) && p.santri_list.length > 0)) ||
                (Array.isArray(cloudData.master_santri) && cloudData.master_santri.length > 0)
            );

            // Cek apakah data lokal masih template lama (< 3 periode atau < 50 santri) sedangkan cloud sudah berisi data lengkap Excel (3 periode, 100+ santri)
            const localIsOutdated = !localData || !Array.isArray(localData.periode) || localData.periode.length < 3 || (!localData.master_santri || localData.master_santri.length < 50);
            const cloudIsComplete = Array.isArray(cloudData.periode) && cloudData.periode.length >= 3 && Array.isArray(cloudData.master_santri) && cloudData.master_santri.length >= 50;

            // 1. Jika force, ATAU cloud lebih baru, ATAU data lokal belum lengkap/lama, ATAU lokal masih kosong
            if (force || cloudTime > localTime || (!localHasContent && cloudHasContent) || (localIsOutdated && cloudIsComplete)) {
                if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                    Storage.saveLocalOnly(cloudData);
                }
                this.setStatus('connected', 'Cloud Terhubung & Data Tersinkron');
                this.isSyncing = false;

                // Segera refresh periode dan tampilan tab aktif agar langsung berubah di layar
                if (typeof loadPeriode === 'function') {
                    try { loadPeriode(); } catch (e) { }
                } else if (typeof renderPeriodeDropdown === 'function') {
                    try { renderPeriodeDropdown(); } catch (e) { }
                }
                if (typeof renderCurrentTab === 'function') {
                    try { renderCurrentTab(); } catch (e) { }
                }
                return cloudData;
            }
            // 2. Jika data lokal lebih baru dan memiliki konten, otomatis unggah ke cloud
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
            this.setStatus('error', 'Koneksi offline: ' + e.message);
            this.isSyncing = false;
            return null;
        }
    },

    async saveBinId(rawId) {
        this.binId = DEFAULT_CLOUD_URL;
        localStorage.setItem(CLOUD_SYNC_KEY, DEFAULT_CLOUD_URL);
        const provider = this.getProviderInfo();
        this.setStatus('connected', `Cloud Aktif (${provider.name})`);
        return this.pullFromCloud(true);
    },

    resetToDefault() {
        this.binId = DEFAULT_CLOUD_URL;
        localStorage.setItem(CLOUD_SYNC_KEY, DEFAULT_CLOUD_URL);
        this.setStatus('connected', 'Cloud Terhubung (Database Utama)');
        return this.pullFromCloud(true);
    },

    disconnect() {
        this.setStatus('offline', 'Mode Offline (Lokal)');
    },

    /**
     * Mulai auto-sync periodik (setiap 10 detik agar cepat dan responsif)
     */
    startAutoSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);

        this.syncInterval = setInterval(async () => {
            if (this.isSyncing) return;
            try {
                await this.pullFromCloud();
            } catch (e) {
                console.warn('[CloudSync] Auto-sync notice:', e);
            }
        }, 10000); // 10 detik
    },

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
