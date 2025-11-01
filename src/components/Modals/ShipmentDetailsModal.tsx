import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Truck, Building2, User, Calendar, Weight, FileText, MapPin, Download } from 'lucide-react';
import PDFGenerator from '@/components/PDF/PDFGenerator';

interface ShipmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
  canEditStatus?: boolean;
  onStatusUpdate?: () => void;
}

const ShipmentDetailsModal: React.FC<ShipmentDetailsModalProps> = ({
  open,
  onOpenChange,
  shipment,
  canEditStatus = false,
  onStatusUpdate
}) => {
  const [newStatus, setNewStatus] = useState(shipment?.status || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      case 'processing': return 'قيد المعالجة';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'processing': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = async () => {
    if (!shipment || newStatus === shipment.status) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase.rpc('update_shipment_status', {
        shipment_id_param: shipment.id,
        new_status_param: newStatus,
        notes_param: `تم تحديث الحالة إلى: ${getStatusText(newStatus)}`
      });

      if (error) throw error;

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث حالة الشحنة إلى: ${getStatusText(newStatus)}`,
      });

      onStatusUpdate?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!shipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl font-cairo">
            <Package className="h-6 w-6 ml-2 text-primary" />
            تفاصيل الشحنة رقم {shipment.shipment_number}
          </DialogTitle>
          <DialogDescription>
            معلومات تفصيلية عن الشحنة وحالتها الحالية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground mb-1">الحالة الحالية</p>
              <Badge className={getStatusColor(shipment.status)}>
                {getStatusText(shipment.status)}
              </Badge>
            </div>
            {canEditStatus && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="w-[200px] font-cairo">
                    <SelectValue placeholder="تغيير الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="in_transit">قيد النقل</SelectItem>
                    <SelectItem value="delivered">تم التسليم</SelectItem>
                    <SelectItem value="processing">قيد المعالجة</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || newStatus === shipment.status}
                  size="sm"
                >
                  تحديث
                </Button>
              </div>
            )}
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <Building2 className="h-4 w-4 ml-2 text-blue-600" />
                <h4 className="font-semibold text-sm">الجهة المولدة</h4>
              </div>
              <p className="text-sm">{shipment.generator_company?.name || 'غير محدد'}</p>
              {shipment.generator_company?.phone && (
                <p className="text-xs text-muted-foreground mt-1">
                  {shipment.generator_company.phone}
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <Truck className="h-4 w-4 ml-2 text-orange-600" />
                <h4 className="font-semibold text-sm">شركة النقل</h4>
              </div>
              <p className="text-sm">{shipment.transporter_company?.name || 'غير محدد'}</p>
              {shipment.transporter_company?.phone && (
                <p className="text-xs text-muted-foreground mt-1">
                  {shipment.transporter_company.phone}
                </p>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <Building2 className="h-4 w-4 ml-2 text-green-600" />
                <h4 className="font-semibold text-sm">جهة التدوير</h4>
              </div>
              <p className="text-sm">{shipment.recycler_company?.name || 'غير محدد'}</p>
              {shipment.recycler_company?.phone && (
                <p className="text-xs text-muted-foreground mt-1">
                  {shipment.recycler_company.phone}
                </p>
              )}
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center">
              <FileText className="h-4 w-4 ml-2" />
              تفاصيل الشحنة
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">نوع المخلف</p>
                  <p className="text-sm font-medium">{shipment.waste_type?.name || 'غير محدد'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">الكمية</p>
                  <p className="text-sm font-medium">{shipment.quantity || 'غير محدد'} كغ</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">السائق</p>
                  <p className="text-sm font-medium">{shipment.driver?.name || 'غير محدد'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="text-sm font-medium">
                    {new Date(shipment.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Locations */}
          {(shipment.pickup_location || shipment.delivery_location) && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <MapPin className="h-4 w-4 ml-2" />
                المواقع
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {shipment.pickup_location && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">موقع الاستلام</p>
                    <p className="text-sm">{shipment.pickup_location}</p>
                  </div>
                )}
                
                {shipment.delivery_location && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">موقع التسليم</p>
                    <p className="text-sm">{shipment.delivery_location}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <PDFGenerator shipmentId={shipment.shipment_number} data={shipment} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShipmentDetailsModal;
