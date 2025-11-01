import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { FileText, Save, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShipmentReportFormProps {
  shipmentId: string;
  shipmentNumber: string;
  currentReport?: string;
  reportCreatedBy?: string;
  reportCreatedAt?: string;
  onReportAdded?: () => void;
}

const ShipmentReportForm: React.FC<ShipmentReportFormProps> = ({
  shipmentId,
  shipmentNumber,
  currentReport,
  reportCreatedBy,
  reportCreatedAt,
  onReportAdded
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [report, setReport] = useState(currentReport || '');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!currentReport);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, [user?.role, user?.companyId]);

  const checkPermissions = async () => {
    // Check if user can add/edit report (recycler, transporter, or admin)
    if (user?.role === 'admin') {
      setCanEdit(true);
      return;
    }

    if (!user?.companyId) {
      setCanEdit(false);
      return;
    }

    try {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('recycler_company_id, transporter_company_id')
        .eq('id', shipmentId)
        .single();

      if (shipment) {
        const isRecycler = shipment.recycler_company_id === user.companyId;
        const isTransporter = shipment.transporter_company_id === user.companyId;
        setCanEdit(isRecycler || isTransporter);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setCanEdit(false);
    }
  };

  const handleSubmit = async () => {
    if (!report.trim()) {
      toast({
        title: "التقرير فارغ",
        description: "يرجى كتابة التقرير قبل الحفظ",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('add_shipment_report', {
        shipment_id_param: shipmentId,
        report_text: report.trim()
      });

      if (error) throw error;

      toast({
        title: "تم حفظ التقرير",
        description: "تم إضافة التقرير إلى الشحنة بنجاح",
      });

      setIsEditing(false);
      onReportAdded?.();
    } catch (error: any) {
      console.error('Error saving report:', error);
      toast({
        title: "خطأ في حفظ التقرير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit && !currentReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center font-cairo">
            <FileText className="h-5 w-5 ml-2" />
            تقرير الشحنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>لا توجد صلاحية لإضافة تقرير على هذه الشحنة</p>
            <p className="text-sm mt-2">فقط شركة النقل وجهة التدوير يمكنهما إضافة التقارير</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center font-cairo">
              <FileText className="h-5 w-5 ml-2" />
              تقرير الشحنة رقم {shipmentNumber}
            </CardTitle>
            <CardDescription>
              {currentReport 
                ? 'التقرير المسجل على الشحنة'
                : 'إضافة تقرير تفصيلي عن حالة الشحنة والمعالجة'}
            </CardDescription>
          </div>
          {currentReport && canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              تعديل
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reportCreatedAt && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">تم إنشاء التقرير</p>
              <p className="text-xs text-muted-foreground">
                {new Date(reportCreatedAt).toLocaleString('ar-SA')}
              </p>
            </div>
            <Badge variant="outline">محفوظ</Badge>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="report" className="text-base">نص التقرير</Label>
              <Textarea
                id="report"
                value={report}
                onChange={(e) => setReport(e.target.value)}
                placeholder="اكتب التقرير التفصيلي عن الشحنة... مثال: تم استلام الشحنة بحالة جيدة، الكمية مطابقة، تم فرز المخلفات وفقاً للتصنيف..."
                className="min-h-[200px] font-cairo mt-2"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {report.length} حرف
              </p>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse">
              {currentReport && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setReport(currentReport);
                    setIsEditing(false);
                  }}
                  disabled={loading}
                >
                  إلغاء
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={loading || !report.trim()}
              >
                {loading ? (
                  'جاري الحفظ...'
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التقرير
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">
              {report || 'لم يتم إضافة تقرير بعد'}
            </div>
            {currentReport && (
              <p className="text-xs text-muted-foreground">
                هذا التقرير سيظهر تلقائياً في نموذج التتبع عند الطباعة
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentReportForm;
