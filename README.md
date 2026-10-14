# Hub Pembelajaran Muzik Komputer

Aplikasi web ringkas untuk murid menonton siri video Muzik Komputer dan menjawab kuiz. Video dimainkan dari pautan YouTube atau Google Drive, markah disimpan di Firebase Firestore (percuma, pelan Spark, tanpa kad), dan admin boleh memasukkan pautan video serta menyemak markah murid.

Aplikasi ini ialah laman statik (HTML, CSS dan JavaScript sahaja). Tiada proses *build*, jadi ia boleh terus di-*deploy* ke Vercel.

## Ciri-ciri

**Untuk murid**
- Daftar dengan nama dan kelas (disimpan dalam pelayar).
- Senarai 6 modul MK01 hingga MK06, berserta status kemajuan setiap modul.
- Kuiz dibuka selepas murid menonton sekurang-kurangnya 85% video. Bahagian yang dilangkau tidak dikira.
- Setiap kuiz ada 5 soalan aneka pilihan, dan susunan pilihan jawapan berubah pada setiap percubaan.
- Selepas kuiz, murid melihat markah, gred dan semakan jawapan beserta penerangan. Murid boleh cuba semula.
- Halaman **Markah Saya** memaparkan markah terbaik dan sejarah percubaan.

**Untuk admin**
- Log masuk dengan kata laluan.
- Tampal pautan YouTube atau Google Drive bagi setiap modul. Aplikasi mengenal pasti jenis pautan secara automatik.
- YouTube (disyorkan): tontonan sebenar dijejak untuk syarat 85%. Google Drive: kemajuan dikira berdasarkan masa di halaman video.
- Semak markah murid: tapis mengikut nama, kelas atau modul, dan pilih untuk melihat markah terbaik sahaja.
- Ringkasan markah: jumlah percubaan, bilangan murid, purata markah dan peratus murid yang mencapai 60% ke atas.
- Muat turun markah dalam fail CSV (boleh dibuka dalam Excel), dan padam rekod.

## Struktur fail

```
index.html          Halaman utama
css/style.css       Reka bentuk
js/config.js        TETAPAN: konfigurasi Firebase, e-mel admin, subjek
js/data.js          Senarai modul dan bank soalan kuiz (boleh diedit)
js/backend.js       Sambungan Firebase / Mod Demo
js/app.js           Logik aplikasi
firestore.rules     Peraturan keselamatan Firestore
vercel.json         Tetapan Vercel (membenarkan aplikasi dibenam dalam aplikasi lain)
```

## Mod Demo

Selagi `firebaseConfig.apiKey` dalam `js/config.js` masih kosong, aplikasi berjalan dalam **Mod Demo**. Dalam mod ini, video dan markah disimpan dalam pelayar anda sahaja. Mod ini sesuai untuk mencuba aplikasi sebelum Firebase disambungkan. Kata laluan admin dalam Mod Demo ialah `dzurrihensem`.

---

## Langkah sambungan Firebase

### 1. Cipta projek Firebase
1. Pergi ke https://console.firebase.google.com dan klik **Add project**.
2. Berikan nama projek, contohnya `hub-muzik-t4`. Google Analytics tidak diperlukan.

### 2. Daftar aplikasi web dan salin konfigurasi
1. Pergi ke **Project settings** (ikon gear), kemudian **General**.
2. Di bahagian **Your apps**, klik ikon **Web** `</>` dan daftar aplikasi. Firebase Hosting tidak diperlukan.
3. Salin objek `firebaseConfig` ke dalam `js/config.js`, menggantikan nilai yang kosong.

### 3. Cipta akaun admin (Authentication)
1. Pergi ke **Build > Authentication > Get started**.
2. Di tab **Sign-in method**, aktifkan **Email/Password**.
3. Di tab **Users**, klik **Add user**:
   - Email: `admin@hubmuzik.my` (mesti sama dengan `ADMIN_EMAIL` dalam `js/config.js`)
   - Password: `dzurrihensem`

Kata laluan ini disemak oleh Firebase dan **tidak disimpan dalam kod aplikasi**. Untuk menukarnya kemudian, pergi ke Authentication > Users > (titik tiga) > Reset password, atau padam pengguna itu dan cipta semula.

### 4. Firestore Database (senarai video dan markah)
1. Pergi ke **Build > Firestore Database > Create database**, dan pilih lokasi `asia-southeast1` (Singapura).
2. Pilih **Production mode**.
3. Di tab **Rules**, padam semua kandungan, tampal isi fail `firestore.rules`, kemudian klik **Publish**.

### 5. Video (tiada Firebase Storage diperlukan)
Video tidak disimpan di Firebase. Muat naik video ke **YouTube** (Keterlihatan: *Tidak tersenarai*) atau **Google Drive** (Kongsi: *Sesiapa sahaja yang ada pautan*), kemudian tampal pautannya di panel Admin. Pelan Blaze **tidak** diperlukan.

> Jika anda menukar `ADMIN_EMAIL`, tukar juga e-mel yang sama di dalam `firestore.rules`.

## Deploy ke Vercel

**Cara A: melalui GitHub (disyorkan)**
1. Cipta repositori baharu di GitHub dan muat naik semua fail dalam folder ini.
2. Pergi ke https://vercel.com/new, klik **Import**, dan pilih repositori tersebut.
3. Untuk Framework Preset, pilih **Other**. Biarkan Build Command kosong, kemudian klik **Deploy**.

**Cara B: melalui Terminal**
```
npm i -g vercel
cd HubMuzikKomputer
vercel --prod
```

Selepas deploy, Vercel memberikan pautan seperti `https://hub-muzik-komputer.vercel.app`.

1. Buka pautan itu, pergi ke **Admin**, log masuk dan tampal pautan video MK01 hingga MK06.
2. Masukkan pautan tersebut ke dalam aplikasi **Dzurri Playverse**. Fail `vercel.json` membenarkan aplikasi ini dibenam (*iframe*) dalam aplikasi lain.

## Membina hub kedua (Aural dan Teori Muzik)
1. Salin keseluruhan folder ini.
2. Dalam `js/config.js`, tukar `SUBJECT = 'MK'` kepada `SUBJECT = 'AT'`.
3. Deploy sebagai projek Vercel yang berasingan.

Hub kedua boleh menggunakan projek Firebase yang sama, kerana data setiap hub disimpan berasingan (`hubs/MK/...` dan `hubs/AT/...`). Soalan kuiz untuk AT01 hingga AT10 sudah tersedia dalam `js/data.js`.

## Mengedit soalan kuiz
Buka `js/data.js`. Setiap soalan mempunyai medan berikut:
- `q`: soalan
- `o`: empat pilihan jawapan
- `a`: nombor jawapan betul (0 = pilihan pertama, 1 = kedua, dan seterusnya)
- `e`: penerangan yang dipaparkan semasa semakan jawapan

## Nota
- YouTube paling lancar di telefon. Google Drive mungkin menyekat sementara jika terlalu ramai menonton serentak.
- Murid tidak perlu log masuk. Markah direkod mengikut nama dan kelas yang mereka masukkan, jadi ingatkan murid supaya menulis nama penuh dengan betul.
- Kemajuan tontonan murid disimpan dalam pelayar peranti masing-masing.
