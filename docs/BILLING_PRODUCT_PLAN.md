# Pelan produk dan subscription Orbit

Pemilik: **ORBIT-BIZ**, Jabatan Pengembangan Perniagaan. Matt menyelaras keputusan akhir bersama Albab. Dokumen ini ialah cadangan produk untuk diuji, bukan harga jualan yang telah disahkan.

## Apa yang boleh ditawarkan sekarang

Kod yang tersedia merangkumi workspace berasingan, draf dan versi, kelulusan, rekod jadual, Brand Memory, AI penulisan melalui Hugging Face, editor imej asas dan aliran upload/render/download MP4. Semakan melalui telefon, konfigurasi provider dan operasi staging masih perlu dilengkapkan. Rujuk [TASKS.md](TASKS.md) untuk bukti dan status semasa.

Posting automatik, analytics platform sebenar, AI image generation/inpainting, transcription dan voiceover belum tersedia sebagai fungsi komersial lengkap. Jangan letakkan fungsi tersebut sebagai manfaat aktif dalam checkout atau halaman jualan. Jadual tersimpan belum menghantar posting secara automatik. OAuth dalam preview peribadi masih berasingan daripada backend komersial.

Stripe sedang disepadukan dalam **MDTech sandbox**. Tiada produk atau Price Stripe dicipta melalui pelan ini. Harga, mata wang, tempoh caj dan pengaktifan live belum diputuskan. Jangan membuka checkout berbayar sebenar sehingga produk yang dijual, hadnya dan syaratnya disahkan.

## Struktur pakej untuk dinilai

Nama Creator dan Business di bawah ialah **pakej billing**, bukan jenis profil Orbit atau jenis akaun sosial. Pengguna tidak perlu memilih Creator/Business dalam Profile. Jenis akaun sosial datang daripada sambungan OAuth dan maklumat platform; pilihan pakej tidak mengubahnya.

| Cadangan pakej | Kegunaan | Skop cadangan | Belum diputuskan |
| --- | --- | --- | --- |
| Creator | Individu mengurus kandungan sendiri | AI penulisan, Brand Memory, draf/kelulusan, image editor dan render MP4 yang benar-benar tersedia | Harga, bilangan workspace/channel, allowance AI, render dan storage |
| Business | Pasukan dan pelanggan perniagaan | Fungsi Creator dengan allowance lebih tinggi; akses pasukan apabila invitation dan peranan telah diuji | Harga, bilangan ahli/brand, allowance, sokongan dan masa respons |

Mulakan dengan satu pakej percubaan yang skopnya jelas jika fungsi pasukan belum siap. Jangan menjual perbezaan pakej yang backend belum boleh menguatkuasakan. Jangan menganggap pakej bernama Business memerlukan akaun Instagram Business; kesesuaian sambungan tetap mengikut syarat platform dan jenis akaun OAuth.

## Asingkan subscription daripada penggunaan

- **Subscription tetap:** hak menggunakan ciri yang dinyatakan sepanjang tempoh berbayar, selepas server mengesahkan status pembayaran.
- **Allowance AI:** bilangan percubaan yang dikira oleh server dalam tempoh yang diterangkan. Kod semasa mempunyai kuota percubaan AI; nilai konfigurasi belum menjadi janji komersial. Percubaan yang sudah dihantar kepada provider boleh menggunakan kos walaupun gagal.
- **Allowance render:** ukur tempoh video output, resolusi dan masa compute, bukan bilangan klik semata-mata. Penguatkuasaan allowance pakej render masih perlu dibina dan diuji.
- **Storage:** had kapasiti, saiz fail, tempoh simpanan dan cara pemadaman perlu dinyatakan. Private shared volume staging belum sama dengan storage produksi.
- **Apabila had habis:** cadangan awal ialah hentikan job baharu dengan mesej jelas, bukan caj lebihan automatik. Top-up dan lebihan penggunaan belum diaktifkan atau dipersetujui.

Had penggunaan perlu dibaca daripada pelan yang disahkan server. Jangan mempercayai status pakej daripada browser atau halaman checkout berjaya. Signature webhook, pengendalian event berulang, pemilikan workspace dan status subscription ialah asas pengesahan billing. Semakan implementation dan ujian penerimaan masih menentukan apa yang benar-benar siap.

## Ukur kos sebelum menetapkan harga

| Ukuran | Data yang perlu direkod | Tujuan keputusan |
| --- | --- | --- |
| AI penulisan | Percubaan/cache hit, model/provider, token jika tersedia, latency, kegagalan dan invois provider | Kos sebenar bagi penggunaan biasa dan berat |
| Video | Minit input/output, resolusi, CPU/memori, masa worker dan job gagal | Had render yang mampu ditanggung |
| Storage/rangkaian | GB disimpan, umur aset, upload/download dan egress | Kos retention dan kekerapan export |
| Hosting/database | Caj sebenar, kapasiti idle, backup, log dan pemantauan | Kos asas berbanding kos bertambah setiap pelanggan |
| Pembayaran/sokongan | Caj Stripe sebenar, refund/dispute dan masa sokongan | Margin selepas kos operasi, bukan hasil kasar |

Anggaran sumbangan pelanggan bagi satu tempoh = hasil subscription yang diterima tolak kos AI, render, storage/rangkaian, pembayaran dan sokongan yang berkaitan. Kos tetap hosting turut perlu ditampung apabila menentukan jumlah pelanggan yang diperlukan. Tiada unjuran hasil atau margin telah disahkan. Nilai kos Hugging Face dalam ledger semasa belum membuktikan kos sifar; padankan penggunaan dengan bil provider sebelum menetapkan harga.

Jalankan percubaan penggunaan ringan, biasa dan berat dengan kandungan Bahasa Melayu/English serta telefon. Rekod kos dan kadar siap sebenar. Pilih allowance daripada ukuran tersebut, kemudian uji bahawa had tidak boleh dilangkau melalui permintaan serentak atau pertukaran workspace.

## Polisi yang memerlukan keputusan pemilik

| Perkara | Cadangan untuk dipertimbangkan | Bukti sebelum diaktifkan |
| --- | --- | --- |
| Pembatalan | Pembatalan pada akhir tempoh berbayar melalui customer portal; tunjuk tarikh akses tamat | Ujian portal, webhook dan hak akses pada tarikh tamat |
| Bayaran gagal | Papar status dan pautan kemas kini pembayaran; tentukan tempoh budi bicara dan ciri yang disekat | Ujian invoice gagal, retry, pemulihan dan status subscription |
| Refund/dispute | Polisi jelas, saluran sokongan dan semakan manusia | Keputusan Albab, terma yang sepadan dan aliran sandbox |
| Downgrade | Jelaskan kesan kepada ahli, storage dan job yang masih berjalan sebelum perubahan | Ujian perubahan pelan dan pengendalian data melebihi had |
| Pemadaman data | Tetapkan retention selepas pembatalan dan beri jalan export/padam | Ujian pemadaman aset, database dan polisi backup |

Cadangan di atas belum menjadi konfigurasi Stripe atau polisi aktif. Customer portal tidak bermaksud semua perubahan subscription dibenarkan secara automatik. Albab perlu memilih tindakan yang dibuka kepada pelanggan. Keperluan cukai, pendaftaran dan invois perlu disemak mengikut keadaan perniagaan sebelum live; dokumen ini tidak menentukan kewajipan cukai dan tidak mengaktifkan Stripe Tax atau pendaftaran cukai.

## Syarat percubaan berbayar

- [ ] Skop pakej, allowance, harga/mata wang, polisi pembatalan/refund dan sokongan diluluskan Albab.
- [ ] Staging boleh digunakan melalui Safari telefon: daftar/log masuk, recovery, sunting, simpan, render dan download.
- [ ] AI sebenar diuji dengan credential server; kos provider dipadankan dengan penggunaan.
- [ ] Storage produksi, scanning/retention, backup dan restore diuji; akses silang workspace ditolak.
- [ ] Checkout, portal, webhook bertandatangan, event berulang/tertangguh, bayaran gagal, pembatalan dan pemulihan lulus ujian sandbox.
- [ ] Subscription dan quota dikuatkuasakan di server; halaman berjaya tidak membuka hak akses sendiri.
- [ ] Halaman jualan dan terma hanya menjanjikan fungsi yang tersedia. Tiada jaminan viral, views atau hasil perniagaan.
- [ ] Persetujuan live deployment dan live payments direkod selepas hasil ujian boleh disemak.

Senarai ini ialah syarat penerimaan. Kotak kosong tidak bermaksud ujian telah gagal, tetapi bukti lengkap belum direkod di sini. Jangan menganggap semua fungsi komersial telah siap kerana CI lulus.

## Tanggungjawab jabatan

| Jabatan / agent | Hasil kerja |
| --- | --- |
| Pengurusan / Matt | Putuskan keutamaan bersama Albab, semak bukti dan keluarkan skop release yang tepat |
| Perniagaan / ORBIT-BIZ | Pakej dan allowance, ukuran kos, feedback percubaan dan ketepatan penerangan manfaat |
| Kewangan / ORBIT-FIN | Stripe sandbox, rekonsiliasi subscription/invois, event billing dan polisi yang telah diluluskan |
| Operasi / ORBIT-OPS | Hosting, storage, worker, backup dan ukuran kos infrastruktur |
| Pembangunan / ORBIT-DEV | UI/API yang mudah diolah, status billing yang jelas dan penguatkuasaan server |
| Pentadbiran / ORBIT-ADM | Tracker, pemilik keputusan, rekod polisi dan bukti penerimaan |
| Kualiti/sekuriti / ORBIT-QA | Review bebas, ujian akses, webhook, quota dan kegagalan operasi |

Peranan ini ialah pembahagian tugas agent dalam sesi pembangunan, bukan jabatan manusia atau operasi automatik 24 jam. Rujuk [AGENT_DEPARTMENTS.md](AGENT_DEPARTMENTS.md) untuk identiti sesi.

## Tiga keputusan seterusnya, mengikut keutamaan

1. **Skop percubaan pertama:** pilih individu dahulu atau pasukan. Cadangan kerja awal ialah individu dengan fungsi yang benar-benar diuji; invitation pasukan kekal di roadmap sehingga siap.
2. **Allowance dan harga:** ukur AI/render/storage di staging dahulu, kemudian Albab memilih allowance, harga, mata wang dan kitaran caj. Jangan cipta Price live sebelum keputusan ini.
3. **Polisi lifecycle dan release:** Albab memilih pembatalan, tempoh bayaran gagal, refund dan retention; selepas ujian sandbox dan telefon lulus, semak pakej untuk kelulusan live.
