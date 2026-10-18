---
description: Audit and polish an existing page: screenshot at 375/1440 in light and dark, find design.md violations, fix with tokens, re-verify, run checks, suggest 3 improvements.
---

1. design.md ni o'qi.
2. Ko'rsatilgan sahifani brauzerda och, 375px va 1440px da light va dark screenshot ol.
3. Spacing, tipografiya, kontrast, hizalanish, hover/focus holatlari, hardcoded qiymatlar,
   chegaralar (border) va uz/ru uzun matnlarni tekshir. Muammolar ro'yxatini yoz.
4. Hammasini tokenlar orqali tuzat.
5. Qayta screenshot ol, oldin/keyin solishtir. Tuzatilmagan narsa qolsa, 3-qadamga qayt.
6. tsc --noEmit va build o'tkaz. Problems paneli bo'sh bo'lsin.
7. Yana 3 ta yaxshilash taklifi ber.