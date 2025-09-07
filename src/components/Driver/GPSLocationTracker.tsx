import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Navigation, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface DriverProfile {
  id: string;
  name: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  is_online: boolean;
  tracking_enabled: boolean;
}

const GPSLocationTracker: React.FC = () => {
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const { user } = useAuth();
  const { toast } = useToast();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDriverProfile();
    checkGeolocationPermission();
    
    return () => {
      stopTracking();
    };
  }, []);

  const fetchDriverProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setDriver(data);
      setTracking(data.tracking_enabled && data.is_online);
      
      if (data.tracking_enabled && data.is_online) {
        startTracking();
      }
    } catch (error) {
      console.error('Error fetching driver profile:', error);
    }
  };

  const checkGeolocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);
        
        permission.addEventListener('change', () => {
          setPermissionStatus(permission.state);
        });
      } catch (error) {
        console.error('Error checking geolocation permission:', error);
      }
    }
  };

  const requestLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const updateDriverLocation = async (coords: GeolocationCoordinates) => {
    if (!driver) return;

    try {
      const { error } = await supabase.rpc('update_driver_current_location', {
        driver_id_param: driver.id,
        latitude_param: coords.latitude,
        longitude_param: coords.longitude,
        speed_param: coords.speed,
        heading_param: coords.heading,
        accuracy_param: coords.accuracy
      });

      if (error) throw error;

      setLocation(coords);
      setLastUpdate(new Date());
      
      // Update local driver state
      setDriver(prev => prev ? {
        ...prev,
        current_latitude: coords.latitude,
        current_longitude: coords.longitude,
        last_location_update: new Date().toISOString()
      } : null);

    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "خطأ في التحديث",
        description: "فشل في إرسال الموقع الحالي",
        variant: "destructive",
      });
    }
  };

  const startTracking = async () => {
    try {
      // Get initial position
      const position = await requestLocation();
      await updateDriverLocation(position.coords);
      
      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          updateDriverLocation(position.coords);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "خطأ في الموقع",
            description: "فشل في تحديد الموقع الحالي",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );

      // Send updates every 30 seconds
      intervalRef.current = setInterval(async () => {
        try {
          const position = await requestLocation();
          await updateDriverLocation(position.coords);
        } catch (error) {
          console.error('Error in periodic update:', error);
        }
      }, 30000);

      setTracking(true);
      
      // Update driver tracking status
      await supabase
        .from('drivers')
        .update({ 
          tracking_enabled: true, 
          is_online: true,
          last_ping: new Date().toISOString()
        })
        .eq('id', driver?.id);

      toast({
        title: "تم بدء التتبع",
        description: "سيتم إرسال موقعك للمسؤولين",
      });

    } catch (error) {
      console.error('Error starting tracking:', error);
      setPermissionStatus('denied');
      toast({
        title: "فشل في بدء التتبع",
        description: "تأكد من السماح لتطبيق الوصول للموقع",
        variant: "destructive",
      });
    }
  };

  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setTracking(false);
    
    if (driver) {
      // Update driver tracking status
      await supabase
        .from('drivers')
        .update({ 
          tracking_enabled: false, 
          is_online: false 
        })
        .eq('id', driver.id);
    }

    toast({
      title: "تم إيقاف التتبع",
      description: "لن يتم إرسال موقعك للمسؤولين",
    });
  };

  const toggleTracking = async () => {
    if (tracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          icon: <CheckCircle className="h-5 w-5 text-success" />,
          text: 'مُصرح',
          color: 'text-success'
        };
      case 'denied':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
          text: 'مرفوض',
          color: 'text-destructive'
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-warning" />,
          text: 'في الانتظار',
          color: 'text-warning'
        };
    }
  };

  const permissionInfo = getPermissionStatusInfo();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <Navigation className="h-5 w-5 ml-2" />
            تتبع الموقع GPS
          </CardTitle>
          <CardDescription>
            إدارة مشاركة موقعك الجغرافي مع المسؤولين
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3 space-x-reverse">
              {permissionInfo.icon}
              <div>
                <p className="font-semibold">صلاحية الوصول للموقع</p>
                <p className={`text-sm ${permissionInfo.color}`}>
                  {permissionInfo.text}
                </p>
              </div>
            </div>
            {permissionStatus === 'denied' && (
              <Button variant="outline" size="sm" onClick={checkGeolocationPermission}>
                إعادة المحاولة
              </Button>
            )}
          </div>

          {/* Tracking Control */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className={`w-3 h-3 rounded-full ${tracking ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
              <div>
                <p className="font-semibold">حالة التتبع</p>
                <p className="text-sm text-muted-foreground">
                  {tracking ? 'نشط - يتم إرسال الموقع' : 'متوقف'}
                </p>
              </div>
            </div>
            <Switch
              checked={tracking}
              onCheckedChange={toggleTracking}
              disabled={permissionStatus === 'denied'}
            />
          </div>

          {/* Current Location Info */}
          {location && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">خط العرض</p>
                  <p className="text-lg font-mono">{location.latitude.toFixed(6)}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">خط الطول</p>
                  <p className="text-lg font-mono">{location.longitude.toFixed(6)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {location.accuracy && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">دقة الموقع</p>
                    <p className="text-sm">{Math.round(location.accuracy)} متر</p>
                  </div>
                )}
                {location.speed && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">السرعة</p>
                    <p className="text-sm">{Math.round(location.speed * 3.6)} كم/س</p>
                  </div>
                )}
                {lastUpdate && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground">آخر تحديث</p>
                    <p className="text-sm">{formatTime(lastUpdate)}</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                <MapPin className="h-4 w-4 ml-2" />
                عرض على خرائط جوجل
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-semibold mb-2">تعليمات مهمة:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• تأكد من تشغيل GPS في جهازك</li>
              <li>• اسمح للتطبيق بالوصول للموقع عند الطلب</li>
              <li>• سيتم إرسال موقعك كل 30 ثانية أثناء التتبع</li>
              <li>• يمكن للمسؤولين رؤية موقعك فقط أثناء تشغيل التتبع</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GPSLocationTracker;