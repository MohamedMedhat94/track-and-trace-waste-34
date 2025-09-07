import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Building2, Truck, User, MapPin, Calendar, Weight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import StatusTracker from '@/components/Shipment/StatusTracker';
import ShipmentApprovalPanel from '@/components/Shipment/ShipmentApprovalPanel';
import DriverTracker from '@/components/Driver/DriverTracker';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface ShipmentDetails {
  id: string;
  shipment_number: string;
  status: string;
  quantity: number;
  pickup_date: string;
  delivery_date?: string;
  pickup_location?: string;
  delivery_location?: string;
  created_at: string;
  status_history: any[] | null;
  // Approval fields
  generator_approval_status?: string;
  recycler_approval_status?: string;
  generator_approved_at?: string;
  recycler_approved_at?: string;
  generator_approved_by?: string;
  recycler_approved_by?: string;
  generator_rejection_reason?: string;
  recycler_rejection_reason?: string;
  auto_approval_deadline?: string;
  overall_approval_status?: string;
  generator_company: {
    id: string;
    name: string;
    address?: string;
  };
  transporter_company: {
    id: string;
    name: string;
    address?: string;
  };
  recycler_company: {
    id: string;
    name: string;
    address?: string;
  };
  waste_type: {
    id: string;
    name: string;
    description?: string;
  };
  driver_id?: string;
}

const ShipmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<ShipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { validateAndExecute } = useButtonValidation();

  useEffect(() => {
    if (id) {
      fetchShipmentDetails();
    }
  }, [id]);

  const fetchShipmentDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!generator_company_id(id, name, address),
          transporter_company:companies!transporter_company_id(id, name, address),
          recycler_company:companies!recycler_company_id(id, name, address),
          waste_type:waste_types(id, name, description)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Ensure status_history is an array
      const shipmentData = {
        ...data,
        status_history: Array.isArray(data.status_history) ? data.status_history : []
      };
      setShipment(shipmentData);
    } catch (error) {
      console.error('Error fetching shipment details:', error);
      toast({
        title: "خطأ في تحميل التفاصيل",
        description: "لا يمكن تحميل تفاصيل الشحنة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    const action = async () => {
      if (!shipment) return;
      
      // Directly generate PDF using the same logic as PDFGenerator
      try {
        const { data: shipmentData, error } = await supabase
          .from('shipments')
          .select(`
            *,
            generator_company:companies!generator_company_id(
              id, name, address, phone, tax_id, commercial_reg_no, 
              environmental_approval_no, operating_license_no, 
              facility_reg_no, registered_activity
            ),
            transporter_company:companies!transporter_company_id(
              id, name, address, phone, tax_id, commercial_reg_no,
              environmental_approval_no, operating_license_no,
              facility_reg_no, registered_activity
            ),
            recycler_company:companies!recycler_company_id(
              id, name, address, phone, tax_id, commercial_reg_no,
              environmental_approval_no, operating_license_no,
              facility_reg_no, registered_activity
            ),
            waste_type:waste_types(id, name, description)
          `)
          .eq('id', shipment.id)
          .single();

        if (error) throw error;

        const pdfData = {
          shipmentNumber: shipmentData.shipment_number,
          generator: {
            name: shipmentData.generator_company?.name || 'غير محدد',
            taxId: shipmentData.generator_company?.tax_id ? `ض.ر: ${shipmentData.generator_company.tax_id}` : 'غير متوفر',
            commercialRegNo: shipmentData.generator_company?.commercial_reg_no ? `س.ت: ${shipmentData.generator_company.commercial_reg_no}` : 'غير متوفر',
            address: shipmentData.generator_company?.address || 'غير متوفر',
            phone: shipmentData.generator_company?.phone || 'غير متوفر',
            environmentalApproval: shipmentData.generator_company?.environmental_approval_no ? `م.ب: ${shipmentData.generator_company.environmental_approval_no}` : 'غير متوفر',
            operatingLicense: shipmentData.generator_company?.operating_license_no ? `ر.ت: ${shipmentData.generator_company.operating_license_no}` : 'غير متوفر',
            facilityRegNo: shipmentData.generator_company?.facility_reg_no ? `م.م: ${shipmentData.generator_company.facility_reg_no}` : 'غير متوفر',
            registeredActivity: shipmentData.generator_company?.registered_activity || 'غير متوفر'
          },
          transporter: {
            name: shipmentData.transporter_company?.name || 'غير محدد',
            taxId: shipmentData.transporter_company?.tax_id ? `ض.ر: ${shipmentData.transporter_company.tax_id}` : 'غير متوفر',
            commercialRegNo: shipmentData.transporter_company?.commercial_reg_no ? `س.ت: ${shipmentData.transporter_company.commercial_reg_no}` : 'غير متوفر',
            address: shipmentData.transporter_company?.address || 'غير متوفر',
            phone: shipmentData.transporter_company?.phone || 'غير متوفر',
            environmentalApproval: shipmentData.transporter_company?.environmental_approval_no ? `م.ب: ${shipmentData.transporter_company.environmental_approval_no}` : 'غير متوفر',
            operatingLicense: shipmentData.transporter_company?.operating_license_no ? `ر.ت: ${shipmentData.transporter_company.operating_license_no}` : 'غير متوفر',
            facilityRegNo: shipmentData.transporter_company?.facility_reg_no ? `م.م: ${shipmentData.transporter_company.facility_reg_no}` : 'غير متوفر',
            registeredActivity: shipmentData.transporter_company?.registered_activity || 'غير متوفر'
          },
          recycler: {
            name: shipmentData.recycler_company?.name || 'غير محدد',
            taxId: shipmentData.recycler_company?.tax_id ? `ض.ر: ${shipmentData.recycler_company.tax_id}` : 'غير متوفر',
            commercialRegNo: shipmentData.recycler_company?.commercial_reg_no ? `س.ت: ${shipmentData.recycler_company.commercial_reg_no}` : 'غير متوفر',
            address: shipmentData.recycler_company?.address || 'غير متوفر',
            phone: shipmentData.recycler_company?.phone || 'غير متوفر',
            environmentalApproval: shipmentData.recycler_company?.environmental_approval_no ? `م.ب: ${shipmentData.recycler_company.environmental_approval_no}` : 'غير متوفر',
            operatingLicense: shipmentData.recycler_company?.operating_license_no ? `ر.ت: ${shipmentData.recycler_company.operating_license_no}` : 'غير متوفر',
            facilityRegNo: shipmentData.recycler_company?.facility_reg_no ? `م.م: ${shipmentData.recycler_company.facility_reg_no}` : 'غير متوفر',
            registeredActivity: shipmentData.recycler_company?.registered_activity || 'غير متوفر'
          },
          wasteDetails: {
            type: shipmentData.waste_type?.name || 'غير محدد',
            description: shipmentData.waste_type?.description || shipmentData.waste_description || 'غير متوفر',
            quantity: shipmentData.quantity ? `${shipmentData.quantity} كيلوجرام` : 'غير محدد',
            packaging: shipmentData.packaging || 'غير محدد'
          },
          status: shipmentData.status === 'completed' ? 'مكتمل' : 
                  shipmentData.status === 'pending' ? 'في الانتظار' :
                  shipmentData.status === 'in_transit' ? 'قيد النقل' :
                  shipmentData.status === 'delivered' ? 'تم التسليم' : shipmentData.status,
          createdAt: new Date(shipmentData.created_at).toLocaleDateString('ar-SA'),
          deliveredAt: shipmentData.delivery_date ? new Date(shipmentData.delivery_date).toLocaleDateString('ar-SA') : 'غير متوفر'
        };

        // Create PDF content and open in new window
        const pdfContent = `
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>نموذج تتبع المخلفات - ${pdfData.shipmentNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; direction: rtl; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #006400; padding-bottom: 20px; margin-bottom: 30px; }
              .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
              .section-title { font-weight: bold; color: #006400; font-size: 18px; margin-bottom: 10px; }
              .data-row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
              .label { font-weight: bold; min-width: 150px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>نموذج تتبع المخلفات</h1>
              <p>رقم الشحنة: ${pdfData.shipmentNumber}</p>
            </div>
            
            <div class="section">
              <div class="section-title">بيانات الجهة المولدة</div>
              <div class="data-row"><span class="label">اسم الجهة:</span><span>${pdfData.generator.name}</span></div>
              <div class="data-row"><span class="label">الرقم الضريبي:</span><span>${pdfData.generator.taxId}</span></div>
              <div class="data-row"><span class="label">السجل التجاري:</span><span>${pdfData.generator.commercialRegNo}</span></div>
              <div class="data-row"><span class="label">الموافقة البيئية:</span><span>${pdfData.generator.environmentalApproval}</span></span></div>
            </div>
            
            <div class="section">
              <div class="section-title">بيانات الجهة الناقلة</div>
              <div class="data-row"><span class="label">اسم الناقل:</span><span>${pdfData.transporter.name}</span></div>
              <div class="data-row"><span class="label">الرقم الضريبي:</span><span>${pdfData.transporter.taxId}</span></div>
              <div class="data-row"><span class="label">السجل التجاري:</span><span>${pdfData.transporter.commercialRegNo}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">بيانات جهة التدوير</div>
              <div class="data-row"><span class="label">اسم الجهة:</span><span>${pdfData.recycler.name}</span></div>
              <div class="data-row"><span class="label">الرقم الضريبي:</span><span>${pdfData.recycler.taxId}</span></div>
              <div class="data-row"><span class="label">السجل التجاري:</span><span>${pdfData.recycler.commercialRegNo}</span></div>
            </div>
            
            <div class="section">
              <div class="section-title">وصف المخلفات</div>
              <div class="data-row"><span class="label">النوع:</span><span>${pdfData.wasteDetails.type}</span></div>
              <div class="data-row"><span class="label">الكمية:</span><span>${pdfData.wasteDetails.quantity}</span></div>
              <div class="data-row"><span class="label">الحالة:</span><span>${pdfData.status}</span></div>
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(pdfContent);
          printWindow.document.close();
          printWindow.focus();
        }
      } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
      }
    };

    await validateAndExecute(
      'generate_shipment_pdf',
      action,
      'تم إنشاء ملف PDF بنجاح'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل تفاصيل الشحنة...</p>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">لم يتم العثور على الشحنة</h2>
          <p className="text-muted-foreground mb-4">الشحنة المطلوبة غير موجودة أو تم حذفها</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              عودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-cairo">تفاصيل الشحنة</h1>
              <p className="text-muted-foreground">{shipment.shipment_number}</p>
            </div>
          </div>
          
          <Button onClick={generatePDF} variant="outline">
            📄 تحميل PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo flex items-center">
                  <Package className="h-5 w-5 ml-2" />
                  معلومات الشحنة الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">رقم الشحنة</label>
                      <p className="font-mono text-lg">{shipment.shipment_number}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">نوع النفايات</label>
                      <p>{shipment.waste_type.name}</p>
                      {shipment.waste_type.description && (
                        <p className="text-sm text-muted-foreground">{shipment.waste_type.description}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">الكمية</label>
                      <div className="flex items-center">
                        <Weight className="h-4 w-4 ml-2" />
                        <span className="font-semibold">{shipment.quantity} كيلوجرام</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">تاريخ الإنشاء</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 ml-2" />
                        <span>{new Date(shipment.created_at).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">تاريخ الاستلام</label>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 ml-2" />
                        <span>{new Date(shipment.pickup_date).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                    
                    {shipment.delivery_date && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">تاريخ التسليم</label>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 ml-2" />
                          <span>{new Date(shipment.delivery_date).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Locations */}
                {(shipment.pickup_location || shipment.delivery_location) && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <MapPin className="h-4 w-4 ml-2" />
                      المواقع
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {shipment.pickup_location && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">موقع الاستلام</label>
                          <p>{shipment.pickup_location}</p>
                        </div>
                      )}
                      {shipment.delivery_location && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">موقع التسليم</label>
                          <p>{shipment.delivery_location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Companies */}
            <Card>
              <CardHeader>
                <CardTitle className="font-cairo flex items-center">
                  <Building2 className="h-5 w-5 ml-2" />
                  الشركات المشاركة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-blue-600 mb-2">الشركة المولدة</h4>
                    <p className="font-semibold">{shipment.generator_company.name}</p>
                    {shipment.generator_company.address && (
                      <p className="text-sm text-muted-foreground">{shipment.generator_company.address}</p>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-purple-600 mb-2">شركة النقل</h4>
                    <p className="font-semibold">{shipment.transporter_company.name}</p>
                    {shipment.transporter_company.address && (
                      <p className="text-sm text-muted-foreground">{shipment.transporter_company.address}</p>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium text-green-600 mb-2">شركة إعادة التدوير</h4>
                    <p className="font-semibold">{shipment.recycler_company.name}</p>
                    {shipment.recycler_company.address && (
                      <p className="text-sm text-muted-foreground">{shipment.recycler_company.address}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipment Approval Panel */}
            <ShipmentApprovalPanel
              shipmentId={shipment.id}
              shipmentNumber={shipment.shipment_number}
              generatorCompanyId={shipment.generator_company.id}
              recyclerCompanyId={shipment.recycler_company.id}
              transporterCompanyId={shipment.transporter_company.id}
              generatorApproval={{
                status: shipment.generator_approval_status || 'pending',
                approved_at: shipment.generator_approved_at,
                approved_by: shipment.generator_approved_by,
                rejection_reason: shipment.generator_rejection_reason
              }}
              recyclerApproval={{
                status: shipment.recycler_approval_status || 'pending',
                approved_at: shipment.recycler_approved_at,
                approved_by: shipment.recycler_approved_by,
                rejection_reason: shipment.recycler_rejection_reason
              }}
              overallStatus={shipment.overall_approval_status || 'pending'}
              autoApprovalDeadline={shipment.auto_approval_deadline || ''}
              onApprovalUpdate={fetchShipmentDetails}
            />

            {/* Status Tracker */}
            <StatusTracker
              shipmentId={shipment.id}
              currentStatus={shipment.status}
              statusHistory={shipment.status_history}
              onStatusUpdate={fetchShipmentDetails}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Driver Tracking */}
            {shipment.driver_id && (
              <DriverTracker
                driverId={shipment.driver_id}
                shipmentId={shipment.id}
                showControls={user?.role === 'driver'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetails;