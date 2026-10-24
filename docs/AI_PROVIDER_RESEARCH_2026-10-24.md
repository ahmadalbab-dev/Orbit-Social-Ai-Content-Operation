# Orbit: penyelidikan integrasi AI dan cadangan Studio/Media

Tarikh semakan: 24 Oktober 2026, Malaysia. Status: kajian dokumentasi awam dan cadangan pelaksanaan, bukan keputusan ujian integrasi baharu. Tiada akaun, pembelian, pemasangan SDK, penghantaran media pengguna atau perubahan production dibuat.

## Keputusan

Kekalkan Gemini untuk perancangan Studio/editor dan laluan Cloudflare yang sudah ada. Tambah penyedia mengikut keupayaan yang belum tersedia, selepas mengesahkan akses akaun, kos dan hak penggunaan. Jangan gabungkan tujuh penyedia serentak. AI Gateway kekal ditangguhkan oleh pemilik.

Keutamaan percuma: alat tempatan untuk crop, trim, layers, chroma key, stitching dan templates; provider hanya untuk tugasan generatif yang memerlukannya. Hosting, storage, bandwidth dan GPU tetap boleh mempunyai kos walaupun model atau SDK percuma.

## Penilaian tujuh pautan

| Penyedia | Integrasi yang disahkan melalui dokumentasi | Akses percuma dan batas | Keputusan untuk Orbit |
| --- | --- | --- | --- |
| FreeAPIHub | Direktori pautan/model, bukan endpoint penjanaan daripada halaman kategori | Label free/open source tidak membekalkan GPU atau hosted API | Gunakan untuk penemuan; semak lesen dan kos pada sumber model asal |
| Shotstack | REST Create/Edit, SDK server, Studio SDK pelayar dan CLI | 10 kredit pendaftaran, sah 30 hari; sandbox render percuma dengan watermark. AI generation dalam sandbox menggunakan baki production | Calon render/template server jika diperlukan; bukan teras AI percuma berterusan |
| InVideo | MCP rasmi Streamable HTTP, sign-in pengguna; projek, timeline dan export | Pelan web percuma terhad, reset mingguan; generasi MCP menggunakan kredit InVideo. Kuota angka dan kelayakan setiap model perlu disahkan dalam akaun | Berguna untuk aliran kerja luar Orbit; hak embed/white-label editor atau backend servis bersama belum terbukti |
| Kling | Developer platform/API rasmi; carian rasmi menyebut trial resource package | Harga, nilai trial, syarat kad dan kuota API berulang tidak dapat disahkan daripada halaman yang hanya memaparkan shell | Calon khusus video; tangguhkan pemilihan sehingga akses developer dan syarat jelas |
| Pixazo | REST, submit/poll dan webhook; image/video/audio; lesen output mengikut model | Halaman Free Tier menyatakan baki bulanan kategori; perlu pengaktifan kewangan dan caj wallet selepas baki percuma | Calon bersyarat, tidak diaktifkan di bawah keutamaan semasa tanpa kad/tambah nilai |
| Krea | REST, SDK JavaScript, MCP dan Agent API | Direct model API menggunakan baki berbayar berasingan. OAuth MCP dan Agent menggunakan compute; kelayakan pelan masih terpakai | Calon imej/upscale; Agent patut dinilai secara berasingan daripada direct API |
| Kie.ai | REST image/video/audio, task async, polling dan webhook | Mengiklankan 80 kredit untuk pengguna baharu; tiada reset percuma berkala disahkan | Calon percubaan satu penyedia untuk jurang music/video; bukan jaminan operasi percuma kekal |

## Perkara yang mudah terlepas pandang

### Pixazo

Halaman Free Tier menyatakan US$3 imej, US$15 video dan US$2 audio sebulan, reset 1 haribulan 00:00 UTC (08:00 Malaysia), tanpa rollover. Maksimum contoh: 750 imej, 33 video pendek atau 66 lagu; jumlah bergantung model dan baki kategori dikongsi. Selepas habis, penggunaan beralih ke wallet.

Sumber rasmi bercanggah: /api/free menyebut kad ATAU tambah nilai US$10 dan video akan datang; /pixazo-free-tier menyebut tambah nilai pertama dari US$10 dan LTX sudah tersedia. Harga Flux pada halaman model dan jadual Free Tier turut berbeza. Gunakan dokumentasi endpoint dan dashboard sebenar sebelum menetapkan kuota produk; jangan menjanjikan angka ini kepada pengguna Orbit.

API terms menyatakan input tidak digunakan untuk melatih model mereka sendiri kecuali API bertanda non-enterprise-ready. Ini bukan jaminan menyeluruh tentang semua subprocessor/model. Sahkan endpoint, latihan upstream, retention dan lesen output sebelum media pelanggan dihantar.

### Krea

Direct model API menggunakan baki dolar berasingan daripada compute aplikasi. Agent API ialah pengecualian yang menggunakan compute; Free plan masih mempunyai had. Ini peluang penilaian, bukan bukti kuota API generatif percuma yang boleh dikongsi seluruh pengguna Orbit. Promosi 300 kredit Agent berakhir 15 September 2026 dan sudah luput pada tarikh kajian.

Dokumentasi Agent mengatakan prompt kos/permission diluluskan secara automatik dan timeout menunggu tidak membatalkan tugasan. Oleh itu, jangan serahkan orkestrasi Orbit tanpa had kepada Agent. Kawalan prompt sahaja tidak mencukupi sebagai had belanja. Sahkan API enablement, entitlement dan had keras terlebih dahulu.

### Shotstack

Studio SDK boleh dipasang dalam Next.js, mempunyai canvas, timeline dan Undo/Redo. Lesen yang diumumkan ialah PolyForm Shield, bukan MIT/Apache. Oleh sebab Orbit juga mempunyai editor, semak skop noncompete sebelum mengambil SDK. Gunakan corak UX sebagai rujukan tanpa menyalin kod berlesen yang belum disahkan sesuai.

### Kie.ai

Dokumentasi menetapkan fail hasil disimpan 14 hari dan log 2 bulan. Respons HTTP 200 boleh mengandungi kod error; task diterima belum bermakna selesai. HMAC webhook menandatangani taskId dan timestamp, bukan seluruh body: sahkan signature, usia timestamp dan ownership, kemudian ambil hasil berautoriti melalui API task. Lesen komersial music/upstream dan syarat pemprosesan data belum disahkan bagi model pilihan.

## Pembahagian tugas yang dicadangkan

| Kategori | Pelaksanaan asas Orbit | Tambahan yang dinilai |
| --- | --- | --- |
| Studio | Gemini: idea, skrip, caption dan cadangan suntingan berstruktur | Storyboard dengan scene yang boleh disunting; aset dijana hanya selepas pilihan pengguna |
| Image Tools | Canvas/layers/crop/teks dan Cloudflare pixel editing sedia ada | Background removal, inpaint dan upscale: nilai satu endpoint khusus; hasil bitmap kekal boleh di-Undo |
| Audio & Music | Upload milik pengguna, starter CC0 dan Openverse apabila pulih | Satu penyedia generasi instrumental/TTS; asingkan daripada carian katalog |
| Video Tools | Trim, crop, chroma key, stitch dan export tempatan sedia ada | Kie atau Kling untuk klip generatif pendek; Shotstack untuk render server jika justifikasi kos sesuai |
| Templates | Recipe JSON versi tertentu yang menggunakan aset pengguna dan keupayaan sebenar editor | Product reel, before/after, quote, subtitle, split-screen; tiada label trending tanpa bukti/tarikh |
| Share | Export fail; sambungan akaun dan validasi destination mengikut kemampuan sedia ada | Durable assets, job publishing dan rekonsiliasi provider sebelum direct posting |

