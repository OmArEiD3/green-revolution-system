# نظام إدارة الثورة الخضراء (Green Revolution Management System)

نظام لإدارة الاشتراكات والمدفوعات والمصروفات لمنطقة/جمعية سكنية، يتكوّن من:
- **Backend**: Django + Django REST Framework (`/backend`)
- **Frontend**: React + TypeScript + Vite + Tailwind (`/frontend`)

---

## 1. متطلبات التشغيل

- Python 3.11+
- Node.js 18+ و npm
- (اختياري) نظام قاعدة بيانات خارجي — المشروع يستخدم SQLite افتراضياً ويعمل بدون أي إعداد إضافي

---

## 2. تشغيل الـ Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # على Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env          # ثم عدّل القيم داخل .env حسب الحاجة (راجع القسم 4)

python manage.py migrate
python manage.py createsuperuser   # لإنشاء أول حساب دخول حقيقي

python manage.py runserver
```

السيرفر يعمل افتراضياً على `http://127.0.0.1:8000`.

### بيانات تجريبية (اختياري، للتطوير فقط)
لتعبئة قاعدة البيانات ببيانات وهمية للتجربة:
```bash
python manage.py seed_data
```
سيظهر لك اسم مستخدم وكلمة سر عشوائية على الشاشة — احتفظ بها. **لا تشغّل هذا الأمر على قاعدة بيانات حقيقية تحتوي على بيانات عملاء فعليين.**

---

## 3. تشغيل الـ Frontend

```bash
cd frontend
npm install
npm run dev
```

الواجهة تعمل افتراضياً على `http://localhost:5173` وتتصل تلقائياً بالـ backend على المنفذ 8000 (عبر إعداد الـ proxy في `vite.config.ts`).

للبناء الجاهز للنشر:
```bash
npm run build
```
الناتج يكون في `frontend/dist`.

---

## 4. إعدادات البيئة (`backend/.env`)

| المتغير | الوصف | مثال (تطوير) |
|---|---|---|
| `DJANGO_DEBUG` | تفعيل وضع التطوير (اتركه `false` في الإنتاج) | `true` |
| `DJANGO_SECRET_KEY` | مفتاح سري خاص بالمشروع — **غيّره في الإنتاج** | نص عشوائي طويل |
| `DJANGO_ALLOWED_HOSTS` | النطاقات المسموح لها بخدمة الطلبات | `localhost,127.0.0.1` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | نطاقات الواجهة الأمامية المسموح لها بالاتصال بالـ API | `http://localhost:5173` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | نفس النطاقات أعلاه (مطلوبة لحماية CSRF) | `http://localhost:5173` |
| `DJANGO_USE_HTTPS` | فعّله فقط بعد تركيب شهادة SSL/HTTPS فعلياً على السيرفر | `false` |

لتوليد `SECRET_KEY` قوي للإنتاج:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## 5. ملاحظات هامة قبل النشر الفعلي (Production)

1. **لا تستخدم** `python manage.py runserver` في الإنتاج — استخدم `gunicorn` أو `uwsgi` خلف Nginx.
2. تأكد من ضبط `DJANGO_DEBUG=false` و`DJANGO_ALLOWED_HOSTS` و`DJANGO_SECRET_KEY` بقيم حقيقية.
3. لا يتم رفع ملف `db.sqlite3` أو `.env` إلى git (موجودان في `.gitignore`) — كل بيئة (تطوير/إنتاج) لها قاعدة بياناتها الخاصة.
4. بعد تفعيل HTTPS فعلياً، فعّل `DJANGO_USE_HTTPS=true` حتى تُحمى الجلسات (cookies) بشكل كامل.
5. لوحة إدارة Django متاحة على `/admin/` — أنشئ حساب مدير عبر `createsuperuser` لاستخدامها.

---

## 6. تشغيل الاختبارات

```bash
cd backend
source venv/bin/activate
python manage.py test
```
