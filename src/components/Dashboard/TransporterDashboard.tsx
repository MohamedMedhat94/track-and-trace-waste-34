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
  Printer,
  Stamp,
  Search,
  Edit
} from 'lucide-react';
import ShipmentForm from '@/components/Forms/ShipmentForm';
import ShipmentsList from '@/components/Lists/ShipmentsList';
import DriverForm from '@/components/Forms/DriverForm';
import ShipmentPDFViewer from '@/components/PDF/ShipmentPDFViewer';
import ShipmentSearchPanel from '@/components/Filters/ShipmentSearchPanel';
import ConsolidatedShipmentReport from '@/components/Reports/ConsolidatedShipmentReport';
import ShipmentNotifications from '@/components/Notifications/ShipmentNotifications';
import StatusTracker from '@/components/Shipment/StatusTracker';
import ShipmentReportForm from '@/components/Shipment/ShipmentReportForm';
import CompanyRegistrationForm from '@/components/Forms/CompanyRegistrationForm';
import SimpleDriverMap from '@/components/Maps/SimpleDriverMap';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [filteredShipments, setFilteredShipments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedShipmentForPrint, setSelectedShipmentForPrint] = useState<any>(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showConsolidatedReport, setShowConsolidatedReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedShipmentForReport, setSelectedShipmentForReport] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedShipmentForStatus, setSelectedShipmentForStatus] = useState<any>(null);
  
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
    fetchTransporterShipments();
    fetchFilterData();
  }, [user?.companyId]);

  useEffect(() => {
    applyFilters();
  }, [myShipments, searchTerm, dateFrom, dateTo, wasteTypeFilter, companyFilter, driverFilter]);

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
      
      // Verify session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No active session in TransporterDashboard');
        toast({
          title: "انتهت الجلسة",
          description: "يرجى تسجيل الدخول مرة أخرى",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('TransporterDashboard: Fetching shipments for company_id:', user?.companyId);
      
      const { data: rpcData, error } = await supabase
        .rpc('get_company_shipments', { company_type: 'transporter' });

      if (error) {
        console.error('TransporterDashboard: Error from RPC:', error);
        throw error;
      }

      // Fetch additional shipment details including report
      if (rpcData && rpcData.length > 0) {
        const shipmentIds = rpcData.map((s: any) => s.id);
        const { data: detailedData, error: detailError } = await supabase
          .from('shipments')
          .select('id, shipment_report, report_created_at, report_created_by')
          .in('id', shipmentIds);

        if (!detailError && detailedData) {
          const enrichedData = rpcData.map((shipment: any) => {
            const details = detailedData.find((d: any) => d.id === shipment.id);
            return { ...shipment, ...details };
          });
          console.log('TransporterDashboard: Enriched data:', enrichedData);
          setMyShipments(enrichedData || []);
        } else {
          setMyShipments(rpcData || []);
        }
      } else {
        setMyShipments(rpcData || []);
      }
      
      // Update stats based on real data
      const total = rpcData?.length || 0;
      const active = rpcData?.filter((s: any) => ['pending', 'in_transit', 'processing'].includes(s.status)).length || 0;
      
      setStats(prev => ({
        ...prev,
        totalShipments: total,
        activeShipments: active
      }));

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
      const { data: wasteData } = await supabase
        .from('waste_types')
        .select('id, name')
        .order('name');
      
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, name')
        .order('name');

      setWasteTypes(wasteData || []);
      setCompanies(companyData || []);
      setDrivers(driverData || []);
    } catch (error) {
      console.error('خطأ في جلب بيانات الفلاتر:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...myShipments];

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

  const [showCompanyRegistration, setShowCompanyRegistration] = useState(false);

  const quickActions = [
    {
      title: 'إنشاء شحنة',
      description: 'بدء شحنة نفايات جديدة',
      icon: PlusCircle,
      action: () => setShowShipmentForm(true),
    },
    {
      title: 'تسجيل شركة',
      description: 'تسجيل شركة مولدة أو مدورة',
      icon: Building2,
      action: () => setShowCompanyRegistration(true),
    },
    {
      title: 'إدارة السائقين',
      description: 'إضافة أو تعديل السائقين',
      icon: Users,
      action: () => setShowDriverForm(true),
    },
    {
      title: 'البحث والتصفية',
      description: 'بحث متقدم عن الشحنات',
      icon: Search,
      action: () => setShowSearchPanel(!showSearchPanel),
    },
    {
      title: 'التقرير المجمع',
      description: 'طباعة تقرير مجمع للشحنات',
      icon: FileText,
      action: () => setShowConsolidatedReport(!showConsolidatedReport),
    },
    {
      title: 'الامضاءات والأختام',
      description: 'رفع امضاء وختم الشركة',
      icon: Stamp,
      action: () => navigate('/company-signatures'),
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

      {/* Notifications Panel */}
      <ShipmentNotifications />

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
        <ConsolidatedShipmentReport />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="font-cairo">نظرة عامة</TabsTrigger>
          <TabsTrigger value="driver-tracking" className="font-cairo">تتبع السائقين</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
            إدارة الشحنات والسائقين والتقارير
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                {myShipments.length === 0 ? 'لا توجد شحنات حتى الآن' : 'لا توجد شحنات مطابقة للفلاتر المحددة'}
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
                    <div className="flex items-center space-x-3 space-x-reverse mb-2">
                      <span className="font-semibold text-lg">{shipment.shipment_number}</span>
                      <Badge className={getStatusColor(shipment.status)}>
                        {getStatusText(shipment.status)}
                      </Badge>
                      {shipment.shipment_report && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <FileText className="h-3 w-3 ml-1" />
                          تقرير
                        </Badge>
                      )}
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
                        setSelectedShipmentForStatus(shipment);
                        setShowStatusModal(true);
                      }}
                      title="تغيير الحالة"
                      className="hover:bg-accent/10"
                    >
                      <Edit className="h-4 w-4 ml-1" />
                      <span className="text-xs">تغيير الحالة</span>
                    </Button>
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
        </TabsContent>

        <TabsContent value="driver-tracking" className="space-y-4">
          <SimpleDriverMap />
        </TabsContent>
      </Tabs>

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

      {/* Status Change Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تغيير حالة الشحنة</DialogTitle>
          </DialogHeader>
          {selectedShipmentForStatus && (
            <StatusTracker
              shipmentId={selectedShipmentForStatus.id}
              currentStatus={selectedShipmentForStatus.status}
              onStatusUpdate={() => {
                setShowStatusModal(false);
                fetchTransporterShipments();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">تقرير الشحنة</DialogTitle>
          </DialogHeader>
          {selectedShipmentForReport && (
            <ShipmentReportForm
              shipmentId={selectedShipmentForReport.id}
              shipmentNumber={selectedShipmentForReport.shipment_number}
              currentReport={selectedShipmentForReport.shipment_report}
              reportCreatedAt={selectedShipmentForReport.report_created_at}
              onReportAdded={() => {
                setShowReportModal(false);
                fetchTransporterShipments();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Company Registration Modal */}
      <Dialog open={showCompanyRegistration} onOpenChange={setShowCompanyRegistration}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CompanyRegistrationForm
            onClose={() => setShowCompanyRegistration(false)}
            onSuccess={() => {
              setShowCompanyRegistration(false);
              toast({
                title: "تم التسجيل بنجاح",
                description: "سيتم مراجعة طلب التسجيل من الإدارة",
              });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransporterDashboard;