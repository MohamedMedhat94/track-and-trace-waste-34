import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Truck, Package, Clock, Building2, User, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ActiveShipment {
  id: string;
  shipment_number: string;
  status: string;
  quantity: number;
  pickup_date: string;
  delivery_date: string;
  created_at: string;
  generator_company: { name: string } | null;
  transporter_company: { name: string } | null;
  recycler_company: { name: string } | null;
}

const ActiveShipmentsDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveShipments();
  }, []);

  const fetchActiveShipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name),
          transporter_company:companies!shipments_transporter_company_id_fkey(name),
          recycler_company:companies!shipments_recycler_company_id_fkey(name)
        `)
        .in('status', ['pending', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching active shipments:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل بيانات الشحنات النشطة: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'in_transit':
        return 'قيد النقل';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const stats = {
    total: shipments.length,
    pending: shipments.filter(s => s.status === 'pending').length,
    inTransit: shipments.filter(s => s.status === 'in_transit').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات الشحنات النشطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/')}
            className="font-cairo"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للوحة التحكم
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-cairo">الشحنات النشطة</h1>
            <p className="text-muted-foreground">
              عرض تفصيلي لجميع الشحنات قيد التنفيذ
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Truck className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{shipments.length}</span>
          <span className="text-muted-foreground">شحنة نشطة</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">إجمالي الشحنات النشطة</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <p className="text-sm text-muted-foreground">في الانتظار</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.inTransit}</div>
                <p className="text-sm text-muted-foreground">قيد النقل</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments List */}
      {shipments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-cairo">لا توجد شحنات نشطة حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shipments.map((shipment) => (
            <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Package className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg font-cairo">
                        {shipment.shipment_number}
                      </CardTitle>
                      <Badge className={getStatusColor(shipment.status)}>
                        {getStatusText(shipment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {shipment.quantity && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الكمية:</span>
                      <span className="font-medium">{shipment.quantity} كغ</span>
                    </div>
                  )}
                  
                  {shipment.generator_company && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">المولد: {shipment.generator_company.name}</span>
                    </div>
                  )}
                  
                  {shipment.transporter_company && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">الناقل: {shipment.transporter_company.name}</span>
                    </div>
                  )}
                  
                  {shipment.recycler_company && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">المدوِر: {shipment.recycler_company.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تاريخ الاستلام:</span>
                    <span className="text-xs">{formatDate(shipment.pickup_date)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تاريخ التسليم:</span>
                    <span className="text-xs">{formatDate(shipment.delivery_date)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                    <span className="text-xs">{formatDate(shipment.created_at)}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full font-cairo"
                    onClick={() => navigate(`/shipment/${shipment.id}`)}
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    عرض التفاصيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveShipmentsDetails;