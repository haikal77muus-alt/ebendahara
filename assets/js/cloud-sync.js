/**
 * ============================================================
 * E-Bendahara — cloud-sync.js
 * Sinkronisasi Cloud REST Otomatis Lintas Perangkat
 * Mendukung:
 * 1. Firebase Realtime Database REST API (Native Fetch tanpa SDK)
 * 2. Pantry Cloud (getpantry.cloud)
 * 3. npoint.io (JSON Bin)
 * Penyimpanan Ganda: localStorage + IndexedDB
 * Proteksi Timestamp lastSavedAt & Pencegahan Data Tertimpa Kosong
 * ============================================================
 */

const CLOUD_SYNC_KEY = 'ebendahara_cloud_bin_id';

// Helper pembersih Kode Bin / URL
function cleanBinId(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    // Hilangkan parameter query dan hash
    s = s.split('?')[0].split('#')[0];
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
// CloudSync — Multi-Provider REST Cloud Sync
// ============================================================
const CloudSync = {
    status: 'offline', // 'connected' | 'syncing' | 'offline' | 'error'
    statusMessage: 'Mode Lokal (Offline)',
    binId: null,
    isSyncing: false,
    syncInterval: null,
    lastSyncTime: 0,

    /**
     * Inisialisasi: Muat Bin ID / URL dari parameter (?sync=...) atau localStorage
     */
    init() {
        // 1. Cek parameter ?sync= di URL
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const syncParam = urlParams.get('sync');
            if (syncParam && syncParam.trim()) {
                const cleaned = cleanBinId(syncParam);
                if (cleaned) {
                    this.binId = cleaned;
                    localStorage.setItem(CLOUD_SYNC_KEY, this.binId);
                    // Bersihkan URL tanpa reload
                    const cleanUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            }
        } catch (e) {}

        // 2. Ambil dari localStorage jika ada
        if (!this.binId) {
            this.binId = cleanBinId(localStorage.getItem(CLOUD_SYNC_KEY) || '');
        }

        if (this.binId) {
            const provider = this.getProviderInfo();
            this.setStatus('connected', `Cloud Terhubung (${provider.name})`);
        } else {
            this.setStatus('offline', 'Mode Lokal (Offline) — Belum ada Kode / URL Sinkronisasi');
        }

        this.updateUIStatusBadge();
    },

    /**
     * Deteksi penyedia cloud (Firebase REST, Pantry, npoint, atau Custom REST)
     */
    getProviderInfo() {
        if (!this.binId) {
            return { type: 'none', name: 'None', readUrl: '', writeUrl: '', method: 'POST' };
        }

        let raw = this.binId.trim();

        // 1. Firebase Realtime Database REST API (Native Fetch tanpa SDK)
        if (raw.includes('firebasedatabase.app') || raw.includes('firebaseio.com')) {
            let base = raw.replace(/\/+$/, '');
            if (!base.startsWith('http')) base = 'https://' + base;
            let url = base;
            if (!url.endsWith('.json')) {
                url = `${url}/ebendahara.json`;
            }
            return {
                type: 'firebase',
                name: 'Firebase RTDB (REST)',
                readUrl: url,
                writeUrl: url,
                method: 'PUT'
            };
        }

        // 2. Pantry Cloud (getpantry.cloud UUID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
        if (isUUID || raw.includes('getpantry.cloud')) {
            const cleanId = raw.replace(/.*pantry\//i, '').replace(/\/basket.*/i, '').trim();
            const url = `https://getpantry.cloud/apiv1/pantry/${cleanId}/basket/ebendahara`;
            return {
                type: 'pantry',
                name: 'Pantry Cloud',
                readUrl: url,
                writeUrl: url,
                method: 'POST'
            };
        }

        // 3. npoint.io (default ID atau URL npoint)
        let npointId = raw.replace(/^https?:\/\/(?:api\.|www\.)?npoint\.io\/(?:docs\/)?/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
        return {
            type: 'npoint',
            name: 'npoint.io',
            readUrl: `https://api.npoint.io/${npointId}`,
            writeUrl: `https://api.npoint.io/${npointId}`,
            method: 'POST'
        };
    },

    /**
     * Dapatkan URL sinkron lengkap untuk dibagikan ke HP / laptop lain
     */
    getSyncLink() {
        if (!this.binId) return '';
        const base = window.location.origin + window.location.pathname;
        return base + '?sync=' + encodeURIComponent(this.binId);
    },

    /**
     * Salin link sinkronisasi ke clipboard
     */
    async copySyncLink() {
        const link = this.getSyncLink();
        if (!link) {
            if (typeof showToast === 'function') {
                showToast('Hubungkan Kode / URL Sinkronisasi terlebih dahulu!', 'warning');
            }
            return false;
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
            } else {
                throw new Error('Clipboard API fallback');
            }
            if (typeof showToast === 'function') {
                showToast('Link sinkronisasi disalin! Buka link ini di perangkat lain untuk langsung terhubung.', 'success');
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
                btnElem.title = '🟢 ' + this.statusMessage;
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
        if (!this.binId || this.isSyncing) return false;
        this.isSyncing = true;
        this.setStatus('syncing', 'Mengunggah data ke cloud...');

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
                if (provider.type === 'npoint' && (res.status === 500 || res.status === 405)) {
                    throw new Error('npoint.io menolak penyimpanan otomatis (Read-Only). Gunakan Firebase RTDB REST URL untuk edit dua arah.');
                }
                throw new Error(`HTTP ${res.status}`);
            }

            // Simpan juga ke lokal data dengan timestamp yang telah terverifikasi terunggah
            if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                Storage.saveLocalOnly(payload);
            }

            this.lastSyncTime = Date.now();
            this.setStatus('connected', `Cloud Terhubung & Data Tersinkron (${provider.name})`);
            return true;
        } catch (e) {
            console.error('[CloudSync] Push gagal:', e);
            this.setStatus('error', 'Gagal mengunggah: ' + e.message);
            return false;
        } finally {
            this.isSyncing = false;
        }
    },

    /**
     * Tarik data dari cloud
     */
    async pullFromCloud() {
        if (!this.binId || this.isSyncing) return null;
        this.isSyncing = true;
        this.setStatus('syncing', 'Mengunduh data dari cloud...');

        const provider = this.getProviderInfo();

        try {
            const res = await fetch(provider.readUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let cloudData = await res.json();

            // Tangani pembungkus objek jika ada (misal Pantry atau Firebase)
            if (cloudData && typeof cloudData === 'object' && cloudData.ebendahara && cloudData.ebendahara.periode) {
                cloudData = cloudData.ebendahara;
            }

            // Validasi format dasar objek data cloud
            if (!cloudData || typeof cloudData !== 'object' || !Array.isArray(cloudData.periode)) {
                this.setStatus('connected', `Cloud Terhubung (${provider.name} - data baru)`);
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

            // 1. Jika data cloud lebih baru, ATAU data lokal masih kosong bawaan sedangkan cloud sudah terisi
            if (cloudTime > localTime || (!localHasContent && cloudHasContent)) {
                if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                    Storage.saveLocalOnly(cloudData);
                }
                this.setStatus('connected', `Cloud Terhubung & Data Tersinkron (${provider.name})`);
                this.isSyncing = false;
                
                // Segera refresh tampilan tab aktif agar langsung berubah di layar
                if (typeof renderCurrentTab === 'function') {
                    renderCurrentTab();
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
                this.setStatus('connected', `Cloud Terhubung & Data Tersinkron (${provider.name})`);
                this.isSyncing = false;
                return null;
            }
        } catch (e) {
            console.error('[CloudSync] Pull gagal:', e);
            this.setStatus('error', 'Gagal mengunduh: ' + e.message);
            this.isSyncing = false;
            return null;
        }
    },

    /**
     * Simpan Bin ID / URL dan langsung sinkronkan
     */
    async saveBinId(rawId) {
        const id = cleanBinId(rawId);
        if (!id) return;
        this.binId = id;
        localStorage.setItem(CLOUD_SYNC_KEY, this.binId);
        
        const provider = this.getProviderInfo();
        this.setStatus('connected', `Cloud Terhubung (${provider.name})`);

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
     * Mulai auto-sync periodik (setiap 20 detik)
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
        }, 20000); // 20 detik
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
