import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface DriverShipmentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const DriverShipmentForm: React.FC<DriverShipmentFormProps> = ({ onClose, onSuccess }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [driverInfo, setDriverInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    shipment_number: '',
    generator_company_id: '',
    recycler_company_id: '',
    waste_type_id: '',
    waste_description: '',
    quantity: '',
    packaging: '',
    pickup_location: '',
    delivery_location: '',
    disposal_method: '',
    pickup_date: '',
    delivery_date: ''
  });

  useEffect(() => {
    initializeForm();
  }, [user]);

  const initializeForm = async () => {
    try {
      setIsLoading(true);
      
      // Get driver info with transport company
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, transport_company_id, name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (driverError) throw driverError;

      if (!driver) {
        toast({
          title: "خطأ",
          description: "لم يتم العثور على معلومات السائق. يرجى التواصل مع المسؤول.",
          variant: "destructive",
        });
        onClose();
        return;
      }

      if (!driver.transport_company_id) {
        toast({
          title: "خطأ",
          description: "لم يتم ربط حسابك بشركة نقل. يرجى التواصل مع المسؤول.",
          variant: "destructive",
        });
        onClose();
        return;
      }

      setDriverInfo(driver);
      await Promise.all([
        fetchCompanies(),
        fetchWasteTypes()
      ]);
      generateShipmentNumber();
    } catch (error: any) {
      console.error('خطأ في تهيئة النموذج:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.rpc('get_companies_for_selection');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('خطأ في جلب الشركات:', error);
    }
  };

  const fetchWasteTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('waste_types')
        .select('*')
        .order('name');
      if (error) throw error;
      setWasteTypes(data || []);
    } catch (error) {
      console.error('خطأ في جلب أنواع النفايات:', error);
    }
  };

  const generateShipmentNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      shipment_number: `SH${timestamp}${randomNum}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverInfo) {
      toast({
        title: "خطأ",
        description: "معلومات السائق غير متوفرة",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const shipmentData = {
        shipment_number: formData.shipment_number,
        generator_company_id: formData.generator_company_id,
        transporter_company_id: driverInfo.transport_company_id, // Auto-filled from driver
        recycler_company_id: formData.recycler_company_id,
        driver_id: driverInfo.id, // Auto-filled from driver
        waste_type_id: formData.waste_type_id,
        waste_description: formData.waste_description,
        quantity: parseFloat(formData.quantity) || 0,
        packaging: formData.packaging,
        pickup_location: formData.pickup_location,
        delivery_location: formData.delivery_location,
        disposal_method: formData.disposal_method,
        pickup_date: formData.pickup_date ? new Date(formData.pickup_date).toISOString() : null,
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        created_by: user?.id,
        status: 'pending',
        driver_entry_type: 'registered'
      };

      console.log('DriverShipmentForm: Creating shipment:', {
        shipment_number: shipmentData.shipment_number,
        driver_id: shipmentData.driver_id,
        transport_company_id: shipmentData.transporter_company_id,
        generator: shipmentData.generator_company_id,
        recycler: shipmentData.recycler_company_id
      });

      const { data, error } = await supabase
        .from('shipments')
        .insert([shipmentData])
        .select();

      if (error) {
        console.error('خطأ في إنشاء الشحنة:', error);
        throw error;
      }

      console.log('DriverShipmentForm: Shipment created successfully:', data);

      toast({
        title: "تم إنشاء الشحنة بنجاح",
        description: `رقم الشحنة: ${formData.shipment_number}`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('خطأ في حفظ الشحنة:', error);
      toast({
        title: "خطأ في إنشاء الشحنة",
        description: error.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && !formData.shipment_number) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="font-cairo">إنشاء شحنة جديدة</CardTitle>
        <CardDescription>
          إدخال بيانات الشحنة - السائق: {driverInfo?.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment Number & Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipment_number" className="font-cairo">رقم الشحنة</Label>
              <Input
                id="shipment_number"
                value={formData.shipment_number}
                readOnly
                className="bg-muted/20"
              />
            </div>

            <div>
              <Label htmlFor="quantity" className="font-cairo">الكمية (كغ) *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                required
                placeholder="أدخل الكمية"
              />
            </div>
          </div>

          {/* Generator & Recycler Companies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="generator_company_id" className="font-cairo">الشركة المولدة *</Label>
              <Select
                value={formData.generator_company_id}
                onValueChange={(value) => handleInputChange('generator_company_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الشركة المولدة" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.type === 'generator').map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recycler_company_id" className="font-cairo">شركة إعادة التدوير *</Label>
              <Select
                value={formData.recycler_company_id}
                onValueChange={(value) => handleInputChange('recycler_company_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر شركة إعادة التدوير" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.type === 'recycler').map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Waste Type */}
          <div>
            <Label htmlFor="waste_type_id" className="font-cairo">نوع النفايات *</Label>
            <Select
              value={formData.waste_type_id}
              onValueChange={(value) => handleInputChange('waste_type_id', value)}
              required
            >
              <SelectTrigger>
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

          {/* Waste Description */}
          <div>
            <Label htmlFor="waste_description" className="font-cairo">وصف النفايات</Label>
            <Textarea
              id="waste_description"
              value={formData.waste_description}
              onChange={(e) => handleInputChange('waste_description', e.target.value)}
              placeholder="وصف تفصيلي لنوع النفايات (اختياري)"
              rows={3}
            />
          </div>

          {/* Pickup & Delivery Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location" className="font-cairo">موقع الاستلام *</Label>
              <Input
                id="pickup_location"
                value={formData.pickup_location}
                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                placeholder="عنوان موقع استلام النفايات"
                required
              />
            </div>

            <div>
              <Label htmlFor="delivery_location" className="font-cairo">موقع التسليم *</Label>
              <Input
                id="delivery_location"
                value={formData.delivery_location}
                onChange={(e) => handleInputChange('delivery_location', e.target.value)}
                placeholder="عنوان موقع تسليم النفايات"
                required
              />
            </div>
          </div>

          {/* Pickup & Delivery Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_date" className="font-cairo">تاريخ الاستلام</Label>
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => handleInputChange('pickup_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="delivery_date" className="font-cairo">تاريخ التسليم المتوقع</Label>
              <Input
                id="delivery_date"
                type="date"
                value={formData.delivery_date}
                onChange={(e) => handleInputChange('delivery_date', e.target.value)}
              />
            </div>
          </div>

          {/* Packaging & Disposal Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="packaging" className="font-cairo">نوع التعبئة</Label>
              <Input
                id="packaging"
                value={formData.packaging}
                onChange={(e) => handleInputChange('packaging', e.target.value)}
                placeholder="مثال: أكياس، حاويات، براميل"
              />
            </div>

            <div>
              <Label htmlFor="disposal_method" className="font-cairo">طريقة التخلص</Label>
              <Input
                id="disposal_method"
                value={formData.disposal_method}
                onChange={(e) => handleInputChange('disposal_method', e.target.value)}
                placeholder="مثال: إعادة تدوير، معالجة، دفن آمن"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                'إنشاء الشحنة'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default DriverShipmentForm;
