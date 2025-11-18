import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Eye, 
  Download,
  Truck,
  Clock,
  CheckCircle,
  Building2,
  Search,
  Filter,
  X
} from 'lucide-react';
import PDFGenerator from '@/components/PDF/PDFGenerator';
import ShipmentNotifications from '@/components/Notifications/ShipmentNotifications';
import ShipmentSearchPanel from '@/components/Filters/ShipmentSearchPanel';
import ConsolidatedShipmentReport from '@/components/Reports/ConsolidatedShipmentReport';

const GeneratorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<any[]>([]);
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalShipments: 0,
    activeShipments: 0,
    completedShipments: 0,
    totalWasteProcessed: '0 kg'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showConsolidatedReport, setShowConsolidatedReport] = useState(false);
  
  // Search filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    fetchMyShipments();
    fetchFilterData();
  }, [user?.companyId]);

  useEffect(() => {
    applyFilters();
  }, [shipments, searchTerm, dateFrom, dateTo, wasteTypeFilter, companyFilter, driverFilter]);

  // Real-time updates for shipments
  useEffect(() => {
    if (!user?.companyId) return;

    console.log('Setting up Generator Dashboard real-time subscription for company:', user.companyId);
    const channel = supabase
      .channel(`generator-shipments-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Generator - Shipment change detected:', payload);
          // Always refresh - the RPC function will filter based on company_id
          fetchMyShipments();
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
          console.log('Generator - Notification change detected:', payload);
          fetchMyShipments();
        }
      )
      .subscribe((status) => {
        console.log('Generator subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.companyId]);

  const fetchMyShipments = async () => {
    try {
      setIsLoading(true);
      
      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No active session in GeneratorDashboard');
        toast({
          title: "انتهت الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('GeneratorDashboard: Fetching shipments for company_id:', user?.companyId);
      
      const { data, error } = await supabase
        .rpc('get_company_shipments', { company_type: 'generator' });

      if (error) {
        console.error('GeneratorDashboard: Error from RPC:', error);
        throw error;
      }

      console.log('GeneratorDashboard: Received data:', data);
      setShipments(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter((s: any) => ['pending', 'in_transit', 'sorting', 'recycling'].includes(s.status)).length || 0;
      const completed = data?.filter((s: any) => s.status === 'completed').length || 0;
      const totalWeight = data?.reduce((acc: number, s: any) => acc + (parseFloat(s.quantity?.toString() || '0') || 0), 0) || 0;

      setStats({
        totalShipments: total,
        activeShipments: active,
        completedShipments: completed,
        totalWasteProcessed: `${totalWeight.toFixed(1)} kg`
      });

    } catch (error: any) {
      console.error('خطأ في جلب الشحنات:', error);
      const errorMessage = error.message?.includes('session') 
        ? "انتهت الجلسة - يرجى تسجيل الدخول مرة أخرى" 
        : error.message || "حدث خطأ غير متوقع";
      
      toast({
        title: "خطأ في جلب البيانات",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterData = async () => {
    try {
      const { data: wasteTypesData } = await supabase
        .from('waste_types')
        .select('*')
        .order('name');
      
      const { data: companiesData } = await supabase
        .rpc('get_companies_for_selection');
      
      const { data: driversData } = await supabase
        .rpc('get_drivers_for_selection');

      setWasteTypes(wasteTypesData || []);
      setCompanies(companiesData || []);
      setDrivers(driversData || []);
    } catch (error) {
      console.error('خطأ في جلب بيانات الفلاتر:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...shipments];

    // Search by shipment number
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(s => 
        new Date(s.created_at) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter(s => 
        new Date(s.created_at) <= new Date(dateTo)
      );
    }

    // Waste type filter
    if (wasteTypeFilter !== 'all') {
      filtered = filtered.filter(s => s.waste_type_id === wasteTypeFilter);
    }

    // Company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter(s => 
        s.generator_company_id === companyFilter ||
        s.transporter_company_id === companyFilter ||
        s.recycler_company_id === companyFilter
      );
    }

    // Driver filter
    if (driverFilter !== 'all') {
      filtered = filtered.filter(s => s.driver_id === driverFilter);
    }

    setFilteredShipments(filtered);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setWasteTypeFilter('all');
    setCompanyFilter('all');
    setDriverFilter('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'sorting': return 'bg-accent text-accent-foreground';
      case 'recycling': return 'bg-secondary text-secondary-foreground';
      case 'completed': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'sorting': return 'قيد الفرز';
      case 'recycling': return 'قيد إعادة التدوير';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'sorting': return <FileText className="h-4 w-4" />;
      case 'recycling': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">لوحة تحكم الشركة المولدة</h1>
          <p className="text-muted-foreground">
            مرحباً بعودتك، {user?.name} - {user?.companyName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSearchPanel(!showSearchPanel)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            بحث متقدم
          </Button>
          <Button 
            onClick={() => setShowConsolidatedReport(!showConsolidatedReport)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            تقرير مجمع
          </Button>
          <Button 
            onClick={() => navigate('/company-profile')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            بيانات الشركة
          </Button>
        </div>
      </div>

      {/* Notifications Panel */}
      <ShipmentNotifications />

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
            <CardTitle className="text-sm font-medium font-cairo">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedShipments}</div>
            <p className="text-xs text-muted-foreground">
              تمت معالجتها بنجاح
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

      {/* My Shipments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-cairo">شحناتي</CardTitle>
            <CardDescription>
              تتبع شحنات النفايات من التولد إلى إعادة التدوير
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
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {searchTerm || dateFrom || dateTo || wasteTypeFilter !== 'all' || companyFilter !== 'all' || driverFilter !== 'all'
                  ? 'لا توجد نتائج للبحث'
                  : 'لا توجد شحنات حتى الآن'}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
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
                    
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                       <div>
                         <span className="text-muted-foreground">الناقل:</span>
                         <p className="font-medium">{shipment.transporter_company_name || 'غير محدد'}</p>
                       </div>
                       <div>
                         <span className="text-muted-foreground">المدور:</span>
                         <p className="font-medium">{shipment.recycler_company_name || 'غير محدد'}</p>
                       </div>
                       <div>
                         <span className="text-muted-foreground">نوع النفايات:</span>
                         <p className="font-medium">{shipment.waste_type_name || 'غير محدد'}</p>
                       </div>
                     </div>
                    
                     <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">
                        الكمية: <span className="font-medium">{shipment.quantity} كجم</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        تاريخ الإنشاء: {new Date(shipment.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>

                    {shipment.shipment_report && (
                      <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">تقرير الشحنة</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                          {shipment.shipment_report}
                        </p>
                        {shipment.report_created_at && (
                          <span className="text-xs text-muted-foreground mt-2 block">
                            تم الإنشاء: {new Date(shipment.report_created_at).toLocaleDateString('ar-SA')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 space-x-reverse ml-4">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <PDFGenerator shipmentId={shipment.id} data={shipment} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">المعلومات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">ما الذي يمكنني فعله كشركة مولدة للنفايات؟</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• عرض جميع الشحنات التي أنتجتها شركتك (قراءة فقط)</li>
                <li>• تتبع تقدم الشحنات في الوقت الفعلي</li>
                <li>• تحميل وطباعة تقارير التتبع بصيغة PDF</li>
                <li>• عرض معلومات مفصلة عن الناقلين والمدورين</li>
              </ul>
            </div>
            
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
              <h4 className="font-semibold text-warning mb-2">⚠️ ملاحظة هامة:</h4>
              <p className="text-sm text-muted-foreground">
                صلاحيتك محدودة للعرض والتتبع فقط. لا يمكنك إنشاء أو تعديل أو حذف الشحنات. 
                لأي طلبات تعديل، يرجى التواصل مع الناقل المسؤول أو إدارة النظام.
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">تحتاج مساعدة؟</h4>
              <p className="text-sm text-muted-foreground">
                تواصل مع الناقل المخصص لك أو مسؤول النظام لأي استفسارات حول شحناتك.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Panel */}
      {showSearchPanel && (
        <ShipmentSearchPanel
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          wasteTypeFilter={wasteTypeFilter}
          setWasteTypeFilter={setWasteTypeFilter}
          companyFilter={companyFilter}
          setCompanyFilter={setCompanyFilter}
          driverFilter={driverFilter}
          setDriverFilter={setDriverFilter}
          wasteTypes={wasteTypes}
          companies={companies}
          drivers={drivers}
          onReset={resetFilters}
        />
      )}

      {/* Consolidated Report */}
      {showConsolidatedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto bg-background rounded-lg">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 left-4 z-10"
                onClick={() => setShowConsolidatedReport(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              <ConsolidatedShipmentReport />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratorDashboard;