import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DriverLocationRegister from '@/components/Driver/DriverLocationRegister';
import ShipmentPDFViewer from '@/components/PDF/ShipmentPDFViewer';
import { 
  MapPin,
  Clock,
  Truck,
  PlayCircle,
  StopCircle,
  Navigation,
  FileText,
  Eye,
  Printer,
  PlusCircle
} from 'lucide-react';

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [locationSharing, setLocationSharing] = useState(false);
  const [selectedShipmentForPrint, setSelectedShipmentForPrint] = useState<any>(null);

  const stats = {
    totalDeliveries: 89,
    activeDeliveries: 2,
    completedToday: 3,
    totalDistance: '2,456 km'
  };

  const [myDeliveries, setMyDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDriverShipments();
  }, [user]);

  // Real-time updates for shipments
  useEffect(() => {
    const channel = supabase
      .channel('driver-shipments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipments'
        },
        (payload) => {
          console.log('Shipment change detected:', payload);
          fetchDriverShipments(); // Refresh shipments on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchDriverShipments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_driver_shipments');
      
      if (error) throw error;
      
      const transformedData = (data || []).map(shipment => ({
        id: shipment.shipment_number,
        shipmentId: shipment.id,
        generator: shipment.generator_company_name,
        recycler: shipment.recycler_company_name,
        wasteType: 'نفايات متنوعة',
        quantity: `${shipment.quantity || 0} kg`,
        status: shipment.status === 'pending' ? 'ready_for_pickup' : shipment.status,
        canStartDelivery: shipment.status === 'pending',
        canEndDelivery: shipment.status === 'in_transit',
        pickupAddress: shipment.pickup_location || 'موقع الاستلام',
        deliveryAddress: shipment.delivery_location || 'موقع التسليم',
      }));
      
      setMyDeliveries(transformedData);
    } catch (error: any) {
      console.error('خطأ في جلب شحنات السائق:', error);
      toast({
        title: "خطأ في جلب الشحنات",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready_for_pickup': return 'bg-warning text-warning-foreground';
      case 'in_transit': return 'bg-primary text-primary-foreground';
      case 'delivered': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready_for_pickup': return 'جاهز للاستلام';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      default: return status;
    }
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationSharing(true);
          toast({
            title: "تم تفعيل مشاركة الموقع",
            description: "سيتم تتبع موقعك أثناء التسليمات النشطة.",
          });
          console.log('Location:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          toast({
            title: "تم رفض الوصول للموقع",
            description: "يرجى السماح بالوصول للموقع لبدء التسليمات.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "الموقع الجغرافي غير مدعوم",
        description: "متصفحك لا يدعم تحديد الموقع الجغرافي.",
        variant: "destructive",
      });
    }
  };

  const handleStartDelivery = (shipmentId: string) => {
    if (!locationSharing) {
      handleLocationShare();
    } else {
      toast({
        title: "تم بدء التسليم",
        description: `تم بدء التسليم للشحنة ${shipmentId}`,
      });
      // Update shipment status logic here
    }
  };

  const handleEndDelivery = (shipmentId: string) => {
    toast({
      title: "تم إكمال التسليم",
      description: `تم إكمال التسليم للشحنة ${shipmentId}`,
    });
    // Update shipment status logic here
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">لوحة تحكم السائق</h1>
          <p className="text-muted-foreground">
            مرحباً بعودتك، {user?.name} - {user?.companyName}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => navigate('/create-shipment')}
            className="font-cairo"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            إنشاء شحنة جديدة
          </Button>
          <Button 
            variant={locationSharing ? "default" : "outline"}
            onClick={handleLocationShare}
            className="font-cairo"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {locationSharing ? "تم مشاركة الموقع" : "مشاركة الموقع"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي التسليمات</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              جميع التسليمات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">التسليمات النشطة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDeliveries}</div>
            <p className="text-xs text-muted-foreground">
              مخصصة حالياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">مكتملة اليوم</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              تسليمات اليوم
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-cairo">إجمالي المسافة</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistance}</div>
            <p className="text-xs text-muted-foreground">
              جميع المسافات
            </p>
          </CardContent>
        </Card>
      </div>

      {/* My Deliveries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-cairo">تسليماتي</CardTitle>
            <CardDescription>
              إدارة مهام الاستلام والتسليم المخصصة لك
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
          ) : myDeliveries.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">لا توجد شحنات مخصصة لك حالياً</div>
            </div>
          ) : (
            <div className="space-y-4">
              {myDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="font-semibold text-lg">{delivery.id}</span>
                    <Badge className={getStatusColor(delivery.status)}>
                      {getStatusText(delivery.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">المولد:</span>
                      <p className="font-medium">{delivery.generator}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {delivery.pickupAddress}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">المدور:</span>
                      <p className="font-medium">{delivery.recycler}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {delivery.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-muted-foreground">
                      النفايات: <span className="font-medium">{delivery.wasteType}</span>
                    </span>
                    <span className="text-muted-foreground">
                      الكمية: <span className="font-medium">{delivery.quantity}</span>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 mt-3">
                    {delivery.canStartDelivery && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartDelivery(delivery.id)}
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        بدء التسليم
                      </Button>
                    )}
                    {delivery.canEndDelivery && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEndDelivery(delivery.id)}
                      >
                        <StopCircle className="h-4 w-4 mr-1" />
                        إكمال التسليم
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      <Navigation className="h-4 w-4 mr-1" />
                      توجيه
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setSelectedShipmentForPrint(delivery)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      طباعة
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DriverLocationRegister 
          driverId={user?.id || 'temp-driver-id'} 
          onLocationUpdate={(location) => {
            console.log('Location updated:', location);
            toast({
              title: "تم تحديث الموقع",
              description: "تم تسجيل موقعك بنجاح",
            });
          }}
        />

        {selectedShipmentForPrint && (
          <Card>
            <CardHeader>
              <CardTitle className="font-cairo">طباعة تفاصيل الشحنة</CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentPDFViewer 
                shipment={{
                  id: selectedShipmentForPrint.id,
                  shipment_number: selectedShipmentForPrint.id,
                  status: selectedShipmentForPrint.status,
                  quantity: parseFloat(selectedShipmentForPrint.quantity.replace(' kg', '')),
                  created_at: new Date().toISOString(),
                  generator_company: {
                    id: '1',
                    name: selectedShipmentForPrint.generator,
                    address: selectedShipmentForPrint.pickupAddress
                  },
                  recycler_company: {
                    id: '2', 
                    name: selectedShipmentForPrint.recycler,
                    address: selectedShipmentForPrint.deliveryAddress
                  },
                  waste_type: {
                    id: '1',
                    name: selectedShipmentForPrint.wasteType
                  },
                  pickup_location: selectedShipmentForPrint.pickupAddress,
                  delivery_location: selectedShipmentForPrint.deliveryAddress
                }}
                driverName={user?.name}
              />
              <Button 
                variant="outline" 
                onClick={() => setSelectedShipmentForPrint(null)}
                className="mt-4 w-full"
              >
                إغلاق
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Driver Information */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo">معلومات السائق</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">ما الذي يمكنني فعله كسائق؟</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• تسجيل أوقات المغادرة والوصول للتسليمات</li>
                <li>• مشاركة الموقع الحالي أثناء التسليمات النشطة</li>
                <li>• اختيار شركات المولدة والمدورة من المهام المخصصة</li>
                <li>• تحديث حالة التسليم والطوابع الزمنية</li>
                <li>• عرض مسارات التسليم والتوجيه</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">مشاركة الموقع</h4>
                <p className="text-sm text-muted-foreground">
                  قم بتفعيل مشاركة الموقع لتتبع التسليمات في الوقت الفعلي وتوفير تحديثات دقيقة للتسليم.
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2">عملية التسليم</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>1. استلام مهمة التسليم</p>
                  <p>2. بدء التسليم (الموقع مطلوب)</p>
                  <p>3. التوجه إلى موقع الاستلام</p>
                  <p>4. إكمال الاستلام والتسليم</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDashboard;