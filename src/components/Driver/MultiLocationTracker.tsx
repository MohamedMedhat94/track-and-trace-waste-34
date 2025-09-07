import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Trash2, Navigation, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface LocationPoint {
  id?: string;
  latitude: number;
  longitude: number;
  address?: string;
  location_type: string;
  recorded_at?: string;
  notes?: string;
}

interface MultiLocationTrackerProps {
  driverId: string;
  shipmentId?: string;
}

const MultiLocationTracker: React.FC<MultiLocationTrackerProps> = ({
  driverId,
  shipmentId
}) => {
  const [locations, setLocations] = useState<LocationPoint[]>([]);
  const [newLocation, setNewLocation] = useState<LocationPoint>({
    latitude: 0,
    longitude: 0,
    address: '',
    location_type: 'waypoint',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  useEffect(() => {
    fetchLocationHistory();
    getCurrentLocation();
  }, [driverId]);

  const fetchLocationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_route_history')
        .select('*')
        .eq('driver_id', driverId)
        .order('recorded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching location history:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition(position);
          setNewLocation(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const addLocationPoint = async () => {
    if (!newLocation.latitude || !newLocation.longitude) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى إدخال الإحداثيات على الأقل",
        variant: "destructive",
      });
      return;
    }

    const action = async () => {
      const { error } = await supabase.rpc('add_driver_location_point', {
        driver_id_param: driverId,
        latitude_param: parseFloat(newLocation.latitude.toString()),
        longitude_param: parseFloat(newLocation.longitude.toString()),
        address_param: newLocation.address || 'غير محدد',
        location_type_param: newLocation.location_type || 'waypoint',
        shipment_id_param: shipmentId || null,
        notes_param: newLocation.notes || null
      });

      if (error) throw error;

      // Reset form
      setNewLocation({
        latitude: 0,
        longitude: 0,
        address: '',
        location_type: 'waypoint',
        notes: ''
      });
      
      await fetchLocationHistory();
      return { success: true };
    };

    await validateAndExecute(
      'add_location_point',
      action,
      'تم إضافة نقطة الموقع الجديدة بنجاح'
    );
  };

  const useCurrentLocation = () => {
    if (currentPosition) {
      setNewLocation(prev => ({
        ...prev,
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude
      }));
    } else {
      getCurrentLocation();
    }
  };

  const openLocationInMaps = (location: LocationPoint) => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const getLocationTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'pickup': 'نقطة الاستلام',
      'delivery': 'نقطة التسليم',
      'waypoint': 'نقطة مرور',
      'stop': 'توقف',
      'checkpoint': 'نقطة تفتيش'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Add New Location */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <Plus className="h-5 w-5 ml-2" />
            إضافة موقع جديد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>خط العرض</Label>
              <Input
                type="number"
                step="any"
                value={newLocation.latitude}
                onChange={(e) => setNewLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
                placeholder="مثال: 30.0444"
              />
            </div>
            
            <div className="space-y-2">
              <Label>خط الطول</Label>
              <Input
                type="number"
                step="any"
                value={newLocation.longitude}
                onChange={(e) => setNewLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                placeholder="مثال: 31.2357"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>العنوان (اختياري)</Label>
            <Input
              value={newLocation.address}
              onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
              placeholder="العنوان التفصيلي للموقع"
            />
          </div>

          <div className="space-y-2">
            <Label>نوع الموقع</Label>
            <Select 
              value={newLocation.location_type} 
              onValueChange={(value) => setNewLocation(prev => ({ ...prev, location_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">نقطة الاستلام</SelectItem>
                <SelectItem value="delivery">نقطة التسليم</SelectItem>
                <SelectItem value="waypoint">نقطة مرور</SelectItem>
                <SelectItem value="stop">توقف</SelectItem>
                <SelectItem value="checkpoint">نقطة تفتيش</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={newLocation.notes}
              onChange={(e) => setNewLocation(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="أي ملاحظات إضافية حول هذا الموقع"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={useCurrentLocation} variant="outline" className="flex-1">
              <MapPin className="h-4 w-4 ml-2" />
              استخدام الموقع الحالي
            </Button>
            <Button onClick={addLocationPoint} disabled={loading} className="flex-1">
              <Plus className="h-4 w-4 ml-2" />
              إضافة الموقع
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location History */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <MapPin className="h-5 w-5 ml-2" />
            سجل المواقع ({locations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              لا توجد مواقع مسجلة بعد
            </p>
          ) : (
            <div className="space-y-3">
              {locations.map((location, index) => (
                <div
                  key={location.id || index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {getLocationTypeLabel(location.location_type)}
                      </span>
                      {location.recorded_at && (
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 ml-1" />
                          {new Date(location.recorded_at).toLocaleString('ar-SA')}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </div>
                    
                    {location.address && (
                      <div className="text-sm">📍 {location.address}</div>
                    )}
                    
                    {location.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        💬 {location.notes}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openLocationInMaps(location)}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiLocationTracker;