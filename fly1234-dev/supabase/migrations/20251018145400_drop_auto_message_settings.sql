/*
  # حذف جدول إعدادات الرسائل التلقائية

  1. حذف
    - حذف جدول `auto_message_settings` وكافة مكوناته
    - حذف الدالة والمحفز المرتبط به
    - حذف جميع السياسات والفهارس

  2. ملاحظات
    - هذا الترحيل يحذف الجدول بشكل كامل
    - سيتم فقدان جميع البيانات المخزنة في هذا الجدول
*/

-- حذف المحفز
DROP TRIGGER IF EXISTS update_auto_message_settings_updated_at_trigger ON auto_message_settings;

-- حذف الدالة
DROP FUNCTION IF EXISTS update_auto_message_settings_updated_at();

-- حذف الجدول (سيحذف تلقائياً جميع السياسات والفهارس المرتبطة)
DROP TABLE IF EXISTS auto_message_settings;
