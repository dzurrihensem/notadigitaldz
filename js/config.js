// ===================================================================
//  TETAPAN HUB  —  ubah fail ini sahaja
// ===================================================================

// Subjek hub ini: 'MK' = Muzik Komputer, 'AT' = Aural dan Teori Muzik.
// Untuk membina hub kedua, salin projek ini dan tukar kepada 'AT'.
export const SUBJECT = 'MK';

// E-mel akaun admin yang anda cipta dalam Firebase Authentication.
// Kata laluan akaun itu ialah kata laluan yang admin taip di skrin Admin.
// (Rujuk README.md, Langkah 3.)
export const ADMIN_EMAIL = 'admin@hubmuzik.my';

// Konfigurasi Firebase: salin dari Firebase Console > Project settings >
// General > Your apps > Web app > SDK setup and configuration > Config.
// Selagi apiKey kosong, aplikasi berjalan dalam MOD DEMO (data disimpan
// dalam pelayar ini sahaja) supaya anda boleh mencuba dahulu.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Peratus video yang mesti ditonton sebelum kuiz dibuka.
export const WATCH_REQUIRED = 0.85;
