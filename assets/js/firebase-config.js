/**
 * ============================================================
 * E-Bendahara — firebase-config.js
 * Konfigurasi Koneksi Firebase Cloud Realtime Database,
 * Mode Fallback Lokal (localStorage) Otomatis, & Sinkronisasi
 * Lintas Perangkat (HP / Laptop / Tablet)
 * ============================================================
 */

// Kunci penyimpanan konfigurasi Firebase di localStorage
const FIREBASE_CONFIG_STORAGE_KEY = 'ebendahara_firebase_config';
const FIREBASE_DB_ROOT = 'ebendahara_database';

/**
 * Konfigurasi Default Firebase.
 * Pengurus dapat langsung memasukkan config di bawah ini, ATAU
 * menempelkannya lewat modal "Konfigurasi Cloud" di antarmuka web
 * tanpa perlu mengedit kode sumber secara manual!
 */
const FIREBASE_CONFIG_DEFAULT = {
    apiKey: "AIzaSyAYKn6jqaBOsbDTUyIVceODpDCRcX0UpYs",
    authDomain: "e-bendahara-asrama.firebaseapp.com",
    databaseURL: "https://e-bendahara-asrama-default-rtdb.firebaseio.com",
    projectId: "e-bendahara-asrama",
    storageBucket: "e-bendahara-asrama.firebasestorage.app",
    messagingSenderId: "1022493731526",
    appId: "1:1022493731526:web:b3aeb45df9c62a3ed705c7"
};

/**
 * Firebase Realtime Database mengubah array JavaScript menjadi objek dengan kunci numerik (0,1,2,...).
 * Saat data dibaca kembali, snapshot.val() KADANG mengembalikan objek bukan array.
 * Fungsi ini mengonversi kembali objek-objek tersebut menjadi array yang valid secara rekursif.
 */
function sanitizeFirebaseData(data) {
    if (data === null || data === undefined || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => sanitizeFirebaseData(item));

    const keys = Object.keys(data);
    // Cek apakah objek ini seharusnya array (semua kunci = integer berurutan dari 0)
    const isArrayLike = keys.length > 0 && keys.every((k, i) => String(i) === k);

    if (isArrayLike) {
        return keys.map(k => sanitizeFirebaseData(data[k]));
    }

    const result = {};
    for (const key of keys) {
        result[key] = sanitizeFirebaseData(data[key]);
    }
    return result;
}

const FirebaseSync = {
    app: null,
    db: null,
    ref: null,
    status: 'offline', // 'connected' | 'connecting' | 'offline' | 'error'
    statusMessage: 'Mode Offline (Lokal)',
    listeners: [],
    saveTimeout: null,
    isWritingRemote: false,
    initialSyncPromise: null,

    /**
     * Dapatkan konfigurasi aktif:
     * 1. Utamakan konfigurasi yang disimpan / diperbarui secara manual oleh pengguna di localStorage
     * 2. Atau konfigurasi bawaan FIREBASE_CONFIG_DEFAULT sebagai cadangan
     */
    getConfig() {
        try {
            const saved = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && (parsed.databaseURL || (parsed.projectId && parsed.apiKey))) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('[FirebaseSync] Gagal membaca config tersimpan:', e);
        }

        return FIREBASE_CONFIG_DEFAULT;
    },

    /**
     * Cek apakah konfigurasi sudah terisi
     */
    hasValidConfig() {
        if (localStorage.getItem('ebendahara_force_offline') === 'true') {
            return false;
        }
        const cfg = this.getConfig();
        return Boolean(cfg && (cfg.databaseURL || (cfg.projectId && cfg.apiKey)));
    },

    /**
     * Menunggu pembacaan cloud once('value') saat inisialisasi sebelum pengecekan login maupun me-render halaman.
     * Mengembalikan Promise yang selesai begitu data cloud terbaca atau timeout pengaman tercapai.
     */
    waitForInitialSync(timeoutMs = 4000) {
        if (!this.hasValidConfig() || typeof firebase === 'undefined' || !firebase.database) {
            return Promise.resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
        }

        if (this.initialSyncPromise) {
            return this.initialSyncPromise;
        }

        this.initialSyncPromise = new Promise((resolve) => {
            let settled = false;

            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    console.info('[FirebaseSync] Timeout sinkronisasi cloud, melanjutkan dengan cache lokal.');
                    resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
                }
            }, timeoutMs);

            try {
                this.init();
                if (!this.ref) {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
                    }
                    return;
                }

                this.ref.once('value').then(snapshot => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        let cloudData = snapshot.val();
                        if (cloudData && typeof cloudData === 'object') {
                            cloudData = sanitizeFirebaseData(cloudData);
                        }
                        if (cloudData && typeof cloudData === 'object' && Array.isArray(cloudData.periode)) {
                            if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                                Storage.saveLocalOnly(cloudData);
                            } else {
                                localStorage.setItem('ebendahara_database_v1', JSON.stringify(cloudData));
                            }
                            this.setStatus('connected', 'Cloud Realtime Terhubung & Sinkron');
                            this.notifyListeners(cloudData);
                            resolve(cloudData);
                        } else if (!cloudData) {
                            console.info('[FirebaseSync] Cloud masih kosong, mengunggah data seeder awal...');
                            const localData = typeof Storage !== 'undefined' ? Storage.getData() : null;
                            if (localData) {
                                this.pushToCloud(localData, true);
                            }
                            this.setStatus('connected', 'Cloud Realtime Terhubung & Sinkron');
                            resolve(localData);
                        } else {
                            resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
                        }
                    }
                }).catch(err => {
                    if (!settled) {
                        settled = true;
                        clearTimeout(timer);
                        console.warn('[FirebaseSync] Gagal membaca cloud sekali (once):', err);
                        resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
                    }
                });
            } catch (err) {
                if (!settled) {
                    settled = true;
                    clearTimeout(timer);
                    resolve(typeof Storage !== 'undefined' ? Storage.getData() : null);
                }
            }
        });

        return this.initialSyncPromise;
    },

    /**
     * Daftarkan listener saat ada data baru dari cloud
     */
    onDataChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    },

    /**
     * Beritahukan semua listener bahwa data cloud diperbarui
     */
    notifyListeners(data) {
        this.listeners.forEach(fn => {
            try { fn(data); } catch (e) { console.error('[FirebaseSync] Listener error:', e); }
        });
    },

    /**
     * Update status koneksi dan perbarui indikator UI
     */
    setStatus(status, message) {
        this.status = status;
        this.statusMessage = message;
        this.updateUIStatusBadge();
    },

    /**
     * Perbarui tampilan badge indikator di header & modal
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
                btnElem.title = '🟢 Cloud Realtime Terhubung — Klik untuk pengaturan Firebase';
            }
        } else if (this.status === 'connecting') {
            if (textElem) textElem.textContent = 'Menghubungkan...';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
            if (pingElem) {
                pingElem.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
                pingElem.style.display = 'inline-flex';
            }
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 cursor-pointer';
                btnElem.title = '🟡 Sedang menghubungkan ke Firebase Cloud...';
            }
        } else if (this.status === 'error') {
            if (textElem) textElem.textContent = 'Koneksi Gagal';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer';
                btnElem.title = '🔴 ' + this.statusMessage + ' — Klik untuk periksa konfigurasi';
            }
        } else {
            // Mode Offline / Lokal Fallback
            if (textElem) textElem.textContent = 'Mode Lokal (Offline)';
            dotElem.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400';
            if (pingElem) pingElem.style.display = 'none';
            if (btnElem) {
                btnElem.className = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer';
                btnElem.title = '⚪ Mode Penyimpanan Lokal (localStorage) — Klik untuk menghubungkan Cloud Firebase';
            }
        }

        // Update badge juga pada modal jika terbuka
        const modalStatusText = document.getElementById('modal-cloud-status-desc');
        const modalStatusDot = document.getElementById('modal-cloud-status-dot');
        if (modalStatusText) modalStatusText.textContent = this.statusMessage;
        if (modalStatusDot) {
            modalStatusDot.className = 'w-3 h-3 rounded-full ' + (
                this.status === 'connected' ? 'bg-emerald-500 ring-4 ring-emerald-100' :
                this.status === 'connecting' ? 'bg-amber-500 ring-4 ring-amber-100' :
                this.status === 'error' ? 'bg-rose-500 ring-4 ring-rose-100' :
                'bg-slate-400 ring-4 ring-slate-100'
            );
        }
    },

    /**
     * Inisialisasi Firebase Realtime Database
     */
    init() {
        // Cek ketersediaan SDK Firebase di browser
        if (typeof firebase === 'undefined' || !firebase.database) {
            console.warn('[FirebaseSync] Firebase SDK belum terpasang atau belum termuat. Menjalankan mode fallback lokal.');
            this.setStatus('offline', 'Mode Offline (SDK belum siap)');
            return false;
        }

        if (!this.hasValidConfig()) {
            console.info('[FirebaseSync] Konfigurasi Firebase belum diisi. Menggunakan mode fallback lokal (localStorage).');
            this.setStatus('offline', 'Mode Offline — Data tersimpan di browser ini');
            return false;
        }

        try {
            this.setStatus('connecting', 'Sedang menghubungkan ke Firebase Cloud...');
            const config = this.getConfig();

            // Lepas listener koneksi sebelumnya jika ada
            if (this.connectedRef) {
                try { this.connectedRef.off(); } catch (e) {}
            }
            if (this.ref) {
                try { this.ref.off(); } catch (e) {}
            }

            // Inisialisasi Firebase App
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(config);
            } else {
                this.app = firebase.app();
            }

            // Arahkan ke database instance yang sesuai dengan URL aktif
            this.db = (config && config.databaseURL)
                ? firebase.database(this.app, config.databaseURL)
                : firebase.database(this.app);
            this.ref = this.db.ref(FIREBASE_DB_ROOT);

            // Timeout pengaman: jika dalam 7 detik koneksi belum berhasil, jangan biarkan stuck 'connecting'
            if (this.connectTimeout) clearTimeout(this.connectTimeout);
            this.connectTimeout = setTimeout(() => {
                if (this.status === 'connecting') {
                    this.setStatus('error', 'Koneksi ke Firebase gagal / timeout. Periksa databaseURL atau aturan Rules di Firebase Console.');
                }
            }, 7000);

            // Pantau konektivitas jaringan Firebase
            const connectedRef = this.db.ref('.info/connected');
            this.connectedRef = connectedRef;
            connectedRef.on('value', snap => {
                if (snap.val() === true) {
                    if (this.connectTimeout) clearTimeout(this.connectTimeout);
                    this.setStatus('connected', 'Cloud Realtime Terhubung & Sinkron');
                } else if (this.status === 'connected') {
                    this.setStatus('connecting', 'Koneksi cloud terputus, menyambungkan kembali...');
                }
            });

            // Pasang Real-Time Listener
            this.ref.on('value', snapshot => {
                let cloudData = snapshot.val();
                if (this.isWritingRemote) return; // Hindari loop feedback saat sedang menulis

                if (cloudData && typeof cloudData === 'object') {
                    cloudData = sanitizeFirebaseData(cloudData);
                }
                if (cloudData && typeof cloudData === 'object' && Array.isArray(cloudData.periode)) {
                    // Update cache lokal dan beritahu aplikasi
                    if (typeof Storage !== 'undefined' && Storage.saveLocalOnly) {
                        Storage.saveLocalOnly(cloudData);
                    } else {
                        localStorage.setItem('ebendahara_database_v1', JSON.stringify(cloudData));
                    }
                    this.notifyListeners(cloudData);
                } else if (!cloudData) {
                    // Jika cloud masih kosong pertama kali, unggah data lokal saat ini
                    console.info('[FirebaseSync] Cloud database masih kosong, mengunggah data seeder awal...');
                    if (typeof Storage !== 'undefined') {
                        this.pushToCloud(Storage.getData());
                    }
                }
            }, err => {
                console.error('[FirebaseSync] Realtime Listener error:', err);
                if (this.connectTimeout) clearTimeout(this.connectTimeout);
                this.setStatus('error', 'Akses ditolak atau aturan Realtime Database belum diatur (Permission Denied)');
            });

            return true;
        } catch (e) {
            console.error('[FirebaseSync] Inisialisasi gagal:', e);
            if (this.connectTimeout) clearTimeout(this.connectTimeout);
            this.setStatus('error', 'Gagal inisialisasi: ' + e.message);
            return false;
        }
    },

    /**
     * Kirim data lokal ke Firebase Realtime Database
     * @param {Object} data Objek database lengkap
     * @param {Boolean} immediate Jika true, kirim seketika tanpa debounce (misal saat beforeunload / initial sync)
     */
    pushToCloud(data, immediate = false) {
        if (!this.ref || this.status === 'offline') return;

        const writeOp = () => {
            this.isWritingRemote = true;
            this.ref.set(data)
                .then(() => {
                    this.isWritingRemote = false;
                    this.setStatus('connected', 'Data berhasil disinkronkan ke Cloud');
                })
                .catch(err => {
                    this.isWritingRemote = false;
                    console.error('[FirebaseSync] Gagal menyimpan ke cloud:', err);
                    this.setStatus('error', 'Gagal kirim ke cloud: ' + err.message);
                });
        };

        if (immediate) {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            writeOp();
            return;
        }

        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(writeOp, 300);
    },

    /**
     * Simpan konfigurasi baru dan restart koneksi
     */
    async saveConfig(configObj) {
        try {
            if (!configObj || typeof configObj !== 'object') {
                throw new Error('Objek konfigurasi tidak valid!');
            }
            // Bersihkan tanda paksa offline jika ada
            localStorage.removeItem('ebendahara_force_offline');
            localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(configObj));
            
            // Re-inisialisasi bersih
            if (this.ref) {
                try { this.ref.off(); } catch (e) {}
            }
            if (this.connectedRef) {
                try { this.connectedRef.off(); } catch (e) {}
            }
            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
            }
            if (firebase.apps && firebase.apps.length) {
                // Tunggu penghapusan instance app lama selesai
                await Promise.all(firebase.apps.map(a => a.delete().catch(() => {})));
            }
            this.app = null;
            this.db = null;
            this.ref = null;
            this.connectedRef = null;

            return this.init();
        } catch (e) {
            console.error('[FirebaseSync] Gagal menyimpan konfigurasi:', e);
            throw e;
        }
    },

    /**
     * Beralih ke Mode Offline / Reset Konfigurasi
     */
    async disconnectToOffline() {
        try {
            if (this.ref) {
                try { this.ref.off(); } catch (e) {}
            }
            if (this.connectedRef) {
                try { this.connectedRef.off(); } catch (e) {}
            }
            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
            }
            if (firebase.apps && firebase.apps.length) {
                await Promise.all(firebase.apps.map(a => a.delete().catch(() => {})));
            }
        } catch (e) {}
        this.app = null;
        this.db = null;
        this.ref = null;
        this.connectedRef = null;
        localStorage.setItem('ebendahara_force_offline', 'true');
        localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
        this.setStatus('offline', 'Mode Offline — Data tersimpan di browser ini');
    }
};

// Auto-inisialisasi saat script dimuat jika browser sudah siap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        FirebaseSync.init();
    });
} else {
    setTimeout(() => FirebaseSync.init(), 100);
}