AI music generation tidak menyelesaikan hak penggunaan lagu daripada platform streaming. Setiap aset perlu rekod asal, model, lesen, masa generasi dan atribusi jika perlu. Templates ialah struktur suntingan; nama model video tidak membekalkan sistem template boleh sunting secara automatik.

## Seni bina yang dicadangkan

1. UI menghantar intent dan asset ID ke backend yang sudah mengesahkan workspace/pemilik.
2. Capability registry memilih satu provider dibenarkan untuk tugas itu: configured, entitled, quota available, privacy compatible. Nama model tidak diputuskan bebas oleh LLM.
3. Backend menyimpan job, revision input dan tempahan kuota atomik; adapter menghantar sekali ke provider. Simpan provider task ID. Timeout selepas submit perlu rekonsiliasi, bukan submit semula secara membuta tuli.
4. Worker/polling berjadual atau webhook mengemas kini job secara idempotent. Jangan tunggu video panjang dalam satu request serverless.
5. Ambil hasil, semak jenis fail/saiz/durasi, salin ke storage persendirian Orbit dan rekod provenance. Pautan provider yang luput bukan storage projek kekal.
6. Preview dan Apply memerlukan revision masih sama; simpan hasil sebagai aset baharu dan kekalkan Undo. Publishing ialah tindakan berasingan.

Status job: queued, submitted, running, succeeded, failed, cancelled atau unknown. Unknown bermaksud provider mungkin telah menerima tugasan; jangan paparkan failed lalu mencipta salinan bercaj secara automatik.

Keperluan keselamatan: key server-only dan berasingan Preview/production; semakan ownership setiap status/download; URL muat turun dibenarkan dengan redirect/IP validation untuk mencegah SSRF; had byte/masa/pixel/durasi; sanitize log; kuota atomik per workspace dan global; tiada fallback berbayar automatik; consent jelas sebelum upload; signed URL minimum tempoh yang praktikal; pemadaman dan retention yang ditetapkan. Keputusan AI/teks metadata dianggap input tidak dipercayai. MCP diberi alat minimum dan token pengguna tidak dikongsi antara workspace.

Ini cadangan kawalan Orbit, bukan dakwaan bahawa penyedia telah lulus audit keselamatan. SOC, lokasi data, subprocessor, deletion SLA dan penggunaan latihan belum disahkan untuk keseluruhan senarai.

## Reka bentuk Studio dan Media yang dicadangkan

Cadangan ini mengambil corak produk yang didokumenkan, bukan pengesahan visual editor selepas login. Hero Ponytail yang sudah diluluskan dikekalkan.

Studio ialah aliran projek: Brief > Storyboard > Assets > Edit > Export/Share. Skrin mula menyediakan pilihan Image, Video, Carousel dan Audio, ruang prompt dengan contoh serta tujuan/platform/ratio. Selepas merancang, tunjuk senarai scene dan hasil secara bersebelahan. Setiap scene mempunyai skrip, tempoh, aset, suara dan status sendiri. Pengguna boleh menjana semula satu scene tanpa mengulangi keseluruhan projek.

Media ialah pustaka aset dan tempat sunting: cari/filter Image, Video, Audio; pilih aset lalu buka workspace editor. Editor desktop: rail kiri untuk Media/Templates/Text/Audio/AI Tools; preview besar di tengah; properties kontekstual di kanan; timeline untuk video/audio atau strip slide bagi carousel di bawah. Top bar menunjukkan nama projek, status simpan, Undo/Redo dan Export. AI panel dibuka atas permintaan dengan satu prompt, cadangan perubahan, Preview, Apply dan Undo yang jelas.

Audio mempunyai tab Library, Upload dan Generate. Setiap item memperlihatkan preview, durasi, jenis lesen dan tindakan Use. Bezakan tiada hasil, quota habis, provider gagal dan starter fallback. Jangan letak mesej teknikal panjang di tengah aliran utama.

