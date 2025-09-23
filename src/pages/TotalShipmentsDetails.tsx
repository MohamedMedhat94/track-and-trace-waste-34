import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, Search, Eye, Calendar, Building2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Shipment {
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

const TotalShipmentsDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAllShipments();
    setupRealtimeSubscriptions();
  }, []);

  useEffect(() => {
    filterShipments();
  }, [shipments, searchTerm, statusFilter]);

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions for TotalShipmentsDetails');
    
    const shipmentsChannel = supabase
      .channel('total-shipments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change detected in TotalShipmentsDetails:', payload);
          fetchAllShipments(); // Refresh the shipments list
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "شحنة جديدة",
              description: `تم إنشاء شحنة جديدة برقم: ${payload.new.shipment_number}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions for TotalShipmentsDetails');
      supabase.removeChannel(shipmentsChannel);
    };
  };

  const fetchAllShipments = async () => {
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      console.error('Error fetching shipments:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: `فشل في تحميل بيانات الشحنات: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterShipments = () => {
    let filtered = shipments;

    if (searchTerm) {
      filtered = filtered.filter(shipment =>
        shipment.shipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.generator_company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.transporter_company?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shipment.recycler_company?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(shipment => shipment.status === statusFilter);
    }

    setFilteredShipments(filtered);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'in_transit':
        return 'قيد النقل';
      case 'delivered':
        return 'تم التسليم';
      case 'completed':
        return 'مكتمل';
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
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
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
    delivered: shipments.filter(s => s.status === 'delivered').length,
    completed: shipments.filter(s => s.status === 'completed').length,
    totalQuantity: shipments.reduce((sum, s) => sum + (s.quantity || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="font-cairo">جاري تحميل بيانات الشحنات...</p>
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
            <h1 className="text-3xl font-bold font-cairo">إجمالي الشحنات</h1>
            <p className="text-muted-foreground">
              عرض تفصيلي لجميع الشحنات في النظام
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <Package className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{shipments.length}</span>
          <span className="text-muted-foreground">شحنة</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">إجمالي الشحنات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">في الانتظار</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">قيد النقل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">تم التسليم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">مكتمل</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">كغ إجمالي</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الشحنة أو اسم الشركة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="حالة الشحنة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="in_transit">قيد النقل</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="font-cairo"
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shipments List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">قائمة الشحنات</CardTitle>
          <CardDescription>
            {filteredShipments.length} شحنة من أصل {shipments.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-cairo">لا توجد شحنات تطابق معايير البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShipments.map((shipment) => (
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
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TotalShipmentsDetails;