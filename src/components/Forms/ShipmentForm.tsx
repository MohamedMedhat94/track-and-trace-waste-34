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

interface ShipmentFormProps {
  onClose: () => void;
  editingShipment?: any;
}

const ShipmentForm: React.FC<ShipmentFormProps> = ({ onClose, editingShipment }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    shipment_number: editingShipment?.shipment_number || '',
    generator_company_id: editingShipment?.generator_company_id || '',
    transporter_company_id: editingShipment?.transporter_company_id || '',
    recycler_company_id: editingShipment?.recycler_company_id || '',
    driver_id: editingShipment?.driver_id || '',
    waste_type_id: editingShipment?.waste_type_id || '',
    waste_description: editingShipment?.waste_description || '',
    quantity: editingShipment?.quantity || '',
    packaging: editingShipment?.packaging || '',
    pickup_location: editingShipment?.pickup_location || '',
    delivery_location: editingShipment?.delivery_location || '',
    disposal_method: editingShipment?.disposal_method || '',
    pickup_date: editingShipment?.pickup_date ? new Date(editingShipment.pickup_date).toISOString().split('T')[0] : '',
    delivery_date: editingShipment?.delivery_date ? new Date(editingShipment.delivery_date).toISOString().split('T')[0] : '',
    driver_entry_type: editingShipment?.driver_entry_type || 'registered',
    manual_driver_name: editingShipment?.manual_driver_name || '',
    manual_vehicle_number: editingShipment?.manual_vehicle_number || ''
  });

  useEffect(() => {
    fetchCompanies();
    fetchDrivers();
    fetchWasteTypes();
    if (!editingShipment) {
      generateShipmentNumber();
    }
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('خطأ في جلب الشركات:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('خطأ في جلب السائقين:', error);
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
    setIsLoading(true);

    try {
      const shipmentData = {
        ...formData,
        quantity: parseFloat(formData.quantity) || 0,
        pickup_date: formData.pickup_date ? new Date(formData.pickup_date).toISOString() : null,
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        created_by: user?.id,
        // Only include driver_id if using registered driver
        driver_id: formData.driver_entry_type === 'registered' ? formData.driver_id : null,
      };

      if (editingShipment) {
        const { error } = await supabase
          .from('shipments')
          .update(shipmentData)
          .eq('id', editingShipment.id);

        if (error) throw error;

        toast({
          title: "تم تحديث الشحنة",
          description: "تم تحديث بيانات الشحنة بنجاح",
        });
      } else {
        const { error } = await supabase
          .from('shipments')
          .insert([shipmentData]);

        if (error) throw error;

        toast({
          title: "تم إنشاء الشحنة",
          description: "تم إنشاء الشحنة الجديدة بنجاح",
        });
      }

      onClose();
    } catch (error: any) {
      console.error('خطأ في حفظ الشحنة:', error);
      toast({
        title: "خطأ في حفظ الشحنة",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="font-cairo">
          {editingShipment ? 'تعديل الشحنة' : 'إنشاء شحنة جديدة'}
        </CardTitle>
        <CardDescription>
          {editingShipment ? 'تحديث بيانات الشحنة' : 'إدخال بيانات الشحنة الجديدة'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipment_number" className="font-cairo">رقم الشحنة</Label>
              <Input
                id="shipment_number"
                value={formData.shipment_number}
                onChange={(e) => handleInputChange('shipment_number', e.target.value)}
                required
                readOnly={!!editingShipment}
                className="bg-muted/20"
              />
            </div>

            <div>
              <Label htmlFor="quantity" className="font-cairo">الكمية (كغ)</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="generator_company_id" className="font-cairo">الشركة المولدة</Label>
              <Select
                value={formData.generator_company_id}
                onValueChange={(value) => handleInputChange('generator_company_id', value)}
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
              <Label htmlFor="transporter_company_id" className="font-cairo">شركة النقل</Label>
              <Select
                value={formData.transporter_company_id}
                onValueChange={(value) => handleInputChange('transporter_company_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر شركة النقل" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.type === 'transporter').map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recycler_company_id" className="font-cairo">شركة إعادة التدوير</Label>
              <Select
                value={formData.recycler_company_id}
                onValueChange={(value) => handleInputChange('recycler_company_id', value)}
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

          <div className="space-y-4">
            {/* Driver Entry Type Selection */}
            <div>
              <Label className="font-cairo">نوع إدخال السائق</Label>
              <Select
                value={formData.driver_entry_type}
                onValueChange={(value) => handleInputChange('driver_entry_type', value)}
              >
                <SelectTrigger>
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
              <div>
                <Label htmlFor="driver_id" className="font-cairo">اختيار السائق</Label>
                <Select
                  value={formData.driver_id}
                  onValueChange={(value) => handleInputChange('driver_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السائق" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Manual Driver Entry */}
            {formData.driver_entry_type === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manual_driver_name" className="font-cairo">اسم السائق</Label>
                  <Input
                    id="manual_driver_name"
                    value={formData.manual_driver_name}
                    onChange={(e) => handleInputChange('manual_driver_name', e.target.value)}
                    placeholder="أدخل اسم السائق"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="manual_vehicle_number" className="font-cairo">رقم المركبة</Label>
                  <Input
                    id="manual_vehicle_number"
                    value={formData.manual_vehicle_number}
                    onChange={(e) => handleInputChange('manual_vehicle_number', e.target.value)}
                    placeholder="أدخل رقم المركبة"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <div>

            <div>
              <Label htmlFor="waste_type_id" className="font-cairo">نوع النفايات</Label>
              <Select
                value={formData.waste_type_id}
                onValueChange={(value) => handleInputChange('waste_type_id', value)}
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
          </div>

          <div>
            <Label htmlFor="waste_description" className="font-cairo">وصف النفايات</Label>
            <Textarea
              id="waste_description"
              value={formData.waste_description}
              onChange={(e) => handleInputChange('waste_description', e.target.value)}
              placeholder="وصف تفصيلي لنوع النفايات"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location" className="font-cairo">موقع الاستلام</Label>
              <Input
                id="pickup_location"
                value={formData.pickup_location}
                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                placeholder="عنوان موقع استلام النفايات"
              />
            </div>

            <div>
              <Label htmlFor="delivery_location" className="font-cairo">موقع التسليم</Label>
              <Input
                id="delivery_location"
                value={formData.delivery_location}
                onChange={(e) => handleInputChange('delivery_location', e.target.value)}
                placeholder="عنوان موقع تسليم النفايات"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="packaging" className="font-cairo">نوع التعبئة</Label>
              <Select
                value={formData.packaging}
                onValueChange={(value) => handleInputChange('packaging', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع التعبئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="أكياس">أكياس</SelectItem>
                  <SelectItem value="حاويات">حاويات</SelectItem>
                  <SelectItem value="براميل">براميل</SelectItem>
                  <SelectItem value="صناديق">صناديق</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

          <div>
            <Label htmlFor="disposal_method" className="font-cairo">طريقة التخلص</Label>
            <Select
              value={formData.disposal_method}
              onValueChange={(value) => handleInputChange('disposal_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر طريقة التخلص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="إعادة تدوير">إعادة تدوير</SelectItem>
                <SelectItem value="معالجة حرارية">معالجة حرارية</SelectItem>
                <SelectItem value="دفن صحي">دفن صحي</SelectItem>
                <SelectItem value="معالجة كيميائية">معالجة كيميائية</SelectItem>
                <SelectItem value="معالجة بيولوجية">معالجة بيولوجية</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              {isLoading ? 'جاري الحفظ...' : (editingShipment ? 'تحديث الشحنة' : 'إنشاء الشحنة')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ShipmentForm;