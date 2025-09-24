import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Package, Truck, Building2, MapPin, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useButtonValidation } from '@/hooks/useButtonValidation';
import { cn } from '@/lib/utils';

interface Company {
  id: string;
  name: string;
  type: string;
  address?: string;
  location_address?: string;
  category_display_name?: string;
}

interface WasteType {
  id: string;
  name: string;
  description: string;
}

interface Driver {
  id: string;
  name: string;
  vehicle_type?: string;
  vehicle_plate?: string;
}

const CreateShipment: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { validateAndExecute } = useButtonValidation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [pickupDate, setPickupDate] = useState<Date>();
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    waste_type_id: '',
    generator_company_id: '',
    transporter_company_id: '',
    recycler_company_id: '',
    driver_id: '',
    quantity: '',
    pickup_location: '',
    delivery_location: '',
    notes: '',
    pickup_latitude: '',
    pickup_longitude: '',
    delivery_latitude: '',
    delivery_longitude: '',
    driver_entry_type: 'manual',
    manual_driver_name: '',
    manual_vehicle_number: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscriptions for companies, drivers, and waste types
  useEffect(() => {
    console.log('Setting up CreateShipment real-time subscriptions');
    const channel = supabase
      .channel('create-shipment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        (payload) => {
          console.log('Company change detected:', payload);
          fetchData(); // Remove setTimeout for immediate update
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers'
        },
        (payload) => {
          console.log('Driver change detected:', payload);
          fetchData(); // Remove setTimeout for immediate update
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_types'
        },
        (payload) => {
          console.log('Waste type change detected:', payload);
          fetchData(); // Remove setTimeout for immediate update
        }
      )
      .subscribe((status) => {
        console.log('CreateShipment subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .rpc('get_companies_for_selection');

      if (companiesError) throw companiesError;

      // Fetch waste types
      const { data: wasteTypesData, error: wasteTypesError } = await supabase
        .from('waste_types')
        .select('*')
        .order('name');

      if (wasteTypesError) throw wasteTypesError;

      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .rpc('get_drivers_for_selection');

      if (driversError) throw driversError;

      setCompanies(companiesData || []);
      setWasteTypes(wasteTypesData || []);
      setDrivers(driversData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل البيانات المطلوبة",
        variant: "destructive",
      });
    }
  };

  const generateShipmentNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SH${year}${month}${day}${random}`;
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            pickup_latitude: position.coords.latitude.toString(),
            pickup_longitude: position.coords.longitude.toString()
          });
          toast({
            title: "تم تحديد الموقع بنجاح",
            description: "تم حفظ إحداثيات موقع الاستلام الحالي",
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "خطأ في تحديد الموقع",
            description: "لا يمكن الوصول إلى موقعك الحالي",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "الموقع غير مدعوم",
        description: "متصفحك لا يدعم خدمة تحديد المواقع",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation logic
    const isDriverRequired = formData.driver_entry_type === 'registered' ? !formData.driver_id : 
      (!formData.manual_driver_name || !formData.manual_vehicle_number);
    
    if (!formData.waste_type_id || !formData.generator_company_id || 
        !formData.transporter_company_id || !formData.recycler_company_id || 
        !formData.quantity || !pickupDate || isDriverRequired) {
      toast({
        title: "خطأ في الإدخال",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const action = async () => {
      const shipmentNumber = generateShipmentNumber();
      
      const shipmentData = {
        shipment_number: shipmentNumber,
        waste_type_id: formData.waste_type_id,
        generator_company_id: formData.generator_company_id,
        transporter_company_id: formData.transporter_company_id,
        recycler_company_id: formData.recycler_company_id,
        driver_id: formData.driver_entry_type === 'registered' ? formData.driver_id : null,
        driver_entry_type: formData.driver_entry_type,
        manual_driver_name: formData.driver_entry_type === 'manual' ? formData.manual_driver_name : null,
        manual_vehicle_number: formData.driver_entry_type === 'manual' ? formData.manual_vehicle_number : null,
        quantity: parseFloat(formData.quantity),
        pickup_date: pickupDate?.toISOString(),
        delivery_date: deliveryDate?.toISOString(),
        pickup_location: formData.pickup_location,
        delivery_location: formData.delivery_location,
        status: 'pending',
        created_by: user?.id,
        ...(formData.pickup_latitude && formData.pickup_longitude && {
          pickup_latitude: parseFloat(formData.pickup_latitude),
          pickup_longitude: parseFloat(formData.pickup_longitude)
        }),
        ...(formData.delivery_latitude && formData.delivery_longitude && {
          delivery_latitude: parseFloat(formData.delivery_latitude),
          delivery_longitude: parseFloat(formData.delivery_longitude)
        })
      };
      
      const { error } = await supabase
        .from('shipments')
        .insert([shipmentData]);

      if (error) throw error;

      // Update driver location if GPS coordinates are available
      if (formData.pickup_latitude && formData.pickup_longitude && formData.driver_id) {
        await supabase.rpc('update_driver_location', {
          driver_id_param: formData.driver_id,
          latitude_param: parseFloat(formData.pickup_latitude),
          longitude_param: parseFloat(formData.pickup_longitude)
        });
      }

      // Play success sound
      playNotificationSound();

      // Reset form
      setFormData({
        waste_type_id: '',
        generator_company_id: '',
        transporter_company_id: '',
        recycler_company_id: '',
        driver_id: '',
        quantity: '',
        pickup_location: '',
        delivery_location: '',
        notes: '',
        pickup_latitude: '',
        pickup_longitude: '',
        delivery_latitude: '',
        delivery_longitude: '',
        driver_entry_type: 'registered',
        manual_driver_name: '',
        manual_vehicle_number: ''
      });
      setPickupDate(undefined);
      setDeliveryDate(undefined);
      
      return shipmentNumber;
    };

    setLoading(true);
    const result = await validateAndExecute(
      'create_shipment',
      action,
      `تم إنشاء الشحنة بنجاح`
    );
    setLoading(false);
  };

  const playNotificationSound = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuZ3/LCOS0FJHzJ8N2PPwoRXbTn7KpXFAlCm+H0xmkgBjuY3vLMey4FJHzK8N2PPgkTXLPm7KtYE6y'); 
    audio.play().catch(() => console.log('Could not play notification sound'));
  };

  const getCompaniesByType = (type: string) => {
    return companies.filter(company => company.type === type);
  };

  const getDriversByCompany = (companyId: string) => {
    // Since we only have basic driver info, return all drivers
    return drivers;
  };

  // Update available drivers when transporter company changes
  const handleTransporterChange = (companyId: string) => {
    setFormData({ ...formData, transporter_company_id: companyId, driver_id: '', manual_driver_name: '', manual_vehicle_number: '' });
    setAvailableDrivers(getDriversByCompany(companyId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-cairo">إنشاء شحنة جديدة</h1>
          <p className="text-muted-foreground">
            إضافة شحنة نفايات جديدة للنظام
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center font-cairo"
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <Package className="h-5 w-5 ml-2" />
            تفاصيل الشحنة
          </CardTitle>
          <CardDescription>
            املأ جميع البيانات المطلوبة لإنشاء الشحنة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Waste Type */}
              <div className="space-y-2">
                <Label htmlFor="waste-type" className="font-cairo">نوع النفايات *</Label>
                <Select 
                  value={formData.waste_type_id} 
                  onValueChange={(value) => setFormData({ ...formData, waste_type_id: value })}
                >
                  <SelectTrigger className="font-cairo">
                    <SelectValue placeholder="اختر نوع النفايات" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity" className="font-cairo">الكمية (كيلوجرام) *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="أدخل الكمية"
                  className="font-cairo"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Generator Company */}
              <div className="space-y-2">
                <Label className="font-cairo flex items-center">
                  <Building2 className="h-4 w-4 ml-2" />
                  الشركة المولدة *
                </Label>
                <Select 
                  value={formData.generator_company_id} 
                  onValueChange={(value) => setFormData({ ...formData, generator_company_id: value })}
                >
                  <SelectTrigger className="font-cairo">
                    <SelectValue placeholder="اختر الشركة المولدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompaniesByType('generator').map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transporter Company */}
              <div className="space-y-2">
                <Label className="font-cairo flex items-center">
                  <Truck className="h-4 w-4 ml-2" />
                  شركة النقل *
                </Label>
                 <Select 
                   value={formData.transporter_company_id} 
                   onValueChange={handleTransporterChange}
                 >
                  <SelectTrigger className="font-cairo">
                    <SelectValue placeholder="اختر شركة النقل" />
                  </SelectTrigger>
                   <SelectContent>
                     {getCompaniesByType('transporter').map((company) => (
                       <SelectItem key={company.id} value={company.id}>
                         {company.name} ({company.category_display_name || 'شركة نقل'})
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
              </div>

              {/* Recycler Company */}
              <div className="space-y-2">
                <Label className="font-cairo flex items-center">
                  <Building2 className="h-4 w-4 ml-2" />
                  شركة إعادة التدوير *
                </Label>
                <Select 
                  value={formData.recycler_company_id} 
                  onValueChange={(value) => setFormData({ ...formData, recycler_company_id: value })}
                >
                  <SelectTrigger className="font-cairo">
                    <SelectValue placeholder="اختر شركة إعادة التدوير" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCompaniesByType('recycler').map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
               </div>
             </div>

              {/* Driver Entry Type and Selection */}
              {formData.transporter_company_id && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-cairo flex items-center">
                      <Truck className="h-4 w-4 ml-2" />
                      نوع إدخال السائق *
                    </Label>
                    <Select 
                      value={formData.driver_entry_type} 
                      onValueChange={(value) => setFormData({ ...formData, driver_entry_type: value, driver_id: '', manual_driver_name: '', manual_vehicle_number: '' })}
                    >
                      <SelectTrigger className="font-cairo">
                        <SelectValue placeholder="اختر نوع الإدخال" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">سائق مسجل في النظام</SelectItem>
                        <SelectItem value="manual">إدخال السائق يدوياً</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Registered Driver Selection */}
                  {formData.driver_entry_type === 'registered' && (
                    <div className="space-y-2">
                      <Label className="font-cairo">اختيار السائق *</Label>
                      <Select 
                        value={formData.driver_id} 
                        onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                      >
                        <SelectTrigger className="font-cairo">
                          <SelectValue placeholder="اختر السائق المناسب" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDrivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              <div className="flex justify-between items-center w-full">
                                <span>{driver.name}</span>
                                <div className="text-xs text-muted-foreground mr-2">
                                  {driver.vehicle_type || 'غير محدد'} {driver.vehicle_plate ? `| ${driver.vehicle_plate}` : ''}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableDrivers.length === 0 && (
                        <p className="text-sm text-muted-foreground font-cairo">
                          لا توجد سائقين متاحين لهذه الشركة. يمكنك إضافة سائق يدوياً أو تسجيل سائقين جدد.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual Driver Entry */}
                  {formData.driver_entry_type === 'manual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="manual_driver_name" className="font-cairo">اسم السائق *</Label>
                        <Input
                          id="manual_driver_name"
                          value={formData.manual_driver_name}
                          onChange={(e) => setFormData({ ...formData, manual_driver_name: e.target.value })}
                          placeholder="أدخل اسم السائق"
                          className="font-cairo"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manual_vehicle_number" className="font-cairo">رقم المركبة *</Label>
                        <Input
                          id="manual_vehicle_number"
                          value={formData.manual_vehicle_number}
                          onChange={(e) => setFormData({ ...formData, manual_vehicle_number: e.target.value })}
                          placeholder="أدخل رقم المركبة أو العربة"
                          className="font-cairo"
                          required
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <p className="text-sm text-amber-600 font-cairo bg-amber-50 p-2 rounded-md">
                          📝 ملاحظة: عند إدخال السائق يدوياً، لن يكون هناك تتبع GPS للسائق أو المركبة
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup Date */}
              <div className="space-y-2">
                <Label className="font-cairo">تاريخ الاستلام *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-cairo",
                        !pickupDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, "dd/MM/yyyy", { locale: ar }) : "اختر تاريخ الاستلام"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pickupDate}
                      onSelect={setPickupDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label className="font-cairo">تاريخ التسليم المتوقع</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-right font-cairo",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="ml-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "dd/MM/yyyy", { locale: ar }) : "اختر تاريخ التسليم"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup Location */}
              <div className="space-y-2">
                <Label htmlFor="pickup-location" className="font-cairo">موقع الاستلام</Label>
                <div className="flex space-x-2 space-x-reverse">
                  <Input
                    id="pickup-location"
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    placeholder="أدخل موقع الاستلام"
                    className="font-cairo flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={getCurrentLocation}
                    title="تحديد موقعي الحالي"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                {formData.pickup_latitude && formData.pickup_longitude && (
                  <p className="text-xs text-green-600">
                    📍 تم تسجيل الإحداثيات: {parseFloat(formData.pickup_latitude).toFixed(6)}, {parseFloat(formData.pickup_longitude).toFixed(6)}
                  </p>
                )}
              </div>

              {/* Delivery Location */}
              <div className="space-y-2">
                <Label htmlFor="delivery-location" className="font-cairo">موقع التسليم</Label>
                <Input
                  id="delivery-location"
                  value={formData.delivery_location}
                  onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                  placeholder="أدخل موقع التسليم"
                  className="font-cairo"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-cairo">ملاحظات إضافية</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className="font-cairo"
              />
            </div>

            <div className="flex justify-end space-x-4 space-x-reverse">
              <Button type="button" variant="outline" className="font-cairo">
                إلغاء
              </Button>
              <Button type="submit" disabled={loading} className="font-cairo">
                {loading ? 'جاري الإنشاء...' : 'إنشاء الشحنة'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateShipment;