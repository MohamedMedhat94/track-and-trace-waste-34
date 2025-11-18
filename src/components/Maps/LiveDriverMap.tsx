import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Navigation, Truck, MapPin } from 'lucide-react';

interface DriverLocation {
  id: string;
  name: string;
  current_latitude: number;
  current_longitude: number;
  last_location_update: string;
  is_online: boolean;
  vehicle_type?: string;
  vehicle_plate?: string;
  phone?: string;
  company_name?: string;
}

const LiveDriverMap: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Default center (Saudi Arabia)
  const [center, setCenter] = useState({ lat: 24.7136, lng: 46.6753 });
  const [zoom, setZoom] = useState(6);

  useEffect(() => {
    fetchDrivers();
    
    // Real-time subscription
    const channel = supabase
      .channel('live-driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDrivers, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          name,
          current_latitude,
          current_longitude,
          last_location_update,
          is_online,
          vehicle_type,
          vehicle_plate,
          phone,
          transport_company_id,
          companies!drivers_transport_company_id_fkey(name)
        `)
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

      if (error) throw error;

      const driversWithCompany = data?.map(driver => ({
        ...driver,
        company_name: driver.companies?.name || 'غير محدد'
      })) || [];

      setDrivers(driversWithCompany);

      // Center map on first online driver if available
      const onlineDriver = driversWithCompany.find(d => d.is_online);
      if (onlineDriver) {
        setCenter({
          lat: onlineDriver.current_latitude,
          lng: onlineDriver.current_longitude
        });
        setZoom(10);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل مواقع السائقين",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOnlineStatus = (driver: DriverLocation) => {
    if (!driver.last_location_update) return { status: 'offline', color: 'bg-destructive', text: 'غير متصل' };
    
    const now = new Date();
    const updateTime = new Date(driver.last_location_update);
    const diffMins = Math.floor((now.getTime() - updateTime.getTime()) / 60000);
    
    if (diffMins > 10 || !driver.is_online) {
      return { status: 'offline', color: 'bg-destructive', text: 'غير متصل' };
    } else if (diffMins <= 2) {
      return { status: 'online', color: 'bg-green-500', text: 'متصل الآن' };
    } else {
      return { status: 'idle', color: 'bg-yellow-500', text: 'خامل' };
    }
  };

  const getLocationAge = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMins = Math.floor((now.getTime() - updateTime.getTime()) / 60000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    return `منذ ${diffHours} ساعة`;
  };

  const onlineDrivers = drivers.filter(d => getOnlineStatus(d).status !== 'offline');
  const offlineDrivers = drivers.filter(d => getOnlineStatus(d).status === 'offline');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-cairo">
                <Navigation className="h-6 w-6 text-primary" />
                خريطة تتبع السائقين المباشرة
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                مواقع السائقين في الوقت الفعلي على الخريطة
              </p>
            </div>
            <Button onClick={fetchDrivers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي السائقين</p>
                <p className="text-2xl font-bold font-cairo">{drivers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متصلين الآن</p>
                <p className="text-2xl font-bold font-cairo text-green-600">{onlineDrivers.length}</p>
              </div>
              <div className="h-8 w-8 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">غير متصلين</p>
                <p className="text-2xl font-bold font-cairo text-gray-600">{offlineDrivers.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <APIProvider apiKey="AIzaSyBXYvVWj5VpEKNJqYfYYz_vLJVJ8EKN2Hc">
              <Map
                defaultCenter={center}
                defaultZoom={zoom}
                mapId="driver-tracking-map"
                style={{ width: '100%', height: '100%' }}
              >
                {drivers.map((driver) => {
                  const status = getOnlineStatus(driver);
                  return (
                    <AdvancedMarker
                      key={driver.id}
                      position={{
                        lat: driver.current_latitude,
                        lng: driver.current_longitude
                      }}
                      onClick={() => setSelectedDriver(driver.id)}
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center shadow-lg border-2 border-white`}>
                          <Truck className="h-5 w-5 text-white" />
                        </div>
                        {status.status === 'online' && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white"></div>
                        )}
                      </div>

                      {selectedDriver === driver.id && (
                        <InfoWindow
                          position={{
                            lat: driver.current_latitude,
                            lng: driver.current_longitude
                          }}
                          onCloseClick={() => setSelectedDriver(null)}
                        >
                          <div className="p-2 min-w-[200px]" dir="rtl">
                            <h3 className="font-bold font-cairo text-lg mb-2">{driver.name}</h3>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">الحالة:</span>
                                <Badge className={status.color}>{status.text}</Badge>
                              </div>
                              
                              {driver.company_name && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">الشركة:</span>
                                  <span className="font-medium">{driver.company_name}</span>
                                </div>
                              )}
                              
                              {driver.vehicle_plate && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">رقم المركبة:</span>
                                  <span className="font-medium">{driver.vehicle_plate}</span>
                                </div>
                              )}
                              
                              {driver.vehicle_type && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">نوع المركبة:</span>
                                  <span className="font-medium">{driver.vehicle_type}</span>
                                </div>
                              )}
                              
                              {driver.phone && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">الهاتف:</span>
                                  <span className="font-medium">{driver.phone}</span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">آخر تحديث:</span>
                                <span className="font-medium">{getLocationAge(driver.last_location_update)}</span>
                              </div>
                            </div>

                            <Button
                              className="w-full mt-3"
                              size="sm"
                              onClick={() => {
                                const url = `https://www.google.com/maps/dir/?api=1&destination=${driver.current_latitude},${driver.current_longitude}`;
                                window.open(url, '_blank');
                              }}
                            >
                              <Navigation className="h-4 w-4 ml-2" />
                              الانتقال إلى الموقع
                            </Button>
                          </div>
                        </InfoWindow>
                      )}
                    </AdvancedMarker>
                  );
                })}
              </Map>
            </APIProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveDriverMap;
