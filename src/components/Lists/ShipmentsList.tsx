import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Search, 
  Printer,
  MapPin,
  Calendar,
  Package
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ShipmentsListProps {
  onEdit?: (shipment: any) => void;
  onView?: (shipment: any) => void;
  refreshTrigger?: number;
}

const ShipmentsList: React.FC<ShipmentsListProps> = ({ onEdit, onView, refreshTrigger }) => {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchShipments();
  }, [refreshTrigger]);

  useEffect(() => {
    filterShipments();
  }, [shipments, searchTerm]);

  const fetchShipments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name),
          transporter_company:companies!shipments_transporter_company_id_fkey(name),
          recycler_company:companies!shipments_recycler_company_id_fkey(name),
          driver:drivers(name),
          waste_type:waste_types(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      console.error('خطأ في جلب الشحنات:', error);
      toast({
        title: "خطأ في جلب الشحنات",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterShipments = () => {
    if (!searchTerm) {
      setFilteredShipments(shipments);
      return;
    }

    const filtered = shipments.filter(shipment => 
      shipment.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.generator_company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.transporter_company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.recycler_company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.waste_type?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredShipments(filtered);
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', shipmentId);

      if (error) throw error;

      toast({
        title: "تم حذف الشحنة",
        description: "تم حذف الشحنة بنجاح",
      });

      fetchShipments();
    } catch (error: any) {
      console.error('خطأ في حذف الشحنة:', error);
      toast({
        title: "خطأ في حذف الشحنة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const handlePrintShipment = (shipment: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>تفاصيل الشحنة - ${shipment.shipment_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
              .label { font-weight: bold; }
              .status { padding: 5px 10px; border-radius: 5px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>تفاصيل الشحنة</h1>
              <h2>${shipment.shipment_number}</h2>
            </div>
            <div class="details">
              <div class="row">
                <span class="label">الشركة المولدة:</span>
                <span>${shipment.generator_company?.name || 'غير محدد'}</span>
              </div>
              <div class="row">
                <span class="label">شركة النقل:</span>
                <span>${shipment.transporter_company?.name || 'غير محدد'}</span>
              </div>
              <div class="row">
                <span class="label">شركة إعادة التدوير:</span>
                <span>${shipment.recycler_company?.name || 'غير محدد'}</span>
              </div>
              <div class="row">
                <span class="label">السائق:</span>
                <span>${shipment.driver?.name || 'غير محدد'}</span>
              </div>
              <div class="row">
                <span class="label">نوع النفايات:</span>
                <span>${shipment.waste_type?.name || 'غير محدد'}</span>
              </div>
              <div class="row">
                <span class="label">الكمية:</span>
                <span>${shipment.quantity || 0} كغ</span>
              </div>
              <div class="row">
                <span class="label">الحالة:</span>
                <span>${getStatusText(shipment.status)}</span>
              </div>
              <div class="row">
                <span class="label">تاريخ الإنشاء:</span>
                <span>${new Date(shipment.created_at).toLocaleDateString('ar-SA')}</span>
              </div>
              ${shipment.waste_description ? `
                <div class="row">
                  <span class="label">وصف النفايات:</span>
                  <span>${shipment.waste_description}</span>
                </div>
              ` : ''}
              ${shipment.pickup_location ? `
                <div class="row">
                  <span class="label">موقع الاستلام:</span>
                  <span>${shipment.pickup_location}</span>
                </div>
              ` : ''}
              ${shipment.delivery_location ? `
                <div class="row">
                  <span class="label">موقع التسليم:</span>
                  <span>${shipment.delivery_location}</span>
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-info text-info-foreground';
      case 'recycling': return 'bg-accent text-accent-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      case 'recycling': return 'قيد إعادة التدوير';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحميل الشحنات...</p>
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
            <CardTitle className="font-cairo">قائمة الشحنات</CardTitle>
            <CardDescription>
              إدارة جميع الشحنات في النظام
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الشحنات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-3 pr-9 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredShipments.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد شحنات</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'لم يتم العثور على شحنات مطابقة لبحثك' : 'لم يتم إنشاء أي شحنات بعد'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map((shipment) => (
              <div
                key={shipment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 space-x-reverse mb-2">
                    <span className="font-semibold text-lg">{shipment.shipment_number}</span>
                    <Badge className={getStatusColor(shipment.status)}>
                      {getStatusText(shipment.status)}
                    </Badge>
                    {shipment.quantity && (
                      <Badge variant="outline">
                        {shipment.quantity} كغ
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">المولد:</span>
                      <p className="font-medium">{shipment.generator_company?.name || 'غير محدد'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">الناقل:</span>
                      <p className="font-medium">{shipment.transporter_company?.name || 'غير محدد'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المدور:</span>
                      <p className="font-medium">{shipment.recycler_company?.name || 'غير محدد'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">السائق:</span>
                      <p className="font-medium">{shipment.driver?.name || 'غير محدد'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 space-x-reverse text-xs text-muted-foreground">
                    {shipment.waste_type?.name && (
                      <span>نوع النفايات: {shipment.waste_type.name}</span>
                    )}
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 ml-1" />
                      {new Date(shipment.created_at).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
                
                <div className="flex space-x-2 space-x-reverse ml-4">
                  {onView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(shipment)}
                      title="عرض التفاصيل"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrintShipment(shipment)}
                    title="طباعة"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>

                  {shipment.pickup_location && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="عرض الموقع"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(shipment)}
                      title="تعديل"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-cairo">تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف الشحنة رقم {shipment.shipment_number}؟ 
                          هذا الإجراء لا يمكن التراجع عنه.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteShipment(shipment.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipmentsList;