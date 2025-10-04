import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  PlusCircle,
  Truck, 
  Users, 
  Building2,
  FileText,
  Eye,
  MapPin,
  X,
  Printer
} from 'lucide-react';
import ShipmentForm from '@/components/Forms/ShipmentForm';
import ShipmentsList from '@/components/Lists/ShipmentsList';
import DriverForm from '@/components/Forms/DriverForm';
import ShipmentPDFViewer from '@/components/PDF/ShipmentPDFViewer';

const TransporterDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState({
    totalShipments: 67,
    activeShipments: 12,
    myDrivers: 8,
    partneredCompanies: 15
  });

  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showShipmentsList, setShowShipmentsList] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [myShipments, setMyShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedShipmentForPrint, setSelectedShipmentForPrint] = useState<any>(null);

  useEffect(() => {
    fetchTransporterShipments();
  }, [user?.companyId]);

  // Real-time updates for shipments
  useEffect(() => {
    if (!user?.companyId) return;

    console.log('Setting up Transporter Dashboard real-time subscription for company:', user.companyId);
    const channel = supabase
      .channel(`transporter-shipments-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Transporter - Shipment change detected:', payload);
          // Always refresh - the RPC function will filter based on company_id
          fetchTransporterShipments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipment_notifications'
        },
        (payload) => {
          console.log('Transporter - Notification change detected:', payload);
          fetchTransporterShipments();
        }
      )
      .subscribe((status) => {
        console.log('Transporter subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.companyId]);

  const fetchTransporterShipments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_company_shipments', { company_type: 'transporter' });

      if (error) throw error;

      setMyShipments(data || []);
      
      // Update stats based on real data
      const total = data?.length || 0;
      const active = data?.filter((s: any) => ['pending', 'in_transit', 'processing'].includes(s.status)).length || 0;
      
      setStats(prev => ({
        ...prev,
        totalShipments: total,
        activeShipments: active
      }));

    } catch (error: any) {
      console.error('خطأ في جلب الشحنات:', error);
      toast({
        title: "خطأ في جلب البيانات",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'إنشاء شحنة',
      description: 'بدء شحنة نفايات جديدة',
      icon: PlusCircle,
      action: () => setShowShipmentForm(true),
    },
    {
      title: 'إدارة السائقين',
      description: 'إضافة أو تعديل السائقين',
      icon: Users,
      action: () => setShowDriverForm(true),
    },
    {
      title: 'عرض الشحنات',
      description: 'إدارة وتعديل الشحنات',
      icon: FileText,
      action: () => setShowShipmentsList(true),
    },
    {
      title: 'تتبع السائقين',
      description: 'متابعة مواقع السائقين',
      icon: MapPin,
      action: () => navigate('/driver-tracking'),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-accent text-accent-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">لوحة تحكم شركة النقل</h1>
          <p className="text-muted-foreground">
            مرحباً بعودتك، {user?.name} - {user?.companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate('/company-dashboard')}
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            عرض شحنات الشركة
          </Button>
          <Button className="font-cairo" onClick={() => setShowShipmentForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            إنشاء شحنة
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي الشحنات</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShipments}</div>
            <p className="text-xs text-muted-foreground">
              جميع الشحنات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">الشحنات النشطة</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeShipments}</div>
            <p className="text-xs text-muted-foreground">
              قيد التنفيذ حالياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">سائقيي</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.myDrivers}</div>
            <p className="text-xs text-muted-foreground">
              سائقين مسجلين
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">الشركات الشريكة</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partneredCompanies}</div>
            <p className="text-xs text-muted-foreground">
              مولدين ومدورين
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">الإجراءات السريعة</CardTitle>
          <CardDescription>
            إدارة الشحنات والسائقين والشركات الشريكة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto flex-col items-start p-4 text-left hover:bg-primary/5"
                onClick={action.action}
              >
                <action.icon className="h-6 w-6 mb-2 text-primary" />
                <div>
                  <p className="font-semibold font-cairo">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-cairo">شحناتي</CardTitle>
            <CardDescription>
              الشحنات المدارة بواسطة شركة النقل الخاصة بك
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            عرض الكل
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">جاري تحميل الشحنات...</div>
            </div>
          ) : myShipments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">لا توجد شحنات حتى الآن</div>
            </div>
          ) : (
            <div className="space-y-4">
              {myShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-lg">{shipment.shipment_number}</span>
                      <Badge className={getStatusColor(shipment.status)}>
                        {getStatusText(shipment.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">المولد:</span>
                        <p className="font-medium">{shipment.generator_company_name || 'غير محدد'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">المدور:</span>
                        <p className="font-medium">{shipment.recycler_company_name || 'غير محدد'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">نوع النفايات:</span>
                        <p className="font-medium">{shipment.waste_type_name || 'غير محدد'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الكمية:</span>
                        <p className="font-medium">{shipment.quantity} كجم</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        تاريخ الإنشاء: {new Date(shipment.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setSelectedShipmentForPrint(shipment);
                        setShowPrintModal(true);
                      }}
                      title="طباعة نموذج التتبع"
                      className="hover:bg-primary/10"
                    >
                      <Printer className="h-4 w-4 ml-1" />
                      <span className="text-xs">طباعة</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/shipment/${shipment.id}`)}
                      title="عرض التفاصيل"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showShipmentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 text-white hover:text-white/80 z-10"
                onClick={() => {
                  setShowShipmentForm(false);
                  setEditingShipment(null);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
              <ShipmentForm
                onClose={() => {
                  setShowShipmentForm(false);
                  setEditingShipment(null);
                  setRefreshTrigger(prev => prev + 1);
                }}
                editingShipment={editingShipment}
              />
            </div>
          </div>
        </div>
      )}

      {showDriverForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 text-white hover:text-white/80 z-10"
                onClick={() => setShowDriverForm(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <DriverForm
                onClose={() => setShowDriverForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showShipmentsList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-7xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 text-white hover:text-white/80 z-10"
                onClick={() => setShowShipmentsList(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <ShipmentsList
                onEdit={(shipment) => {
                  setEditingShipment(shipment);
                  setShowShipmentsList(false);
                  setShowShipmentForm(true);
                }}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </div>
      )}


      {showPrintModal && selectedShipmentForPrint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute -top-10 right-0 text-white hover:text-white/80 z-10"
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedShipmentForPrint(null);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
              <ShipmentPDFViewer shipment={selectedShipmentForPrint} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransporterDashboard;