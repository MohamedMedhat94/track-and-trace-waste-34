import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, AlertTriangle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface ApprovalInfo {
  status: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
}

interface ShipmentApprovalPanelProps {
  shipmentId: string;
  shipmentNumber: string;
  generatorCompanyId: string;
  recyclerCompanyId: string;
  transporterCompanyId: string;
  generatorApproval: ApprovalInfo;
  recyclerApproval: ApprovalInfo;
  overallStatus: string;
  autoApprovalDeadline: string;
  onApprovalUpdate?: () => void;
}

const ShipmentApprovalPanel: React.FC<ShipmentApprovalPanelProps> = ({
  shipmentId,
  shipmentNumber,
  generatorCompanyId,
  recyclerCompanyId,
  transporterCompanyId,
  generatorApproval,
  recyclerApproval,
  overallStatus,
  autoApprovalDeadline,
  onApprovalUpdate
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">مقبولة</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>;
      case 'auto_approved':
        return <Badge className="bg-blue-100 text-blue-800">مقبولة تلقائياً</Badge>;
      default:
        return <Badge variant="outline">قيد الانتظار</Badge>;
    }
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">مقبولة</Badge>;
      case 'rejected':
        return <Badge variant="destructive">مرفوضة</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">ملغية</Badge>;
      default:
        return <Badge variant="outline">قيد الانتظار</Badge>;
    }
  };

  const getUserApprovalType = () => {
    if (!user?.companyId) return null;
    
    if (user.companyId === generatorCompanyId) return 'generator';
    if (user.companyId === recyclerCompanyId) return 'recycler';
    return null;
  };

  const canUserApprove = () => {
    const approvalType = getUserApprovalType();
    if (!approvalType) return false;

    if (approvalType === 'generator' && generatorApproval.status === 'pending') return true;
    if (approvalType === 'recycler' && recyclerApproval.status === 'pending') return true;
    
    return false;
  };

  const handleApproval = async (isApproved: boolean) => {
    const approvalType = getUserApprovalType();
    if (!approvalType) return;

    const action = async () => {
      const { error } = await supabase.rpc('approve_shipment', {
        shipment_id_param: shipmentId,
        approval_type: approvalType,
        is_approved: isApproved,
        rejection_reason_param: isApproved ? null : rejectionReason
      });

      if (error) throw error;
    };

    setIsProcessing(true);
    const result = await validateAndExecute(
      'approve_shipment',
      action,
      isApproved ? 'تم قبول الشحنة بنجاح' : 'تم رفض الشحنة'
    );

    if (result.success) {
      setRejectionReason('');
      onApprovalUpdate?.();
    }
    setIsProcessing(false);
  };

  const getTimeRemaining = () => {
    const deadline = new Date(autoApprovalDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return 'انتهت المهلة';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ساعة و ${minutes} دقيقة`;
  };

  const isExpired = new Date(autoApprovalDeadline) <= new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <Building2 className="h-5 w-5 ml-2" />
          حالة موافقة الشحنة رقم {shipmentNumber}
        </CardTitle>
        <CardDescription>
          حالة موافقة الجهات المشاركة في الشحنة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h4 className="font-medium">الحالة العامة للشحنة</h4>
            <p className="text-sm text-muted-foreground">
              حالة الشحنة الإجمالية بناءً على موافقة الجهات
            </p>
          </div>
          {getOverallStatusBadge(overallStatus)}
        </div>

        {/* Auto Approval Countdown */}
        {overallStatus === 'pending' && (
          <div className={`flex items-center p-4 rounded-lg ${
            isExpired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <Clock className="h-5 w-5 ml-2 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-800">
                {isExpired ? 'انتهت مهلة الموافقة' : 'الوقت المتبقي للموافقة التلقائية'}
              </h4>
              <p className="text-sm text-yellow-700">
                {isExpired ? 
                  'ستتم الموافقة التلقائية خلال دقائق' : 
                  `سيتم قبول الشحنة تلقائياً خلال: ${getTimeRemaining()}`
                }
              </p>
            </div>
          </div>
        )}

        {/* Approval Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Generator Approval */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">الجهة المولدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">الحالة:</span>
                  {getApprovalStatusBadge(generatorApproval.status)}
                </div>
                {generatorApproval.approved_at && (
                  <div className="text-xs text-muted-foreground">
                    تاريخ الموافقة: {new Date(generatorApproval.approved_at).toLocaleString('ar-SA')}
                  </div>
                )}
                {generatorApproval.rejection_reason && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    سبب الرفض: {generatorApproval.rejection_reason}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recycler Approval */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">الجهة المدورة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">الحالة:</span>
                  {getApprovalStatusBadge(recyclerApproval.status)}
                </div>
                {recyclerApproval.approved_at && (
                  <div className="text-xs text-muted-foreground">
                    تاريخ الموافقة: {new Date(recyclerApproval.approved_at).toLocaleString('ar-SA')}
                  </div>
                )}
                {recyclerApproval.rejection_reason && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    سبب الرفض: {recyclerApproval.rejection_reason}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Actions */}
        {canUserApprove() && overallStatus === 'pending' && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium font-cairo">إجراء الموافقة</h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>سبب الرفض (اختياري)</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="أدخل سبب رفض الشحنة إن وجد..."
                  className="h-20"
                />
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <Button
                  onClick={() => handleApproval(true)}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 ml-2" />
                  قبول الشحنة
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(false)}
                  disabled={isProcessing || !rejectionReason.trim()}
                >
                  <XCircle className="h-4 w-4 ml-2" />
                  رفض الشحنة
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info for non-authorized users */}
        {!canUserApprove() && user?.role !== 'admin' && (
          <div className="flex items-center p-4 bg-blue-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 ml-2 text-blue-600" />
            <div className="text-blue-800">
              <p className="font-medium">لا يمكنك الموافقة على هذه الشحنة</p>
              <p className="text-sm">
                فقط الجهة المولدة والجهة المدورة يمكنهما الموافقة على الشحنة
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentApprovalPanel;