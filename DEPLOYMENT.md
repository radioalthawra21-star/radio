# دليل النشر المجاني

## الخدمات المجانية

| الخدمة | الاستخدام |
|--------|-----------|
| **Frontend** | Netlify أو Vercel |
| **Backend** | Render.com |
| **Database** | MongoDB Atlas |

---

## المرحلة 1: MongoDB Atlas

1. اذهب إلى [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ حساب جديد
3. اختر **Free Tier** (M0)
4. اختار region: `eu-central-1`
5. أنشئ username وكلمة مرور
6. **Network Access** → أضف IP: `0.0.0.0/0`
7. **Database** → **Connect** → **Connect your application**
8. انسخ URI:
```
mongodb+srv://username:password@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## المرحلة 2: Backend على Render

1. اذهب إلى [https://render.com](https://render.com)
2. أنشئ **Web Service**
3. وصّل GitHub repo
4. املأ:
   - Name: `employee-task-backend`
   - Env: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: `Free`

5. أضف Environment Variables:
```
MONGO_URI: mongodb+srv://username:password@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority
PORT: 3000
```

6. انسخ الرابط: `https://employee-task-backend.onrender.com`

---

## المرحلة 3: Frontend على Netlify

1. حرر `frontend/src/services/api.js`:
```javascript
baseURL: 'https://employee-task-backend.onrender.com/api'
```

2. ابن المشروع:
```bash
cd frontend
npm run build
```

3. ارفع مجلد `dist` على Netlify

---

## ملاحظات
-Render المجاني: بعد 15 دقيقة عدم نشاط، أول طلب يستغرق ~30 ثانية
- قد تحتاج VPN