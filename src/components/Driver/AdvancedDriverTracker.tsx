import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Clock, Truck, Users, Route, Eye } from 'lucide-react';

interface DriverLocation {
  id: string;
  name: string;
  email: string;
  current_latitude: number;
  current_longitude: number;
  last_location_update: string;
  is_online: boolean;
  assigned_vehicle_number?: string;
  route_history?: any;
}

interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  recorded_at: string;
  address?: string;
  location_type: string;
  notes?: string;
}

const AdvancedDriverTracker: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [driverRoute, setDriverRoute] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
    setupRealtimeSubscription();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .not('current_latitude', 'is', null)
        .not('current_longitude', 'is', null);

      if (error) throw error;
      setDrivers(data || []);
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

  const fetchDriverRoute = async (driverId: string) => {
    setRouteLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_route_history')
        .select('*')
        .eq('driver_id', driverId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setDriverRoute(data || []);
    } catch (error) {
      console.error('Error fetching driver route:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل مسار السائق",
        variant: "destructive",
      });
    } finally {
      setRouteLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('advanced-driver-tracking')
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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_route_history'
        },
        (payload) => {
          if (selectedDriver && payload.new.driver_id === selectedDriver) {
            fetchDriverRoute(selectedDriver);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getLocationAge = (lastUpdate: string) => {
    const now = new Date();
    const updateTime = new Date(lastUpdate);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    return `منذ ${diffHours} ساعة`;
  };

  const getOnlineStatus = (lastUpdate: string, isOnline: boolean) => {
    const now = new Date();
    const updateTime = new Date(lastUpdate);
    const diffMs = now.getTime() - updateTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins > 10 || !isOnline) {
      return { status: 'offline', color: 'bg-destructive', text: 'غير متصل' };
    } else if (diffMins <= 2) {
      return { status: 'online', color: 'bg-success', text: 'متصل' };
    } else {
      return { status: 'idle', color: 'bg-warning', text: 'خامل' };
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const showDriverRoute = (driverId: string) => {
    setSelectedDriver(driverId);
    fetchDriverRoute(driverId);
  };

  const onlineDrivers = drivers.filter(driver => {
    const status = getOnlineStatus(driver.last_location_update, driver.is_online);
    return status.status !== 'offline';
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-8 w-8 text-primary ml-4" />
            <div>
              <p className="text-2xl font-bold">{drivers.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي السائقين</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Navigation className="h-8 w-8 text-success ml-4" />
            <div>
              <p className="text-2xl font-bold">{onlineDrivers.length}</p>
              <p className="text-sm text-muted-foreground">متصلين حالياً</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <Route className="h-8 w-8 text-info ml-4" />
            <div>
              <p className="text-2xl font-bold">{driverRoute.length}</p>
              <p className="text-sm text-muted-foreground">نقاط المسار</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drivers List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">السائقون المتصلون</CardTitle>
            <CardDescription>
              السائقون الذين يرسلون مواقعهم حالياً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {onlineDrivers.map((driver) => {
                const status = getOnlineStatus(driver.last_location_update, driver.is_online);
                const isSelected = selectedDriver === driver.id;
                
                return (
                  <div 
                    key={driver.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 space-x-reverse mb-2">
                        <h3 className="font-semibold">{driver.name}</h3>
                        <Badge className={`${status.color} text-white`}>
                          {status.text}
                        </Badge>
                        {driver.assigned_vehicle_number && (
                          <Badge variant="outline">
                            <Truck className="h-3 w-3 ml-1" />
                            {driver.assigned_vehicle_number}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{driver.email}</p>
                      <div className="flex items-center space-x-4 space-x-reverse text-xs text-muted-foreground mt-1">
                        <span>📍 {driver.current_latitude.toFixed(6)}, {driver.current_longitude.toFixed(6)}</span>
                        <span>🕒 {getLocationAge(driver.last_location_update)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => showDriverRoute(driver.id)}
                      >
                        <Route className="h-4 w-4 ml-1" />
                        {isSelected ? 'مُحدد' : 'عرض المسار'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInMaps(driver.current_latitude, driver.current_longitude)}
                      >
                        <MapPin className="h-4 w-4 ml-1" />
                        خريطة
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {onlineDrivers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-cairo">لا توجد سائقين متصلين حالياً</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Driver Route */}
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">
              {selectedDriver ? 'مسار السائق المحدد' : 'اختر سائق لعرض مساره'}
            </CardTitle>
            <CardDescription>
              {selectedDriver ? 'آخر 50 نقطة في مسار السائق' : 'انقر على "عرض المسار" لأي سائق'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDriver ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-cairo">
                  اختر سائق من القائمة لعرض مساره التفصيلي
                </p>
              </div>
            ) : routeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {driverRoute.map((point, index) => (
                  <div key={point.id} className="flex items-start space-x-3 space-x-reverse p-3 border rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 space-x-reverse mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {point.location_type === 'pickup' ? 'نقطة الاستلام' : 
                           point.location_type === 'delivery' ? 'نقطة التسليم' : 'نقطة مرور'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getLocationAge(point.recorded_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        📍 {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                      </p>
                      {point.address && (
                        <p className="text-xs text-muted-foreground mt-1">{point.address}</p>
                      )}
                      {point.notes && (
                        <p className="text-xs text-info mt-1">💬 {point.notes}</p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-6 px-2 text-xs"
                        onClick={() => openInMaps(point.latitude, point.longitude)}
                      >
                        <MapPin className="h-3 w-3 ml-1" />
                        فتح في الخريطة
                      </Button>
                    </div>
                  </div>
                ))}
                
                {driverRoute.length === 0 && (
                  <div className="text-center py-8">
                    <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-cairo">لا توجد نقاط مسار لهذا السائق</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedDriverTracker;