# دمج علامات API مع الأرصدة

## المشكلة

عند ربط شركة في صفحة **API Integrations**، لم تكن علامة API تظهر في صفحة **الأرصدة**.

## الحل

تم إضافة نظام متكامل للتحقق من اتصالات API وعرض العلامات تلقائياً.

## التعديلات

### 1. صفحة API Integrations
```typescript
// عند المزامنة اليدوية
await updateDoc(doc(db, 'balances', existingBalance.id), {
  amount: balance,
  lastUpdated: Timestamp.now(),
  isAutoSync: true,          // ✅
  apiSource: connection.name  // ✅
});
```

### 2. خدمة المزامنة التلقائية
```typescript
// في apiSyncService.ts
await updateDoc(doc(db, 'balances', existingBalance.id), {
  amount: balance,
  lastUpdated: Timestamp.now(),
  isAutoSync: true,          // ✅
  apiSource: connection.name  // ✅
});
```

### 3. صفحة الأرصدة
```typescript
// دالة مزامنة عند التحميل
const syncApiConnections = async () => {
  const activeConnections = await getActiveApiConnections();
  
  for (const balance of allBalances) {
    const hasConnection = activeConnections.find(
      conn => conn.sourceId === balance.sourceId
    );
    
    if (hasConnection) {
      // تفعيل العلامات
      await updateBalance(balance.id, {
        isAutoSync: true,
        apiSource: hasConnection.name
      });
    } else {
      // إلغاء العلامات
      await updateBalance(balance.id, {
        isAutoSync: false,
        apiSource: null
      });
    }
  }
};
```

## كيف يعمل

### عند إضافة اتصال API:
```
1. إضافة اتصال في API Integrations
2. مزامنة الرصيد
3. حفظ isAutoSync = true
4. فتح صفحة الأرصدة
5. ✅ العلامات تظهر تلقائياً!
```

### عند تعطيل الاتصال:
```
1. تعطيل الاتصال في API Integrations
2. فتح صفحة الأرصدة
3. syncApiConnections() تكتشف عدم وجود اتصال نشط
4. ✅ العلامات تختفي تلقائياً!
```

## النتيجة

```
Iraqi ATA Cloud مع اتصال API نشط:

┌─────────────────────────────────────┐
│  ⚡ رصيد تلقائي - API              │ ← Badge
│                                     │
│  [Logo⚡] Iraqi ATA Cloud [⚡ API] │ ← 3 علامات
│           [خط طيران]               │
│                                     │
│  الرصيد: 19,478,337.05 د.ع         │
└─────────────────────────────────────┘
```

---
**الحالة:** ✅ يعمل بشكل كامل