Mobile: satu panel aktif dalam bottom sheet, preview kekal mudah dicapai, toolbar sasaran sekurang-kurangnya 44px; timeline boleh dizum, tiada tiga kolum mengecil serentak. Hormati reduced motion, keyboard, label dan kontras warna.

Share memaparkan akaun yang benar-benar connected, pilihan platform, status fail dan preview post. Simpan draft/export boleh tersedia dahulu; direct posting hanya diaktifkan selepas dispatch dan permission sebenar lulus.

## Urutan kerja dan kriteria penerimaan

| Fasa | Kerja | Bukti siap |
| --- | --- | --- |
| 1 | Model projek/scene/aset/job dan mapping state editor; audit UX semasa | Save/reload stabil; Undo/stale-plan protection kekal; tiada provider diperlukan |
| 2 | Workspace Studio/Media baharu menggunakan enjin sedia ada | Desktop/mobile, keyboard, import/edit/export fail sebenar dan tiada kehilangan draft |
| 3 | Satu percubaan provider pada synthetic public input | Quota/account entitlement jelas, output sebenar boleh decode/play, kos direkod, tiada paid fallback |
| 4 | Durable storage dan job lifecycle | Ownership, duplicate submit, timeout, webhook replay, reconnect dan fail expired diuji |
| 5 | Templates yang menggunakan enjin sebenar dan music workflow | Aset kekal boleh sunting; audio boleh didengar dalam fail export |
| 6 | Share dan social acceptance | Destination disahkan, immutable revision, consent/callback/publish/reconciliation lulus mengikut platform |

Tidak perlu ulang ujian provider yang sudah lulus tanpa perubahan berkaitan. Ujian baru perlu menumpu sempadan yang berubah. Tiada tarikh siap dijanjikan sebelum akses akaun dan batas provider dikenal pasti.

## Sumber utama

- https://freeapihub.com/categories/video-generation
- https://shotstack.io/product/create-api/
- https://shotstack.io/pricing/
- https://shotstack.io/docs/guide/generating-assets/ai-generation-pricing/
- https://shotstack.io/docs/guide/studio-sdk/
- https://help.shotstack.io/en/articles/16948369-using-shotstack-in-a-commercial-product-licensing-white-labelling-and-data-handling
- https://invideo.io/make/ai-video-generator/
- https://help.invideo.io/en/articles/9380226-can-i-use-invideo-ai-for-free
- https://help.invideo.io/en/articles/11316042-connect-your-ai-agent-to-invideo-mcp-server
- https://help.invideo.io/en/articles/17337187-how-do-i-generate-images-videos-and-audio-with-invideo-mcp
- https://kling.ai/dev
- https://kling.ai/document-api/guides/get-started/quick-start
- https://www.pixazo.ai/models
- https://www.pixazo.ai/api/free
- https://www.pixazo.ai/pixazo-free-tier
- https://www.pixazo.ai/api-terms-of-use
- https://www.krea.ai/features/api
- https://www.krea.ai/docs/developers/api-keys-and-billing
- https://www.krea.ai/docs/developers/agent
- https://www.krea.ai/docs/user-guide/agent/plans-and-credits
- https://www.krea.ai/privacy
- https://kie.ai/market
- https://kie.ai/
- https://docs.kie.ai/getting-started
- https://docs.kie.ai/common-api/webhook-verification
- https://kie.ai/market/text-to-music

## Kaitannya dengan kod semasa

Semakan tempatan pada commit 6188bf1: packages/ai/src/editor-planner.ts mengembalikan pelan JSON yang divalidasi dan membezakan perancangan daripada penjanaan pixels/audio/footage. apps/web/app/orbit/editor-workspace.tsx menggunakan editor image/video berasingan. Kekalkan validator dan enjin ini di belakang UI baharu; jangan ganti keseluruhan projek dengan SDK pihak ketiga sebelum lesen dan migration state disahkan.

Dokumen ini belum mengaktifkan integrasi dan tidak mengubah status penerimaan live Music/OAuth/Share yang masih tertangguh.
