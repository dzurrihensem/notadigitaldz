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
  apiKey: 'AIzaSyCsy69qX2YSvQehkO5ee6wdsspy6lUyK30',
  authDomain: 'notadigitaldz.firebaseapp.com',
  projectId: 'notadigitaldz',
  storageBucket: 'notadigitaldz.firebasestorage.app',
  messagingSenderId: '512824735666',
  appId: '1:512824735666:web:23109e346de938da1116ab',
};

// Peratus video yang mesti ditonton sebelum kuiz dibuka.
export const WATCH_REQUIRED = 0.85;
