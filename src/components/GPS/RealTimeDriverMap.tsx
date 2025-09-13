import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Clock, Truck, Users } from 'lucide-react';

interface DriverLocation {
  id: string;
  name: string;
  current_latitude: number;
  current_longitude: number;
  last_location_update: string;
  is_online: boolean;
  vehicle_type?: string;
  vehicle_plate?: string;
  last_ping?: string;
  assigned_vehicle_number?: string;
  speed?: number;
  heading?: number;
}

const RealTimeDriverMap: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
    setupRealtimeSubscription();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_drivers_for_tracking');

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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('driver-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver location updated:', payload);
          fetchDrivers(); // Refresh the list
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
    
    // Consider offline if no update in 10 minutes
    if (diffMins > 10 || !isOnline) {
      return { status: 'offline', color: 'bg-destructive', text: 'غير متصل' };
    } else if (diffMins <= 2) {
      return { status: 'online', color: 'bg-success', text: 'متصل' };
    } else {
      return { status: 'idle', color: 'bg-warning', text: 'خامل' };
    }
  };

  const openInMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const onlineDrivers = drivers.filter(driver => {
    const status = getOnlineStatus(driver.last_location_update, driver.is_online);
    return status.status !== 'offline';
  });

  const offlineDrivers = drivers.filter(driver => {
    const status = getOnlineStatus(driver.last_location_update, driver.is_online);
    return status.status === 'offline';
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
            <Clock className="h-8 w-8 text-muted-foreground ml-4" />
            <div>
              <p className="text-2xl font-bold">{offlineDrivers.length}</p>
              <p className="text-sm text-muted-foreground">غير متصلين</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Drivers */}
      {onlineDrivers.length > 0 && (
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
                return (
                  <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                      <p className="text-sm text-muted-foreground">السائق: {driver.name}</p>
                      <div className="flex items-center space-x-4 space-x-reverse text-xs text-muted-foreground mt-1">
                        <span>📍 {driver.current_latitude.toFixed(6)}, {driver.current_longitude.toFixed(6)}</span>
                        <span>🕒 {getLocationAge(driver.last_location_update)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openInMaps(driver.current_latitude, driver.current_longitude, driver.name)}
                      >
                        <MapPin className="h-4 w-4 ml-1" />
                        عرض على الخريطة
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Drivers */}
      {offlineDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-cairo">السائقون غير المتصلون</CardTitle>
            <CardDescription>
              السائقون الذين لم يرسلوا مواقعهم مؤخراً
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {offlineDrivers.map((driver) => {
                const status = getOnlineStatus(driver.last_location_update, driver.is_online);
                return (
                  <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg opacity-75">
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
                      <p className="text-sm text-muted-foreground">السائق: {driver.name}</p>
                      <p className="text-xs text-muted-foreground">
                        آخر اتصال: {getLocationAge(driver.last_location_update)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {drivers.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مواقع متاحة</h3>
            <p className="text-muted-foreground">
              لم يتم العثور على أي سائقين يرسلون مواقعهم حالياً
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeDriverMap;