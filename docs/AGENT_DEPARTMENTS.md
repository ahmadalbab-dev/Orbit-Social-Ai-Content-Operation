# Jabatan dan agent Orbit

Susunan ini memudahkan Albab mengenal pasti pemilik tugas dan hasil kerja. Nama di bawah ialah peranan agent AI untuk sesi pembangunan ini. Ia bukan pekerja tetap, daemon latar belakang atau pemasangan HERMES. Tiada pemantauan 24 jam diaktifkan melalui senarai ini.

Status tugas dan bukti pengesahan dirujuk dalam [TASKS.md](TASKS.md). Tugas yang sedang dibina hanya ditanda siap selepas hasilnya disemak dan ujian berkaitan lulus. Kod siap tidak bermaksud telah digunakan pada app live.

| Jabatan | Agent / identiti sesi | Tanggungjawab dan sempadan | Tugasan semasa / hasil yang perlu diserahkan | Bukti yang perlu direkod |
| --- | --- | --- | --- | --- |
| Pengurusan dan penyelarasan | **Matt** (`/root`) | Tetapkan skop, selaraskan perubahan, integrasikan kod dan semak keputusan akhir | Gabungkan kerja jabatan dalam repo Orbit yang sama dan kemas kini PR | Commit/PR, hasil CI, batas fungsi dan keputusan deployment |
| Kewangan dan billing | **ORBIT-FIN** (`/root/orbit_fin`) | Integrasi Stripe pada backend; rahsia kekal di server; kawalan akses mengikut workspace | Checkout dan customer portal dalam MDTech sandbox, webhook bertandatangan serta status subscription | Ujian akses, tandatangan, event berulang dan lifecycle; keputusan sandbox apabila tersedia |
| Operasi dan infrastruktur | **ORBIT-OPS** (`/root/orbit_ops`) | Nilai hosting, storage dan kesesuaian worker; bezakan perlindungan rangkaian dengan keselamatan aplikasi | Perbandingan Cloudflare/Firebase berasaskan dokumentasi rasmi dan cadangan deployment Orbit | Pautan sumber rasmi, batas runtime, keperluan konfigurasi dan baki setup |
| Pembangunan produk | **ORBIT-DEV** (`/root/orbit_dev`) | UI billing yang mengikut design web/mobile; paparkan status daripada server | Sambungan checkout/portal dan keadaan loading/error yang jelas | Ujian UI/API, type check dan build |
| Pentadbiran dan dokumentasi | **ORBIT-ADM** (`/root/orbit_adm`) | Jaga pemilik tugas, tracker dan bukti; elakkan status siap tanpa pengesahan | Dokumen jabatan ini dan kemas kini skop B01–B03 | Dokumen dalam repo; semakan akhir oleh Matt |
| Kualiti dan sekuriti | **ORBIT-QA** (`/root/orbit_qa`) | Review bebas terhadap kod baharu, kesederhanaan modul dan risiko keselamatan | Semak perubahan billing dan hosting; laporkan isu dengan fail, kesan dan cadangan pembaikan | Penemuan review, ujian berkaitan dan keputusan semakan semula selepas pembaikan |
| Pengembangan perniagaan | **ORBIT-BIZ** (`/root/orbit_biz`) | Susun pakej, had penggunaan dan syarat pelancaran; harga belum diputuskan | Cadangan struktur produk dan kriteria siap untuk percubaan berbayar | Andaian kos, keputusan yang masih perlu dibuat dan checklist penerimaan |

## Aliran kerja

1. Matt beri setiap agent skop dan fail yang dimiliki supaya perubahan tidak bertindih.
2. Agent membina atau menyelidik bahagian tersebut, kemudian menyerahkan hasil dan batasnya.
3. ORBIT-QA membuat review bebas. Pembina membaiki isu yang disahkan.
4. Ujian yang sesuai dijalankan. Kegagalan dan ujian yang belum dibuat direkod dengan jelas.
5. Matt mengintegrasikan perubahan, menyemak keputusan dan mengemas kini PR serta tracker.
6. Albab menyemak hasil. Deployment, pengaktifan bayaran live dan penerbitan sosial ialah langkah berasingan daripada kod atau ujian sandbox.

## Keputusan semasa

- Stripe digunakan untuk pembayaran Orbit. Integrasi semasa menggunakan **MDTech sandbox**.
- Harga, produk/price Stripe dan pengaktifan bayaran live belum diputuskan. Integrasi ujian tidak memberi kuasa kepada agent untuk mengenakan caj sebenar.
- Cloudflare ialah calon hosting yang sedang dinilai. Infrastruktur, domain dan DNS belum dianggap tersedia sehingga konfigurasi serta pengesahan sebenar dibuat.
- Modul kecil mengikut tanggungjawab diutamakan. Tambah perkhidmatan atau abstraksi baharu hanya apabila ada keperluan yang jelas.
