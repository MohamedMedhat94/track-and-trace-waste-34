-- إضافة حقول الموافقة إلى جدول الشحنات
ALTER TABLE shipments 
ADD COLUMN generator_approval_status TEXT DEFAULT 'pending' CHECK (generator_approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
ADD COLUMN recycler_approval_status TEXT DEFAULT 'pending' CHECK (recycler_approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
ADD COLUMN generator_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN recycler_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN generator_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN recycler_approved_by UUID REFERENCES auth.users(id),
ADD COLUMN generator_rejection_reason TEXT,
ADD COLUMN recycler_rejection_reason TEXT,
ADD COLUMN auto_approval_deadline TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '6 hours'),
ADD COLUMN overall_approval_status TEXT DEFAULT 'pending' CHECK (overall_approval_status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- إنشاء جدول إشعارات الشحنات
CREATE TABLE shipment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  recipient_company_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('shipment_created', 'approval_request', 'approved', 'rejected', 'auto_approved', 'cancelled')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_via_email BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- تمكين RLS لجدول الإشعارات
ALTER TABLE shipment_notifications ENABLE ROW LEVEL SECURITY;

-- سياسة للشركات لعرض إشعاراتها فقط
CREATE POLICY "Companies can view their notifications" 
ON shipment_notifications FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.company_id = shipment_notifications.recipient_company_id
));

-- سياسة للإدارة لعرض جميع الإشعارات
CREATE POLICY "Admins can view all notifications" 
ON shipment_notifications FOR ALL 
USING (get_current_user_role() = 'admin');

-- إنشاء فهارس للأداء
CREATE INDEX idx_shipment_notifications_recipient ON shipment_notifications(recipient_company_id);
CREATE INDEX idx_shipment_notifications_shipment ON shipment_notifications(shipment_id);
CREATE INDEX idx_shipments_approval_deadline ON shipments(auto_approval_deadline);

-- دالة لإرسال إشعار الشحنة
CREATE OR REPLACE FUNCTION create_shipment_notification(
  shipment_id_param UUID,
  recipient_company_id_param UUID,
  notification_type_param TEXT,
  title_param TEXT,
  message_param TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO shipment_notifications (
    shipment_id, recipient_company_id, notification_type, title, message
  ) VALUES (
    shipment_id_param, recipient_company_id_param, notification_type_param, title_param, message_param
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- دالة لمعالجة موافقة الشحنة
CREATE OR REPLACE FUNCTION approve_shipment(
  shipment_id_param UUID,
  approval_type TEXT, -- 'generator' or 'recycler'
  is_approved BOOLEAN,
  rejection_reason_param TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id UUID;
  shipment_record RECORD;
  generator_company_name TEXT;
  recycler_company_name TEXT;
  transporter_company_name TEXT;
BEGIN
  -- الحصول على معرف شركة المستخدم الحالي
  SELECT company_id INTO current_user_company_id
  FROM profiles WHERE user_id = auth.uid();
  
  -- الحصول على تفاصيل الشحنة
  SELECT * INTO shipment_record
  FROM shipments WHERE id = shipment_id_param;
  
  -- التحقق من الصلاحيات
  IF approval_type = 'generator' AND current_user_company_id != shipment_record.generator_company_id THEN
    RAISE EXCEPTION 'غير مصرح لك بالموافقة على هذه الشحنة كجهة مولدة';
  END IF;
  
  IF approval_type = 'recycler' AND current_user_company_id != shipment_record.recycler_company_id THEN
    RAISE EXCEPTION 'غير مصرح لك بالموافقة على هذه الشحنة كجهة مدورة';
  END IF;
  
  -- تحديث حالة الموافقة
  IF approval_type = 'generator' THEN
    UPDATE shipments SET
      generator_approval_status = CASE WHEN is_approved THEN 'approved' ELSE 'rejected' END,
      generator_approved_at = now(),
      generator_approved_by = auth.uid(),
      generator_rejection_reason = CASE WHEN NOT is_approved THEN rejection_reason_param ELSE NULL END
    WHERE id = shipment_id_param;
  ELSE
    UPDATE shipments SET
      recycler_approval_status = CASE WHEN is_approved THEN 'approved' ELSE 'rejected' END,
      recycler_approved_at = now(),
      recycler_approved_by = auth.uid(),
      recycler_rejection_reason = CASE WHEN NOT is_approved THEN rejection_reason_param ELSE NULL END
    WHERE id = shipment_id_param;
  END IF;
  
  -- الحصول على أسماء الشركات
  SELECT name INTO generator_company_name FROM companies WHERE id = shipment_record.generator_company_id;
  SELECT name INTO recycler_company_name FROM companies WHERE id = shipment_record.recycler_company_id;
  SELECT name INTO transporter_company_name FROM companies WHERE id = shipment_record.transporter_company_id;
  
  -- إذا تم رفض الشحنة، قم بإلغائها وإرسال إشعار
  IF NOT is_approved THEN
    UPDATE shipments SET overall_approval_status = 'cancelled' WHERE id = shipment_id_param;
    
    -- إشعار شركة النقل بالرفض
    PERFORM create_shipment_notification(
      shipment_id_param,
      shipment_record.transporter_company_id,
      'rejected',
      'تم رفض الشحنة رقم ' || shipment_record.shipment_number,
      'تم رفض الشحنة من قبل ' || 
      CASE WHEN approval_type = 'generator' THEN generator_company_name ELSE recycler_company_name END ||
      CASE WHEN rejection_reason_param IS NOT NULL THEN '. السبب: ' || rejection_reason_param ELSE '' END
    );
  ELSE
    -- إذا تم قبول الشحنة من كلا الجهتين
    IF (SELECT generator_approval_status = 'approved' AND recycler_approval_status = 'approved' 
        FROM shipments WHERE id = shipment_id_param) THEN
      UPDATE shipments SET overall_approval_status = 'approved' WHERE id = shipment_id_param;
      
      -- إشعار شركة النقل بالموافقة
      PERFORM create_shipment_notification(
        shipment_id_param,
        shipment_record.transporter_company_id,
        'approved',
        'تم قبول الشحنة رقم ' || shipment_record.shipment_number,
        'تم قبول الشحنة من قبل كلا من ' || generator_company_name || ' و ' || recycler_company_name
      );
    END IF;
  END IF;
END;
$$;

-- دالة للموافقة التلقائية
CREATE OR REPLACE FUNCTION auto_approve_expired_shipments()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  shipment_record RECORD;
  generator_company_name TEXT;
  recycler_company_name TEXT;
BEGIN
  -- البحث عن الشحنات المنتهية الصلاحية
  FOR shipment_record IN 
    SELECT * FROM shipments 
    WHERE auto_approval_deadline < now()
    AND overall_approval_status = 'pending'
  LOOP
    -- تحديث حالة الموافقة للجهات التي لم توافق بعد
    UPDATE shipments SET
      generator_approval_status = CASE 
        WHEN generator_approval_status = 'pending' THEN 'auto_approved' 
        ELSE generator_approval_status 
      END,
      recycler_approval_status = CASE 
        WHEN recycler_approval_status = 'pending' THEN 'auto_approved' 
        ELSE recycler_approval_status 
      END,
      overall_approval_status = 'approved'
    WHERE id = shipment_record.id;
    
    -- الحصول على أسماء الشركات
    SELECT name INTO generator_company_name FROM companies WHERE id = shipment_record.generator_company_id;
    SELECT name INTO recycler_company_name FROM companies WHERE id = shipment_record.recycler_company_id;
    
    -- إشعار شركة النقل بالموافقة التلقائية
    PERFORM create_shipment_notification(
      shipment_record.id,
      shipment_record.transporter_company_id,
      'auto_approved',
      'تم قبول الشحنة تلقائياً رقم ' || shipment_record.shipment_number,
      'تم قبول الشحنة تلقائياً بعد انتهاء المهلة المحددة (6 ساعات). الجهة المولدة: ' || 
      generator_company_name || '، الجهة المدورة: ' || recycler_company_name
    );
  END LOOP;
END;
$$;

-- تحديث الدالة المسؤولة عن إنشاء الشحنة لإرسال الإشعارات
CREATE OR REPLACE FUNCTION notify_shipment_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  generator_company_name TEXT;
  recycler_company_name TEXT;
  transporter_company_name TEXT;
BEGIN
  -- الحصول على أسماء الشركات
  SELECT name INTO generator_company_name FROM companies WHERE id = NEW.generator_company_id;
  SELECT name INTO recycler_company_name FROM companies WHERE id = NEW.recycler_company_id;
  SELECT name INTO transporter_company_name FROM companies WHERE id = NEW.transporter_company_id;
  
  -- إشعار الجهة المولدة
  PERFORM create_shipment_notification(
    NEW.id,
    NEW.generator_company_id,
    'approval_request',
    'طلب موافقة على شحنة جديدة رقم ' || NEW.shipment_number,
    'تم إنشاء شحنة جديدة من قبل ' || transporter_company_name || 
    ' تتطلب موافقتكم. يجب الرد خلال 6 ساعات وإلا ستتم الموافقة تلقائياً.'
  );
  
  -- إشعار الجهة المدورة
  PERFORM create_shipment_notification(
    NEW.id,
    NEW.recycler_company_id,
    'approval_request',
    'طلب موافقة على شحنة جديدة رقم ' || NEW.shipment_number,
    'تم إنشاء شحنة جديدة من قبل ' || transporter_company_name || 
    ' تتطلب موافقتكم. يجب الرد خلال 6 ساعات وإلا ستتم الموافقة تلقائياً.'
  );
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger لإرسال الإشعارات عند إنشاء شحنة
CREATE TRIGGER trigger_notify_shipment_creation
AFTER INSERT ON shipments
FOR EACH ROW
EXECUTE FUNCTION notify_shipment_creation();