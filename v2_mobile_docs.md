# دليل المطور (Mobile Developer Documentation) - V2 Jobs System

تم تحديث نظام توزيع المهام (Jobs) ليعمل بالكامل عبر **Socket.io** بدلاً من الـ API القديم، وذلك لضمان وصول المهام في الوقت الفعلي (Real-time) وبدون تحميل على السيرفر.

## 1. الاتصال بالسيرفر (Connection)

يجب استخدام مكتبة `socket.io-client` للاتصال بالسيرفر.

- **المسار المخصص:** `/v2/socket.io`
- **المصادقة (Auth):** يمكنك تمرير הـ Firebase UID مباشرة في `auth` لتسجيل الدخول بأمان، دون الحاجة لـ JWT.
- **البيانات الإضافية (Query):** يفضل تمرير لغة/دولة المستخدم ومنصاته إن وجدت لمطابقة أفضل.

### مثال للاتصال (JavaScript/React Native):
```javascript
import { io } from "socket.io-client";

const socket = io("https://dashboard.flycompany.online", {
  path: "/v2/socket.io",
  auth: {
    uid: "FIREBASE_UID_HERE" // فقط مرر الـ UID الخاص بالمستخدم من فايربيز
  },
  query: {
    country: "egypt",   // اختياري
    platform: "all"     // اختياري
  },
  reconnectionDelay: 1000 + Math.random() * 4000, // هام جداً لمنع انهيار السيرفر
  randomizationFactor: 0.5
});

socket.on("connect", () => {
  console.log("Connected to V2 Jobs System!");
  
  // إرسال الـ Heartbeat لتسجيل المستخدم فور الاتصال
  socket.emit("register_worker", {
      uid: "FIREBASE_UID_HERE",
      country: "EG",
      facebookEnabled: true,
      instagramEnabled: true,
      platform: "android",
      appVersion: "2.0.1"
  });
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
});
```

### مثال للاتصال (Flutter / Dart):
يجب استخدام مكتبة `socket_io_client` للاتصال بشكل صحيح.
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('https://dashboard.flycompany.online', IO.OptionBuilder()
    .setTransports(['websocket']) // اجباري لفلاتر
    .setPath('/v2/socket.io')
    .setAuth({'uid': 'FIREBASE_UID_HERE'})
    .setReconnectionDelay(1000)
    .setRandomizationFactor(0.5)
    .build());

socket.onConnect((_) {
    print('Connected to V2 Jobs System!');
    
    // إرسال الـ Heartbeat لتسجيل المستخدم في النظام
    socket.emit('register_worker', {
      'uid': 'FIREBASE_UID_HERE',
      'country': 'EG',
      'facebookEnabled': true,
      'instagramEnabled': true,
      'platform': 'android',
      'appVersion': '2.0.1'
    });
});

socket.on('job_assigned', (data) {
    print('New Job Received: $data');
    // قم بإضافة الأوردر لشاشة المستخدم
});

socket.onDisconnect((_) => print('Disconnected'));
```

## 2. استلام الأوردرات الجديدة (Receiving Jobs)
السيرفر هو من يقرر إرسال الأوردر للمستخدم. لا تحتاج لعمل Pull. 
استمع لحدث `job_assigned`:

```javascript
socket.on("job_assigned", (job) => {
  /*
    job payload (نفس هيكل V1 لضمان التوافق مع fromJson الخاص بك):
    {
      jobId: "abc123xyz...",
      link: "https://instagram.com/p/...",
      linkTypeName: "InstaLike",
      type: "post",
      platform: "instagram",
      likeCount: 0,
      maxCount: 100,
      isLive: true,
      isVip: true,
      target_id: "100044528315651_1615691583258437", // لمهام فيسبوك فقط
      mediaId: "3918833827158423297",              // لمهام لايك انستجرام
      userPk: "427553890"                          // لمهام فولو انستجرام
    }
  */
  
  // قم بإضافة الأوردر لشاشة المستخدم فوراً
  displayNewJob(job);
});
```

## 3. الرد على الأوردرات (Feedback Loop)

بمجرد أن ينفذ المستخدم المهمة، يجب أن تبلغ السيرفر فوراً ليحتسب اللايك ويسمح لك باستلام أوردرات أخرى (لأن السيرفر يحجز لك خانة ولا يرسل لك أكثر من 5 أوردرات معلقة في نفس الوقت لحماية جهازك).

### أ. حالة النجاح (Success)
إذا أتم المستخدم المهمة بنجاح داخل التطبيق، ارسل حدث `order_result`:
```javascript
socket.emit("order_result", { 
  jobId: "abc123xyz...",
  success: true
}, (response) => {
  if (response.success) {
    console.log("Server confirmed the action!");
  }
});
```

### ب. حالة الفشل الخارجي (Already Done Externally)
إذا فتح التطبيق الانستجرام ووجد أن المستخدم عامل لايك مسبقاً (قبل أن يطلب الأوردر):
يجب إرسال نفس الحدث `order_result` مع تحديد `success: false` وسبب الفشل لكي ينظف السيرفر الداتا الخاصة بك ولا يرسل لك هذا اللينك أبداً مرة أخرى.
```javascript
socket.emit("order_result", { 
  jobId: "abc123xyz...",
  success: false,
  reason: "already_done" // أو "direct_follow_already_done"
});
```

## 4. مسارات (REST APIs) المخصصة للإصدار الثاني (V2)
تم عزل جميع الـ APIs الخاصة بإدارة الأوردرات (إنشاء، جلب، تعديل، حذف) في مسار جديد كلياً وهو `/api/v4/mobile_v2`. يجب على الموبايل استخدام هذا المسار حصراً عند التعامل مع الأوردرات لضمان تسجيلها في نظام (V2).

**الرابط الأساسي (Base URL):** `https://dashboard.flycompany.online/api/v4/mobile_v2`

### أ. إنشاء أوردر جديد (Create Job)
- **المسار:** `POST /create`
- **المتطلبات (Body):** أرسل نفس كلاس `Job` الذي تستخدمه في التطبيق عبر `toJson()`. السيرفر يعتمد على المتغيرات الآتية: `uid`, `link`, `platform`, `type`, `linkTypeName`, `maxCount`, `likeCount`. (السيرفر يحوّل `type` و `linkTypeName` لـ `actionType` تلقائياً).
- **بالنسبة للـ IDs (`target_id`, `mediaId`, `userPk`):**
  - **انستجرام لايك/كومنت:** بما أنك قمت ببرمجة دالة `getMediaIdFromShortcode` محلياً في التطبيق، **أرسل `mediaId` جاهزاً في الـ Payload** ولن يحتاج السيرفر لاستخراجه.
  - **انستجرام فولو:** إذا كان التطبيق يعرف `userPk` للمستخدم، أرسله مباشرة. في الوقت الحالي، استخراج الـ userPk تلقائياً عبر الكوكيز **غير مفعّل للانستجرام** (الكوكيز لا تعمل بشكل موثوق)، لذا يُفضّل إرسال `userPk` إن أمكن.
  - **فيسبوك:** لا داعي لإرسال `target_id`، السيرفر سيستخرجها تلقائياً باستخدام حساب الاستخراج المحدد من لوحة التحكم وسيرسلها جاهزة في حدث `job_assigned`.

### ب. جلب أوردراتي (Get My Jobs)
- **المسار:** `GET /jobs/:id` (حيث الـ id هو الـ uid الخاص بالمستخدم)
- **الوظيفة:** يجلب جميع الأوردرات التي قام هذا المستخدم بإنشائها عبر الـ V2.

### ج. تحديث حالة الأوردر (Update Status)
- **المسار:** `POST /updateStatus/:jobId`
- **المتطلبات (Body):** `isLive` (true للتشغيل، false للإيقاف المؤقت)

### د. حذف أوردر (Delete Job)
- **المسار:** `DELETE /jobs/:jobId`
- **الوظيفة:** يحذف الأوردر نهائياً ويقوم بتنظيف أي مهام معلقة مرتبطة به لتحرير المستخدمين.

### هـ. إرسال الكوكيز (Send Cookies)
- **المسار:** `POST /cookies/:platform` (حيث `:platform` تمرر فيها كلمة `facebook`)
- **المتطلبات (Body):**
```json
{
  "uid": "USER_GOOGLE_UID",
  "cookies": "c_user=123; xs=abc;"
}
```

> [!IMPORTANT]
> في الوقت الحالي، **الكوكيز مطلوبة للفيسبوك فقط**. استخراج الـ IDs عبر كوكيز الانستجرام **غير موثوق** وغير مفعّل. إليك الموقف الكامل:

| المنصة | الحالة | المطلوب من الموبايل |
|---|---|---|
| **Instagram Like/Comment** | ✅ يعمل بدون كوكيز | أرسل `mediaId` مباشرة (بعد فك الـ Shortcode محلياً) |
| **Instagram Follow** | ⚠️ الكوكيز غير موثوقة | أرسل `userPk` مباشرة إن أمكن |
| **Facebook** | ✅ يعمل عبر كوكيز | السيرفر يستخرج `target_id` تلقائياً من حساب الاستخراج في لوحة التحكم |

---

## 5. ملاحظات هامة (Important Notes)
> [!WARNING]
> لا تتجاهل إرسال الرد عبر السوكيت (`order_result`)! إذا تراكمت المهام المعلقة عليك دون رد (حد أقصى 5 مهام)، سيصنفك السيرفر كـ "خامل" ولن تستلم أي أوردرات جديدة أبداً حتى ترد على المهام القديمة.

> [!TIP]
> تأكد من إغلاق الاتصال `socket.disconnect()` عندما يقوم المستخدم بتسجيل الخروج من التطبيق للحفاظ على موارد بطارية الهاتف والسيرفر.

---

## 6. لضمان استقرار التطبيق وقت الذروة (Edge Cases Handling)
لكي يتحمل النظام أكثر من 30 ألف مستخدم، قمنا ببرمجة حمايات قوية في السيرفر، ونحتاج منك تطبيق الآتي من جهة الموبايل:

### أ. حماية انهيار السيرفر (Randomized Reconnect Jitter)
في حال انقطع الإنترنت أو السيرفر ورجع فجأة، لا تجعل التطبيق يحاول إعادة الاتصال فوراً، بل اجعله ينتظر وقتاً عشوائياً لتجنب عاصفة الاتصالات (Thundering Herd).
**الحل:** أضف هذه الخصائص في إعدادات الاتصال:
```javascript
const socket = io("...", {
  reconnectionDelay: 1000 + Math.random() * 4000, // من 1 إلى 5 ثواني
  randomizationFactor: 0.5
});
```

### ب. إرسال حدث حالة الفشل بسبب المهلة (Timeout)
إذا استلم التطبيق الأوردر وبدأ في تنفيذه، السيرفر سيصبر عليك **15 دقيقة فقط**. إذا لم ترد بـ `success: true` خلال هذه الـ 15 دقيقة، السيرفر سيقوم بإلغاء الأوردر منك وتوزيعه لغيرك.
- **ملاحظة:** إذا تأخرت وأرسلت اللايك بعد 15 دقيقة، السيرفر سيرفض احتسابه وسيرد عليك بـ `success: false`.
- **المطلوب:** يرجى إرسال الـ Event مع `success: false` و `reason: "timeout"` إذا فشل التطبيق في الرد قبل 15 دقيقة لتنظيف الذاكرة بشكل أسرع.

### ج. الحماية من البوتات (Time Validation)
السيرفر يقوم بحساب الوقت المستغرق منذ إرسال الأوردر إليك وحتى استلام `success: true`. إذا كان الوقت أقل من **2.5 ثانية**، سيعتبر السيرفر أن هذا "بوت" أو "سكربت" وسيرفض العملية فوراً. (تأكد أن لا تقوم بعمل استجابة سريعة جداً برمجياً لتجنب الحظر).

### د. تجديد الـ Cookies الخاصة بالفيسبوك دورياً
الـ Cookies تنتهي صلاحيتها بعد أيام. حالياً الكوكيز المطلوبة هي **فيسبوك فقط** وهي يديرها الأدمن من لوحة التحكم (يختار حساباً من المستخدمين المتسجلين). **لا حاجة لإرسال كوكيز الانستجرام من التطبيق في الوقت الحالي.**
