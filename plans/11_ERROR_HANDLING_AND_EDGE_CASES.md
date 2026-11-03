# 11_ERROR_HANDLING_AND_EDGE_CASES.md
**Project Name:** CarVision — AI Automotive Ecosystem  
**Document Type:** Edge Cases, Fallbacks & Error Handling Protocols  
**Version:** 3.0.0 (Production Blueprint)  

---

## 1. KUTILMAGAN HOLATLAR (EDGE CASES) VA ULARNING YECHIMI

Dastur real hayotda ishlatilganda, ustaxonadagi internet, mijozning xatosi yoki AI serverlaridagi uzilishlar paytida qotib qolmasligi uchun quyidagi protokollar ishlaydi:

### 1.1. AI (Fal.ai) Serveri javob bermasa yoki 10 soniyadan ortiq kechiksa
* **Muammo:** Ustaning interneti yomonligi yoki API qulashi sababli rasm aylanib qotib qoladi, limit yechilib ketadi.
* **Yechim (Atomic Rollback):** Tizim maksimal 12 soniya kutadi. Agar natija kelmasa, `PENDING` holatdagi tranzaksiya bekor qilinadi, yechilgan kredit ustaning balansiga **avtomatik qaytariladi (Refund)**. Ekranda qizil xato emas, balki silliq xabar chiqadi: *"Aloqa biroz sekin. Kredit qisqartirilmadi, iltimos qayta urinib ko'ring."*

### 1.2. Mijoz mashinani emas, odamni yoki devorni rasmga olsa
* **Muammo:** AI "Aqlli Kamera" orqali devor rasmiga diska qo'yishga urinib xato berishi mumkin.
* **Yechim (Pre-validation):** Rasm olingan zahoti YOLOv8 (AI Vision) rasmda avtomobil (Object: `car`, `truck`) borligini tekshiradi. Agar topilmasa, rasm serverga jo'natilmasdan oldin telefonda bloklanadi: *"Kadrda avtomobil topilmadi. Iltimos, mashinani to'liq ramkaga tushiring."*

### 1.3. 3% Zakalat (Deposit) uchun qalbaki yoki boshqa chek yuklansa
* **Muammo:** B2C mijoz ataylab 10 ming so'mlik chek yoki fotoshop qilingan rasm yukladi.
* **Yechim (AI OCR Check):** Dastur chekdagi sanani (oxirgi 24 soat ichidami?) va summani (`total_tuning_price * 0.03`) skaner qiladi. Agar mos kelmasa: *"Chek summasi tasdiqlanmadi, Iltimos to'g'ri chek yuklang"* deydi va manzil ochilmaydi. Shubhali bo'lsa (AI ishonch hosil qilmasa), manzil ochilmaydi va "Adminga yuborildi, 5 daqiqada tasdiqlanadi" holatiga o'tadi.

### 1.4. Offlayn Rejim (Ustaxonada Wi-Fi o'chib qolsa)
* **Muammo:** Usta rasmga olayotganda internet uzildi.
* **Yechim (PWA Offline Caching):** Service Worker orqali olingan rasmlar va joriy tyuning holati vaqtincha IndexedDB'da (telefon xotirasida) saqlanadi. Internet qayta ulanishi bilan fon rejimida serverga yuborilib, ish qolgan joyidan davom etadi.
