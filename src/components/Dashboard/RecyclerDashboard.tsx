import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Recycle,
  Clock,
  CheckCircle,
  FileText,
  Eye,
  PlayCircle,
  StopCircle,
  Download,
  Building2
} from 'lucide-react';
import ShipmentNotifications from '@/components/Notifications/ShipmentNotifications';

const RecyclerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReceived: 0,
    currentlyProcessing: 0,
    completedRecycling: 0,
    totalWasteProcessed: '0 kg'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReceivedShipments();
  }, [user?.companyId]);

  // Real-time updates for shipments
  useEffect(() => {
    if (!user?.companyId) return;

    console.log('Setting up Recycler Dashboard real-time subscription for company:', user.companyId);
    const channel = supabase
      .channel(`recycler-shipments-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments',
          filter: `recycler_company_id=eq.${user.companyId}`
        },
        (payload) => {
          console.log('Recycler - Shipment change detected:', payload);
          fetchReceivedShipments(); // Refresh immediately
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
          console.log('Recycler - Notification change detected:', payload);
          if (payload.new && (payload.new as any).recipient_company_id === user.companyId) {
            setTimeout(() => fetchReceivedShipments(), 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Recycler subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.companyId]);

  const fetchReceivedShipments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .rpc('get_company_shipments', { company_type: 'recycler' });

      if (error) throw error;

      setShipments(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const processing = data?.filter((s: any) => ['sorting', 'recycling'].includes(s.status)).length || 0;
      const completed = data?.filter((s: any) => s.status === 'completed').length || 0;
      const totalWeight = data?.reduce((acc: number, s: any) => acc + (parseFloat(s.quantity?.toString() || '0') || 0), 0) || 0;

      setStats({
        totalReceived: total,
        currentlyProcessing: processing,
        completedRecycling: completed,
        totalWasteProcessed: `${totalWeight.toFixed(1)} kg`
      });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-accent text-accent-foreground';
      case 'sorting': return 'bg-secondary text-secondary-foreground';
      case 'sorted': return 'bg-info text-info-foreground';
      case 'recycling': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'جاهز للفرز';
      case 'sorting': return 'فرز قيد التقدم';
      case 'sorted': return 'جاهز للتدوير';
      case 'recycling': return 'إعادة تدوير قيد التقدم';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <FileText className="h-4 w-4" />;
      case 'delivered': return <Clock className="h-4 w-4" />;
      case 'sorting': return <PlayCircle className="h-4 w-4" />;
      case 'sorted': return <CheckCircle className="h-4 w-4" />;
      case 'recycling': return <Recycle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">لوحة تحكم شركة إعادة التدوير</h1>
          <p className="text-muted-foreground">
            مرحباً بعودتك، {user?.name} - {user?.companyName}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/company-dashboard')}
          className="flex items-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          عرض شحنات الشركة
        </Button>
      </div>

      {/* Notifications Panel */}
      <ShipmentNotifications />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي المستلمة</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReceived}</div>
            <p className="text-xs text-muted-foreground">
              جميع الشحنات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">قيد المعالجة حالياً</CardTitle>
            <Recycle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentlyProcessing}</div>
            <p className="text-xs text-muted-foreground">
              عمليات نشطة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">مكتمل</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedRecycling}</div>
            <p className="text-xs text-muted-foreground">
              تم تدويره بنجاح
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">النفايات المعالجة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWasteProcessed}</div>
            <p className="text-xs text-muted-foreground">
              إجمالي الوزن المدور
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Received Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-cairo">الشحنات المستلمة</CardTitle>
            <CardDescription>
              إدارة عمليات الفرز وإعادة التدوير للنفايات المستلمة
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
          ) : shipments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">لا توجد شحنات مستلمة حتى الآن</div>
            </div>
          ) : (
            <div className="space-y-4">
              {shipments.map((shipment) => {
                const canStartSorting = shipment.status === 'delivered';
                const canEndSorting = shipment.status === 'sorting';
                const canStartRecycling = shipment.status === 'sorted';
                const canEndRecycling = shipment.status === 'recycling';

                return (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-semibold text-lg">{shipment.shipment_number}</span>
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusIcon(shipment.status)}
                          <span className="ml-1">{getStatusText(shipment.status)}</span>
                        </Badge>
                      </div>
                      
                       <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm mb-3">
                         <div>
                           <span className="text-muted-foreground">المولد:</span>
                           <p className="font-medium">{shipment.generator_company_name || 'غير محدد'}</p>
                         </div>
                         <div>
                           <span className="text-muted-foreground">الناقل:</span>
                           <p className="font-medium">{shipment.transporter_company_name || 'غير محدد'}</p>
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

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {canStartSorting && (
                          <Button size="sm" variant="outline">
                            <PlayCircle className="h-4 w-4 mr-1" />
                            بدء الفرز
                          </Button>
                        )}
                        {canEndSorting && (
                          <Button size="sm" variant="outline">
                            <StopCircle className="h-4 w-4 mr-1" />
                            إنهاء الفرز
                          </Button>
                        )}
                        {canStartRecycling && (
                          <Button size="sm" variant="outline">
                            <PlayCircle className="h-4 w-4 mr-1" />
                            بدء إعادة التدوير
                          </Button>
                        )}
                        {canEndRecycling && (
                          <Button size="sm" variant="outline">
                            <StopCircle className="h-4 w-4 mr-1" />
                            إنهاء إعادة التدوير
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          تاريخ الإنشاء: {new Date(shipment.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">عمليات إعادة التدوير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">ما الذي يمكنني فعله كشركة إعادة تدوير؟</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• عرض جميع الشحنات المخصصة لمنشأتك</li>
                <li>• تحديث مراحل المعالجة: بدء/إنهاء الفرز وإعادة التدوير</li>
                <li>• إضافة تقارير مفصلة للتخلص وإعادة التدوير</li>
                <li>• إنتاج وطباعة تقارير التتبع بصيغة PDF</li>
                <li>• إغلاق الشحنات المكتملة</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">سير العملية</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>1. استلام الشحنة من الناقل</p>
                  <p>2. بدء وإكمال عملية الفرز</p>
                  <p>3. بدء عمليات إعادة التدوير</p>
                  <p>4. إكمال إعادة التدوير وإغلاق الشحنة</p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">التقارير</h4>
                <p className="text-sm text-muted-foreground">
                  توثيق جميع أنشطة إعادة التدوير وإنتاج تقارير شاملة لكل شحنة تتم معالجتها.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecyclerDashboard;