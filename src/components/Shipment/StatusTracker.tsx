import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, Truck, Package, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface StatusHistory {
  status: string;
  timestamp: string;
  updated_by: string;
  updated_by_email: string;
  notes?: string;
}

interface StatusTrackerProps {
  shipmentId: string;
  currentStatus: string;
  statusHistory?: StatusHistory[];
  onStatusUpdate?: () => void;
}

const StatusTracker: React.FC<StatusTrackerProps> = ({
  shipmentId,
  currentStatus,
  statusHistory = [],
  onStatusUpdate
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [notes, setNotes] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  // التسلسل الصحيح للحالات: مسجل → قيد النقل → قيد التسليم → قيد الفرز → مكتمل
  const statusConfig = {
    pending: { 
      label: 'معلّق', 
      color: 'bg-yellow-500 text-white', 
      icon: Clock,
      next: ['registered']
    },
    registered: { 
      label: 'مسجّل', 
      color: 'bg-blue-500 text-white', 
      icon: Package,
      next: ['in_transit']
    },
    in_transit: { 
      label: 'قيد النقل', 
      color: 'bg-purple-500 text-white', 
      icon: Truck,
      next: ['delivery']
    },
    delivery: { 
      label: 'قيد التسليم', 
      color: 'bg-indigo-500 text-white', 
      icon: MapPin,
      next: ['sorting']
    },
    sorting: { 
      label: 'قيد الفرز', 
      color: 'bg-orange-500 text-white', 
      icon: Package,
      next: ['completed']
    },
    completed: { 
      label: 'مكتمل', 
      color: 'bg-green-600 text-white', 
      icon: CheckCircle,
      next: []
    }
  };

  // شركات النقل لها صلاحية كاملة لتغيير الحالات (مثل المسؤول)
  // المدورون يمكنهم تحديث الحالات المتعلقة بعملياتهم
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'transporter' || user?.role === 'recycler';


  const handleUpdateStatus = async () => {
    if (!canUpdateStatus || selectedStatus === currentStatus) return;

    const action = async () => {
      await supabase.rpc('update_shipment_status', {
        shipment_id_param: shipmentId,
        new_status_param: selectedStatus,
        notes_param: notes || null
      });
    };

    setIsUpdating(true);
    const result = await validateAndExecute(
      'update_shipment_status',
      action,
      `تم تحديث حالة الشحنة إلى: ${statusConfig[selectedStatus as keyof typeof statusConfig]?.label}`
    );

    if (result.success) {
      setNotes('');
      onStatusUpdate?.();
    }
    setIsUpdating(false);
  };

  const renderApprovalInfo = () => {
    // This will only show if we have approval data in statusHistory
    const approvalEntries = statusHistory.filter(entry => 
      entry.status === 'approved' || entry.status === 'rejected' || entry.status === 'auto_approved'
    );

    if (approvalEntries.length === 0) return null;

    return (
      <div className="border-t pt-4">
        <h4 className="font-medium font-cairo mb-3">معلومات الموافقة</h4>
        <div className="space-y-2">
          {approvalEntries.map((entry, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
              <div>
                <Badge className={
                  entry.status === 'approved' ? 'bg-green-100 text-green-800' :
                  entry.status === 'auto_approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }>
                  {entry.status === 'approved' ? 'مقبولة' :
                   entry.status === 'auto_approved' ? 'مقبولة تلقائياً' :
                   'مرفوضة'}
                </Badge>
                {entry.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                )}
              </div>
              <div className="text-left text-sm text-muted-foreground">
                <p>{new Date(entry.timestamp).toLocaleDateString('ar-SA')}</p>
                <p>{entry.updated_by_email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getStatusSteps = () => {
    // التسلسل الصحيح: مسجل → قيد النقل → قيد التسليم → قيد الفرز → مكتمل
    const steps = ['registered', 'in_transit', 'delivery', 'sorting', 'completed'];
    const currentIndex = steps.indexOf(currentStatus);
    
    return steps.map((step, index) => {
      const config = statusConfig[step as keyof typeof statusConfig];
      const Icon = config.icon;
      const isActive = index <= currentIndex;
      const isCurrent = step === currentStatus;
      
      return (
        <div key={step} className="flex items-center">
          <div className={`flex items-center space-x-2 p-2 rounded-lg ${
            isCurrent ? config.color : isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
          }`}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-2 ${
              index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          )}
        </div>
      );
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-cairo flex items-center">
          <MapPin className="h-5 w-5 ml-2" />
          تتبع حالة الشحنة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Flow */}
        <div className="flex flex-wrap items-center gap-2">
          {getStatusSteps()}
        </div>

        {/* Current Status */}
        <div className="flex items-center space-x-3">
          <span className="font-medium">الحالة الحالية:</span>
          <Badge className={statusConfig[currentStatus as keyof typeof statusConfig]?.color || 'bg-gray-500 text-white'}>
            {statusConfig[currentStatus as keyof typeof statusConfig]?.label || currentStatus}
          </Badge>
        </div>

        {/* Status Update (Admin/Company Users) */}
        {canUpdateStatus && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium font-cairo">تحديث الحالة</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الحالة الجديدة</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>ملاحظات (اختيارية)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول التحديث..."
                  className="h-9"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdateStatus}
              disabled={isUpdating || selectedStatus === currentStatus}
              className="w-full"
            >
              {isUpdating ? 'جاري التحديث...' : 'تحديث الحالة'}
            </Button>
          </div>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium font-cairo mb-3">تاريخ التحديثات</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {statusHistory.map((entry, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <div>
                    <Badge className={statusConfig[entry.status as keyof typeof statusConfig]?.color || 'bg-gray-500 text-white'}>
                      {statusConfig[entry.status as keyof typeof statusConfig]?.label || entry.status}
                    </Badge>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="text-left text-sm text-muted-foreground">
                    <p>{new Date(entry.timestamp).toLocaleDateString('ar-SA')}</p>
                    <p>{entry.updated_by_email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Information */}
        {renderApprovalInfo()}
      </CardContent>
    </Card>
  );
};

export default StatusTracker;