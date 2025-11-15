# إعداد متغيرات البيئة على Railway

## 📋 الخطوات السريعة

### 1. إنشاء مفاتيح JWT آمنة

**في Terminal:**
```bash
# JWT Secret
openssl rand -base64 32

# JWT Refresh Secret
openssl rand -base64 32
```

أو باستخدام Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. الحصول على نطاق Railway

1. اذهب إلى خدمتك على Railway
2. Settings → Networking
3. Generate Domain (إذا لم يكن موجوداً)
4. انسخ النطاق (مثل: `your-app-production.up.railway.app`)

### 3. إضافة المتغيرات على Railway

1. اذهب إلى خدمتك على Railway
2. Settings → Variables
3. أضف المتغيرات التالية:

#### متغيرات مطلوبة:

```
NODE_ENV=production
JWT_SECRET=<ضع_المفتاح_الذي_أنشأته>
JWT_REFRESH_SECRET=<ضع_المفتاح_الآخر_الذي_أنشأته>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=https://your-app-production.up.railway.app
NEXT_PUBLIC_API_URL=https://your-app-production.up.railway.app/api
MAX_FILE_SIZE=10485760
UPLOAD_DESTINATION=./uploads
THROTTLE_TTL=60
THROTTLE_LIMIT=500
```

#### متغيرات تلقائية (يضيفها Railway):

- `DATABASE_URL` - يضاف تلقائياً عند ربط PostgreSQL
- `REDIS_URL` - يضاف تلقائياً عند ربط Redis (اختياري)
- `PORT` - يضاف تلقائياً من Railway

### 4. ربط قاعدة البيانات PostgreSQL

1. في خدمتك → Settings → Variables
2. اضغط "Add Reference"
3. اختر خدمة PostgreSQL
4. سيتم إضافة `DATABASE_URL` تلقائياً

## 📝 ملاحظات مهمة

1. **JWT_SECRET و JWT_REFRESH_SECRET**: يجب أن تكونا قيمتين مختلفتين وقويتين
2. **FRONTEND_URL**: استبدل `your-app-production.up.railway.app` بنطاقك الفعلي
3. **NEXT_PUBLIC_API_URL**: يجب أن ينتهي بـ `/api`
4. **DATABASE_URL**: لا تحتاج لإضافته يدوياً، يضاف تلقائياً عند ربط PostgreSQL

## ✅ التحقق من الإعداد

بعد إضافة جميع المتغيرات:
1. أعد النشر (Redeploy)
2. تحقق من السجلات للتأكد من عدم وجود أخطاء
3. جرّب تسجيل الدخول:
   - Email: `admin`
   - Password: `admin123`

