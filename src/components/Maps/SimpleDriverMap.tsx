import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Navigation, Truck, MapPin, ExternalLink, Phone, Car } from 'lucide-react';

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

const SimpleDriverMap: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
    
    // Real-time subscription for driver updates
    const channel = supabase
      .channel('realtime-driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver update received:', payload);
          fetchDrivers();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Auto-refresh every 10 seconds for real-time feel
    const interval = setInterval(() => {
      fetchDrivers();
    }, 10000);

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
      setLastRefresh(new Date());
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
    if (!driver.last_location_update) return { status: 'offline', color: 'bg-destructive', text: 'غير متصل', badgeVariant: 'destructive' as const };
    
    const now = new Date();
    const updateTime = new Date(driver.last_location_update);
    const diffMins = Math.floor((now.getTime() - updateTime.getTime()) / 60000);
    
    if (diffMins > 10 || !driver.is_online) {
      return { status: 'offline', color: 'bg-destructive', text: 'غير متصل', badgeVariant: 'destructive' as const };
    } else if (diffMins <= 2) {
      return { status: 'online', color: 'bg-green-500', text: 'متصل الآن', badgeVariant: 'default' as const };
    } else {
      return { status: 'idle', color: 'bg-yellow-500', text: 'خامل', badgeVariant: 'secondary' as const };
    }
  };

  const getLocationAge = (timestamp: string) => {
    const now = new Date();
    const updateTime = new Date(timestamp);
    const diffMins = Math.floor((now.getTime() - updateTime.getTime()) / 60000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  };

  const openInGoogleMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&label=${encodeURIComponent(name)}`;
    window.open(url, '_blank');
  };

  const navigateToDriver = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const onlineDrivers = drivers.filter(d => getOnlineStatus(d).status === 'online');
  const idleDrivers = drivers.filter(d => getOnlineStatus(d).status === 'idle');
  const offlineDrivers = drivers.filter(d => getOnlineStatus(d).status === 'offline');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="mr-3">جاري تحميل مواقع السائقين...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 font-cairo">
                <Navigation className="h-6 w-6 text-primary" />
                تتبع السائقين المباشر
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        
        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متصلين الآن</p>
                <p className="text-2xl font-bold font-cairo text-green-600">{onlineDrivers.length}</p>
              </div>
              <div className="h-8 w-8 bg-green-500 rounded-full animate-pulse flex items-center justify-center">
                <div className="h-4 w-4 bg-white rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">خامل</p>
                <p className="text-2xl font-bold font-cairo text-yellow-600">{idleDrivers.length}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-white rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">غير متصلين</p>
                <p className="text-2xl font-bold font-cairo text-muted-foreground">{offlineDrivers.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Drivers */}
      {onlineDrivers.length > 0 && (
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-cairo flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              السائقين المتصلين ({onlineDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {onlineDrivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  status={getOnlineStatus(driver)}
                  locationAge={getLocationAge(driver.last_location_update)}
                  onOpenMap={() => openInGoogleMaps(driver.current_latitude, driver.current_longitude, driver.name)}
                  onNavigate={() => navigateToDriver(driver.current_latitude, driver.current_longitude)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Idle Drivers */}
      {idleDrivers.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-cairo flex items-center gap-2">
              <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
              السائقين الخاملين ({idleDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {idleDrivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  status={getOnlineStatus(driver)}
                  locationAge={getLocationAge(driver.last_location_update)}
                  onOpenMap={() => openInGoogleMaps(driver.current_latitude, driver.current_longitude, driver.name)}
                  onNavigate={() => navigateToDriver(driver.current_latitude, driver.current_longitude)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Drivers with Location */}
      {offlineDrivers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-cairo flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              السائقين غير المتصلين ({offlineDrivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {offlineDrivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  status={getOnlineStatus(driver)}
                  locationAge={getLocationAge(driver.last_location_update)}
                  onOpenMap={() => openInGoogleMaps(driver.current_latitude, driver.current_longitude, driver.name)}
                  onNavigate={() => navigateToDriver(driver.current_latitude, driver.current_longitude)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Drivers */}
      {drivers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد سائقين بموقع محدد</h3>
            <p className="text-muted-foreground text-center">
              يجب على السائقين تفعيل التتبع GPS من لوحة التحكم الخاصة بهم
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface DriverCardProps {
  driver: DriverLocation;
  status: { status: string; color: string; text: string; badgeVariant: 'default' | 'destructive' | 'secondary' };
  locationAge: string;
  onOpenMap: () => void;
  onNavigate: () => void;
}

const DriverCard: React.FC<DriverCardProps> = ({ driver, status, locationAge, onOpenMap, onNavigate }) => {
  return (
    <div className="p-4 border rounded-lg space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${status.color} flex items-center justify-center`}>
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold font-cairo">{driver.name}</h4>
            {driver.company_name && (
              <p className="text-xs text-muted-foreground">{driver.company_name}</p>
            )}
          </div>
        </div>
        <Badge variant={status.badgeVariant}>{status.text}</Badge>
      </div>

      <div className="space-y-1 text-sm">
        {driver.vehicle_plate && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4" />
            <span>{driver.vehicle_plate}</span>
            {driver.vehicle_type && <span>({driver.vehicle_type})</span>}
          </div>
        )}
        {driver.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <a href={`tel:${driver.phone}`} className="hover:text-primary">{driver.phone}</a>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="font-mono text-xs">
            {driver.current_latitude.toFixed(4)}, {driver.current_longitude.toFixed(4)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">آخر تحديث: {locationAge}</p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onOpenMap}>
          <ExternalLink className="h-4 w-4 ml-1" />
          عرض الموقع
        </Button>
        <Button size="sm" className="flex-1" onClick={onNavigate}>
          <Navigation className="h-4 w-4 ml-1" />
          انتقال
        </Button>
      </div>
    </div>
  );
};

export default SimpleDriverMap;
