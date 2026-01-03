import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Truck, 
  Users, 
  FileText, 
  PlusCircle,
  Eye,
  Settings,
  BarChart3,
  Bell,
  MapPin,
  Upload,
  Link
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModalManager from '@/components/Modals/ModalManager';
import PDFGenerator from '@/components/PDF/PDFGenerator';
import UserActivationPanel from '@/components/Admin/UserActivationPanel';
import CompanyApprovalPanel from '@/components/Admin/CompanyApprovalPanel';
import RealTimeDriverMap from '@/components/GPS/RealTimeDriverMap';
import TestDataGenerator from '@/components/Admin/TestDataGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0,
    companies: 0,
    drivers: 0,
    activeDrivers: 0,
    pendingUsers: 0
  });
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
    fetchRecentShipments();
    setupRealtimeSubscriptions();
  }, []);

  const fetchStats = async () => {
    try {
      // Verify session before making requests
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No active session in AdminDashboard');
        toast({
          title: "انتهت الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        return;
      }

      // Fetch shipments count
      const { count: shipmentsCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true });

      // Fetch active shipments count
      const { count: activeShipmentsCount } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_transit']);

      // Fetch companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Fetch drivers count
      const { count: driversCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver');

      // Fetch active drivers count using secure function
      let activeDriversCount = 0;
      try {
        const { data: activeDriversData, error: activeDriversError } = await supabase
          .rpc('get_active_drivers');
        
        if (activeDriversError) {
          console.error('Error fetching active drivers:', activeDriversError);
        } else {
          activeDriversCount = activeDriversData?.length || 0;
        }
      } catch (driverError) {
        console.error('Exception fetching active drivers:', driverError);
      }

      // Fetch pending users count
      const { count: pendingUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false);

      setStats({
        totalShipments: shipmentsCount || 0,
        activeShipments: activeShipmentsCount || 0,
        companies: companiesCount || 0,
        drivers: driversCount || 0,
        activeDrivers: activeDriversCount,
        pendingUsers: pendingUsersCount || 0
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      if (error.message?.includes('session')) {
        toast({
          title: "خطأ في الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
      }
    }
  };

  const fetchRecentShipments = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name),
          transporter_company:companies!shipments_transporter_company_id_fkey(name),
          recycler_company:companies!shipments_recycler_company_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentShipments(data || []);
    } catch (error) {
      console.error('Error fetching recent shipments:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions for AdminDashboard');
    
    // Subscribe to all shipment changes (INSERT, UPDATE, DELETE)
    const shipmentsChannel = supabase
      .channel('admin-dashboard-all-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Admin - Shipment change detected:', payload);
          playNotificationSound();
          setNotifications(prev => prev + 1);
          // Refresh immediately without setTimeout
          fetchStats();
          fetchRecentShipments();
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "شحنة جديدة",
              description: `تم إنشاء شحنة جديدة برقم: ${payload.new.shipment_number}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast({
              title: "تحديث شحنة",
              description: `تم تحديث الشحنة رقم: ${payload.new.shipment_number}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'companies'
        },
        (payload) => {
          console.log('New company:', payload.new);
          playNotificationSound();
          setNotifications(prev => prev + 1);
          fetchStats();
          
          toast({
            title: "شركة جديدة",
            description: `تم تسجيل شركة جديدة: ${payload.new.name}`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('New user:', payload.new);
          if (payload.new.role === 'driver') {
            playNotificationSound();
            setNotifications(prev => prev + 1);
            fetchStats();
            
            toast({
              title: "سائق جديد",
              description: `تم تسجيل سائق جديد: ${payload.new.full_name}`,
            });
          }
        }
      )
      .subscribe();

    console.log('Real-time subscriptions setup completed for AdminDashboard');

    return () => {
      console.log('Cleaning up real-time subscriptions for AdminDashboard');
      supabase.removeChannel(shipmentsChannel);
    };
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuZ3/LCOS0FJHzJ8N2PPwoRXbTn7KpXFAlCm+H0xmkgBjuY3vLMey4FJHzK8N2PPgkTXLPm7KtYE6y'); 
    audio.play().catch(() => console.log('Could not play notification sound'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-success text-success-foreground';
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
    <ModalManager>
      {(openModal) => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-cairo">لوحة تحكم المسؤول</h1>
              <p className="text-muted-foreground">
                إدارة ومراقبة نظام إدارة النفايات بالكامل
              </p>
            </div>
            <div className="flex items-center space-x-3 space-x-reverse">
              {notifications > 0 && (
                <div className="relative">
                  <Bell className="h-6 w-6 text-primary" />
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    variant="destructive"
                  >
                    {notifications}
                  </Badge>
                </div>
              )}
              <Button 
                className="font-cairo"
                onClick={async () => {
                  const action = async () => navigate('/create-shipment');
                  await validateAndExecute('navigate_create_shipment', action, 'تم الانتقال لصفحة إنشاء الشحنة');
                }}
              >
                <PlusCircle className="h-4 w-4 ml-2" />
                إنشاء شحنة جديدة
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 space-x-reverse bg-muted p-1 rounded-lg w-fit">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
              className="font-cairo"
            >
              نظرة عامة
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('users')}
              className="font-cairo"
            >
              إدارة المستخدمين
            </Button>
            <Button
              variant={activeTab === 'approvals' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('approvals')}
              className="font-cairo"
            >
              موافقات الشركات
            </Button>
            <Button
              variant={activeTab === 'tracking' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('tracking')}
              className="font-cairo"
            >
              تتبع السائقين
            </Button>
            <Button
              variant={activeTab === 'testing' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('testing')}
              className="font-cairo"
            >
              بيانات الاختبار
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/total-shipments')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-cairo">إجمالي الشحنات</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalShipments}</div>
                    <p className="text-xs text-muted-foreground">
                      +12% من الشهر الماضي
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/active-shipments')}
                >
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

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/companies')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-cairo">الشركات المسجلة</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.companies}</div>
                    <p className="text-xs text-muted-foreground">
                      جميع الفئات
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/active-drivers')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-cairo">السائقون النشطون</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.activeDrivers}</div>
                    <p className="text-xs text-muted-foreground">
                      متصلين حالياً
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/total-drivers')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-cairo">إجمالي السائقين</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.drivers}</div>
                    <p className="text-xs text-muted-foreground">
                      مسجلين في النظام
                    </p>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate('/pending-users')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium font-cairo">المستخدمون المعلقون</CardTitle>
                    <Bell className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      في انتظار التفعيل
                    </p>
                  </CardContent>
                </Card>
              </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">الإجراءات السريعة</CardTitle>
              <CardDescription>
                الوظائف الإدارية المستخدمة بكثرة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 text-right"
                  onClick={async () => {
                    const action = async () => openModal('company');
                    await validateAndExecute('open_company_modal', action, 'تم فتح نموذج إضافة الشركة');
                  }}
                >
                  <Building2 className="h-6 w-6 mb-2 text-primary" />
                  <div>
                    <p className="font-semibold font-cairo">إضافة شركة</p>
                    <p className="text-sm text-muted-foreground">تسجيل شركات جديدة</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 text-right"
                  onClick={() => openModal('driver')}
                >
                  <Users className="h-6 w-6 mb-2 text-primary" />
                  <div>
                    <p className="font-semibold font-cairo">إضافة سائق</p>
                    <p className="text-sm text-muted-foreground">تسجيل سائقين جدد</p>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto flex-col items-start p-4 text-right"
                  onClick={() => navigate('/manage-waste-types')}
                >
                  <Settings className="h-6 w-6 mb-2 text-primary" />
                  <div>
                    <p className="font-semibold font-cairo">إدارة أنواع النفايات</p>
                    <p className="text-sm text-muted-foreground">تحرير فئات النفايات</p>
                  </div>
                </Button>
                
                 <Button
                   variant="outline"
                   className="h-auto flex-col items-start p-4 text-right"
                   onClick={() => navigate('/reports')}
                 >
                   <BarChart3 className="h-6 w-6 mb-2 text-primary" />
                   <div>
                     <p className="font-semibold font-cairo">عرض التقارير</p>
                     <p className="text-sm text-muted-foreground">إنشاء تقارير النظام</p>
                   </div>
                 </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/admin-companies-stats')}
                  >
                    <Building2 className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">إحصائيات الشركات</p>
                      <p className="text-sm text-muted-foreground">عرض أداء جميع الشركات</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/user-company-assignment')}
                  >
                    <Link className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">ربط المستخدمين بالشركات</p>
                      <p className="text-sm text-muted-foreground">إدارة ربط المستخدمين بالشركات</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/company-documents')}
                  >
                    <FileText className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">مستندات الشركات</p>
                      <p className="text-sm text-muted-foreground">عرض وطباعة مستندات الشروط والأختام</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/company-legal-data')}
                  >
                    <Building2 className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">البيانات القانونية</p>
                      <p className="text-sm text-muted-foreground">إدارة البيانات القانونية والمستندات</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/homepage-settings')}
                  >
                    <Settings className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">إعدادات الصفحة الرئيسية</p>
                      <p className="text-sm text-muted-foreground">تخصيص المميزات والنصوص</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={async () => {
                      const action = async () => {
                        // Quick test shipment creation
                        const timestamp = Date.now();
                        const testShipment = {
                          shipment_number: `TEST${timestamp}`,
                          generator_company_id: '651612ef-73ca-48b8-92f4-789375d92ae6',
                          transporter_company_id: '87658f87-2de3-4cd0-a3bb-e4091c7ff8a6', 
                          recycler_company_id: 'c1a929b0-df88-4e6a-943e-0c0940ba6c67',
                          driver_id: '8e436ec3-979b-4f7a-903e-3a56e3d932bb',
                          waste_type_id: '76471b3d-2539-4486-80cc-2372ff8194ef',
                          quantity: 50,
                          pickup_location: 'موقع اختبار الاستلام',
                          delivery_location: 'موقع اختبار التسليم',
                          status: 'pending',
                          driver_entry_type: 'registered'
                        };
                        
                        const { error } = await supabase
                          .from('shipments')
                          .insert([testShipment]);
                          
                        if (error) throw error;
                        
                        console.log('Test shipment created:', testShipment);
                      };
                      await validateAndExecute('create_test_shipment', action, `تم إنشاء شحنة اختبار بنجاح - ستظهر في جميع الصفحات فوراً`);
                    }}
                  >
                    <FileText className="h-6 w-6 mb-2 text-success" />
                    <div>
                      <p className="font-semibold font-cairo">إنشاء شحنة اختبار</p>
                      <p className="text-sm text-muted-foreground">اختبار التحديثات الفورية</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/testing-dashboard')}
                  >
                    <Settings className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">لوحة اختبار النظام</p>
                      <p className="text-sm text-muted-foreground">اختبار جميع الوظائف</p>
                    </div>
                  </Button>
               </div>
               
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/system-logs')}
                  >
                    <Settings className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">سجل النشاطات</p>
                      <p className="text-sm text-muted-foreground">تتبع جميع العمليات</p>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/driver-tracking')}
                  >
                    <Truck className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">تتبع السائقين</p>
                      <p className="text-sm text-muted-foreground">خريطة مواقع السائقين</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/multi-location-tracking')}
                  >
                    <MapPin className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">تتبع متعدد المواقع</p>
                      <p className="text-sm text-muted-foreground">تسجيل مواقع متعددة للسائق</p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 text-right"
                    onClick={() => navigate('/company-importer')}
                  >
                    <Upload className="h-6 w-6 mb-2 text-primary" />
                    <div>
                      <p className="font-semibold font-cairo">استيراد من PDF</p>
                      <p className="text-sm text-muted-foreground">إضافة الشركات من ملف PDF</p>
                    </div>
                  </Button>
                </div>
            </CardContent>
          </Card>

          {/* Recent Shipments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-cairo">الشحنات الأخيرة</CardTitle>
                <CardDescription>
                  أحدث أنشطة الشحنات في النظام
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/manage-users')}
              >
                <Eye className="h-4 w-4 ml-2" />
                عرض جميع المستخدمين
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentShipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="font-semibold">{shipment.shipment_number}</span>
                        <Badge className={getStatusColor(shipment.status)}>
                          {getStatusText(shipment.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {shipment.generator_company?.name} ← {shipment.transporter_company?.name} ← {shipment.recycler_company?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        تاريخ الإنشاء: {new Date(shipment.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/shipment/${shipment.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <PDFGenerator shipmentId={shipment.shipment_number} data={shipment} />
                    </div>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
            </>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && <UserActivationPanel />}

          {/* Company Approvals Tab */}
          {activeTab === 'approvals' && <CompanyApprovalPanel />}

          {/* Driver Tracking Tab - Using Live Map */}
          {activeTab === 'tracking' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-cairo flex items-center gap-2">
                    <MapPin className="h-6 w-6 text-primary" />
                    خريطة تتبع السائقين المباشرة
                  </CardTitle>
                  <CardDescription>عرض مواقع جميع السائقين على الخريطة في الوقت الفعلي</CardDescription>
                </CardHeader>
              </Card>
              <RealTimeDriverMap />
            </div>
          )}
          
          {/* Testing Data Tab */}
          {activeTab === 'testing' && <TestDataGenerator />}
        </div>
      )}
    </ModalManager>
  );
};

export default AdminDashboard;