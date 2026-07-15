# خطوات الرفع إلى GitHub و Vercel

## 0. قبل أي شيء: أعد تعيين كلمة مرور قاعدة البيانات

بيانات Neon التي استُخدمت لإعداد هذا المشروع ظهرت في محادثة الدردشة، وبالتالي
يجب اعتبارها غير سرية بعد الآن. من لوحة تحكم Neon:

**Settings → Reset password** لدور `neondb_owner`، ثم انسخ رابطي الاتصال
الجديدين (Pooled و Direct) لاستخدامهما في الخطوة 3 أدناه. لا تُدرج الرابط
القديم (الموجود في ملف `.env` المرفق) في أي مكان إنتاجي.

## 1. الرفع إلى GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

`.gitignore` المرفق يستثني `.env` و`node_modules` و`generated/prisma`
تلقائيًا - تحقق بعد أول `git add .` أن `.env` لم يظهر في `git status`؛ إن
ظهر، توقف ولا تكمل الدفع (يعني أن `.gitignore` لم يُطبَّق بشكل صحيح).

## 2. إنشاء مشروع على Vercel

1. من [vercel.com/new](https://vercel.com/new)، اختر **Import Git Repository**
   وحدد المستودع الذي رفعته للتو.
2. Framework Preset سيُكتشف تلقائيًا كـ **Next.js** - لا حاجة لتغيير شيء.
3. **لا تضغط Deploy بعد** - انتقل أولاً لإعداد متغيرات البيئة في الخطوة التالية،
   وإلا سيفشل أول بناء لعدم وجود `DATABASE_URL`.

## 3. متغيرات البيئة على Vercel

في شاشة الإعداد (أو لاحقًا من **Project Settings → Environment Variables**)،
أضف كل متغير لكل من بيئتي **Production** و **Preview** (ولـ **Development**
إن كنت تستخدم `vercel dev`):

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon الجديد (Pooled - يحتوي على `-pooler` في الاسم) بعد إعادة التعيين في الخطوة 0 |
| `DIRECT_URL` | رابط Neon الجديد (Direct - بدون `-pooler`) |
| `AUTH_SECRET` | نتيجة تنفيذ `openssl rand -base64 32` على جهازك - **لا تستخدم القيمة الموجودة في ملف `.env` المرفق**، فهي ظهرت في هذه المحادثة أيضًا |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | رابط مشروعك على Vercel، مثل `https://your-project.vercel.app` (يمكن ضبطه بعد أول نشر عندما يصبح الرابط معروفًا) |

**AUTH_URL غالبًا غير ضروري هنا**: على بيئة Vercel الإنتاجية، يكتشف Auth.js
الرابط تلقائيًا من متغيرات Vercel الداخلية. أضفه فقط إذا واجهت مشاكل في
الجلسات أو التوجيه (Redirect) بعد النشر، وعندها اجعل قيمته نفس رابط الإنتاج.

## 4. الدفع (Deploy)

اضغط **Deploy**. أثناء البناء، Vercel سينفذ:

1. `npm install` (أو `npm ci`) - يشغّل `postinstall` تلقائيًا، الذي يشغّل
   `prisma generate` وينتج الكلاينت في `generated/prisma/` (غير مرفوع لـ
   git، يُنشأ في كل بناء).
2. `npm run build` (أي `next build`).

## 5. بعد أول نشر ناجح: إنشاء الجداول

الكود جاهز، لكن قاعدة البيانات على Neon لا تزال فارغة. من جهازك المحلي
(بعد تحديث `.env` بروابط Neon الجديدة من الخطوة 0):

```bash
npx prisma db push
```

هذا ينشئ كل الجداول (`User`, `Group`, `Student`, `Attendance`,
`WeeklyMemorization`, `Settings`) مباشرة على قاعدة Neon نفسها التي يستخدمها
تطبيقك على Vercel، دون الحاجة لملفات migration منفصلة في هذه المرحلة
المبكرة.

بعدها، أنشئ حساب المدير الأول يدويًا (لا توجد بعد صفحة "تسجيل مدير جديد" -
هذا متعمّد، فالنظام يفترض أن المدير هو من يُنشئ حسابات الأساتذة، لا العكس).
أسهل طريقة الآن:

```bash
npx prisma studio
```

افتح جدول `User` وأضف صفًا يدويًا بـ `role: ADMIN`. لتوليد `hashedPassword`
الصحيح (bcrypt، وليس نصًا عاديًا)، شغّل هذا السكربت مرة واحدة محليًا:

```bash
node -e "require('bcryptjs').hash('YOUR_PASSWORD', 12).then(console.log)"
```

والصق الناتج في حقل `hashedPassword`.

## 6. تحقق نهائي

- افتح رابط الإنتاج، تأكد من ظهور صفحة تسجيل الدخول بدون خطأ 500.
- سجّل دخولك بحساب المدير الذي أنشأته للتو، وتأكد من وصولك لـ `/admin`.
- إن ظهر خطأ `UntrustedHost`، تأكد أن `AUTH_TRUST_HOST=true` مضبوط فعلاً في
  Vercel (وليس فقط في `.env` المحلي).
- إن ظهر خطأ اتصال بقاعدة البيانات (`P1010` أو مشابه)، تأكد أنك استخدمت
  الروابط **الجديدة** بعد إعادة تعيين كلمة المرور في الخطوة 0، وليس القديمة.
