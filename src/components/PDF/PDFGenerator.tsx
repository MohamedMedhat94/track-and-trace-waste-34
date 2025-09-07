import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PDFGeneratorProps {
  shipmentId: string;
  type?: 'tracking' | 'report';
  data?: any;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ 
  shipmentId, 
  type = 'tracking',
  data 
}) => {
  const { toast } = useToast();

const generatePDF = async () => {
    let shipmentData = null;
    
    try {
      console.log('Starting PDF generation for shipment:', shipmentId);
      
      // Determine if shipmentId is a UUID or shipment number
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shipmentId);
      
      // Build the query based on the ID type
      let query = supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(
            id, name, address, phone, tax_id, commercial_reg_no, 
            environmental_approval_no, operating_license_no, 
            facility_reg_no, registered_activity
          ),
          transporter_company:companies!shipments_transporter_company_id_fkey(
            id, name, address, phone, tax_id, commercial_reg_no,
            environmental_approval_no, operating_license_no,
            facility_reg_no, registered_activity
          ),
          recycler_company:companies!shipments_recycler_company_id_fkey(
            id, name, address, phone, tax_id, commercial_reg_no,
            environmental_approval_no, operating_license_no,
            facility_reg_no, registered_activity
          ),
          waste_type:waste_types(id, name, description)
        `);

      // Apply the appropriate filter
      if (isUUID) {
        query = query.eq('id', shipmentId);
      } else {
        query = query.eq('shipment_number', shipmentId);
      }

      const { data: shipment, error } = await query.maybeSingle();

      // Fetch driver data separately if driver_id exists
      let driverData = null;
      if (shipment && shipment.driver_id) {
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, name, phone, license_number')
          .eq('id', shipment.driver_id)
          .single();
        driverData = driver;
      }

      if (error) {
        console.error('Database error:', error);
        throw new Error(`خطأ في قاعدة البيانات: ${error.message}`);
      }

      if (!shipment) {
        throw new Error('لا توجد شحنة بهذا الرقم');
      }

      console.log('Shipment data fetched successfully:', shipment);

      shipmentData = {
        shipmentNumber: shipment.shipment_number,
        generator: {
          name: shipment.generator_company?.name || 'غير محدد',
          taxId: shipment.generator_company?.tax_id ? `ض.ر: ${shipment.generator_company.tax_id}` : 'غير متوفر',
          commercialRegNo: shipment.generator_company?.commercial_reg_no ? `س.ت: ${shipment.generator_company.commercial_reg_no}` : 'غير متوفر',
          address: shipment.generator_company?.address || 'غير متوفر',
          phone: shipment.generator_company?.phone || 'غير متوفر',
          email: 'غير متوفر',
          environmentalApproval: shipment.generator_company?.environmental_approval_no ? `م.ب: ${shipment.generator_company.environmental_approval_no}` : 'غير متوفر',
          operatingLicense: shipment.generator_company?.operating_license_no ? `ر.ت: ${shipment.generator_company.operating_license_no}` : 'غير متوفر',
          facilityRegNo: shipment.generator_company?.facility_reg_no ? `م.م: ${shipment.generator_company.facility_reg_no}` : 'غير متوفر',
          registeredActivity: shipment.generator_company?.registered_activity || 'غير متوفر'
        },
        transporter: {
          name: shipment.transporter_company?.name || 'غير محدد',
          taxId: shipment.transporter_company?.tax_id ? `ض.ر: ${shipment.transporter_company.tax_id}` : 'غير متوفر',
          commercialRegNo: shipment.transporter_company?.commercial_reg_no ? `س.ت: ${shipment.transporter_company.commercial_reg_no}` : 'غير متوفر',
          address: shipment.transporter_company?.address || 'غير متوفر',
          phone: shipment.transporter_company?.phone || 'غير متوفر',
          email: 'غير متوفر',
          environmentalApproval: shipment.transporter_company?.environmental_approval_no ? `م.ب: ${shipment.transporter_company.environmental_approval_no}` : 'غير متوفر',
          operatingLicense: shipment.transporter_company?.operating_license_no ? `ر.ت: ${shipment.transporter_company.operating_license_no}` : 'غير متوفر',
          facilityRegNo: shipment.transporter_company?.facility_reg_no ? `م.م: ${shipment.transporter_company.facility_reg_no}` : 'غير متوفر',
          registeredActivity: shipment.transporter_company?.registered_activity || 'غير متوفر'
        },
        recycler: {
          name: shipment.recycler_company?.name || 'غير محدد',
          taxId: shipment.recycler_company?.tax_id ? `ض.ر: ${shipment.recycler_company.tax_id}` : 'غير متوفر',
          commercialRegNo: shipment.recycler_company?.commercial_reg_no ? `س.ت: ${shipment.recycler_company.commercial_reg_no}` : 'غير متوفر',
          address: shipment.recycler_company?.address || 'غير متوفر',
          phone: shipment.recycler_company?.phone || 'غير متوفر',
          email: 'غير متوفر',
          environmentalApproval: shipment.recycler_company?.environmental_approval_no ? `م.ب: ${shipment.recycler_company.environmental_approval_no}` : 'غير متوفر',
          operatingLicense: shipment.recycler_company?.operating_license_no ? `ر.ت: ${shipment.recycler_company.operating_license_no}` : 'غير متوفر',
          facilityRegNo: shipment.recycler_company?.facility_reg_no ? `م.م: ${shipment.recycler_company.facility_reg_no}` : 'غير متوفر',
          registeredActivity: shipment.recycler_company?.registered_activity || 'غير متوفر'
        },
        wasteDetails: {
          type: shipment.waste_type?.name || 'غير محدد',
          description: shipment.waste_type?.description || shipment.waste_description || 'غير متوفر',
          quantity: shipment.quantity ? `${shipment.quantity} كيلوجرام` : 'غير محدد',
          packaging: shipment.packaging || 'غير محدد',
          hazardLevel: 'غير محدد'
        },
        driver: {
          name: driverData?.name || 'غير محدد',
          phone: driverData?.phone || 'غير متوفر',
          license: driverData?.license_number || 'غير متوفر'
        },
        status: shipment.status === 'completed' ? 'مكتمل' : 
                shipment.status === 'pending' ? 'في الانتظار' :
                shipment.status === 'in_transit' ? 'قيد النقل' :
                shipment.status === 'delivered' ? 'تم التسليم' : shipment.status,
        createdAt: new Date(shipment.created_at).toLocaleDateString('ar-SA'),
        deliveredAt: shipment.delivery_date ? new Date(shipment.delivery_date).toLocaleDateString('ar-SA') : 'غير متوفر'
      };
    } catch (error: any) {
      console.error('Error fetching shipment data:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message || "لا يمكن تحميل بيانات الشحنة",
        variant: "destructive",
      });
      return;
    }

    const pdfData = {
      shipmentId,
      type,
      generatedAt: new Date().toISOString(),
      companyLogo: '/src/assets/company-logo.png',
      data: shipmentData
    };

    // Create enhanced PDF content as HTML string
    const pdfContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>نموذج تتبع المخلفات - ${shipmentId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap');
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Cairo', sans-serif; 
            direction: rtl; 
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #006400; 
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo { 
            max-width: 150px; 
            margin-bottom: 10px; 
          }
          .company-name { 
            color: #006400; 
            font-size: 24px; 
            font-weight: bold; 
            margin: 10px 0;
          }
          .report-title { 
            font-size: 20px; 
            margin: 10px 0; 
          }
          .section { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
          }
          .section-title { 
            font-weight: bold; 
            color: #006400; 
            font-size: 18px;
            margin-bottom: 10px;
          }
          .data-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0; 
            border-bottom: 1px dotted #ccc;
            padding-bottom: 5px;
          }
          .label { 
            font-weight: bold; 
            min-width: 150px;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .status-badge {
            background: #006400;
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="/src/assets/company-logo.png" alt="شعار الشركة" style="max-height: 80px; margin-bottom: 10px;">
          </div>
          <div class="company-name">آي ريسايكل لإدارة النفايات</div>
          <div class="report-title">نموذج تتبع المخلفات</div>
          <div style="font-size: 16px; color: #666; margin-top: 10px;">
            رقم الشحنة: ${shipmentId} | تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}
          </div>
        </div>

        <div class="section">
          <div class="section-title">بيانات الجهة المولدة للمخلفات</div>
          <div class="data-row">
            <span class="label">اسم الجهة:</span>
            <span>${pdfData.data.generator?.name || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البطاقة الضريبية:</span>
            <span>${pdfData.data.generator?.taxId || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">السجل التجاري:</span>
            <span>${pdfData.data.generator?.commercialRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم الموافقة البيئية:</span>
            <span>${pdfData.data.generator?.environmentalApproval || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رخصة جهاز تنظيم إدارة المخلفات:</span>
            <span>${pdfData.data.generator?.operatingLicense || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم تسجيل المنشأة:</span>
            <span>${pdfData.data.generator?.facilityRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">النشاط المسجل:</span>
            <span>${pdfData.data.generator?.registeredActivity || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">العنوان:</span>
            <span>${pdfData.data.generator?.address || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">الهاتف:</span>
            <span>${pdfData.data.generator?.phone || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البريد الإلكتروني:</span>
            <span>${pdfData.data.generator?.email || 'غير متوفر'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">بيانات الجهة الناقلة</div>
          <div class="data-row">
            <span class="label">اسم الناقل:</span>
            <span>${pdfData.data.transporter?.name || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البطاقة الضريبية:</span>
            <span>${pdfData.data.transporter?.taxId || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">السجل التجاري:</span>
            <span>${pdfData.data.transporter?.commercialRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم الموافقة البيئية:</span>
            <span>${pdfData.data.transporter?.environmentalApproval || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رخصة جهاز تنظيم إدارة المخلفات:</span>
            <span>${pdfData.data.transporter?.operatingLicense || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم تسجيل المنشأة:</span>
            <span>${pdfData.data.transporter?.facilityRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">النشاط المسجل:</span>
            <span>${pdfData.data.transporter?.registeredActivity || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">العنوان:</span>
            <span>${pdfData.data.transporter?.address || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">الهاتف:</span>
            <span>${pdfData.data.transporter?.phone || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البريد الإلكتروني:</span>
            <span>${pdfData.data.transporter?.email || 'غير متوفر'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">بيانات جهة التدوير</div>
          <div class="data-row">
            <span class="label">اسم الجهة:</span>
            <span>${pdfData.data.recycler?.name || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البطاقة الضريبية:</span>
            <span>${pdfData.data.recycler?.taxId || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">السجل التجاري:</span>
            <span>${pdfData.data.recycler?.commercialRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم الموافقة البيئية:</span>
            <span>${pdfData.data.recycler?.environmentalApproval || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رخصة جهاز تنظيم إدارة المخلفات:</span>
            <span>${pdfData.data.recycler?.operatingLicense || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم تسجيل المنشأة:</span>
            <span>${pdfData.data.recycler?.facilityRegNo || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">النشاط المسجل:</span>
            <span>${pdfData.data.recycler?.registeredActivity || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">العنوان:</span>
            <span>${pdfData.data.recycler?.address || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">الهاتف:</span>
            <span>${pdfData.data.recycler?.phone || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">البريد الإلكتروني:</span>
            <span>${pdfData.data.recycler?.email || 'غير متوفر'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">بيانات السائق</div>
          <div class="data-row">
            <span class="label">اسم السائق:</span>
            <span>${pdfData.data.driver?.name || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم الهاتف:</span>
            <span>${pdfData.data.driver?.phone || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">رقم الرخصة:</span>
            <span>${pdfData.data.driver?.license || 'غير متوفر'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">وصف المخلفات</div>
          <div class="data-row">
            <span class="label">النوع:</span>
            <span>${pdfData.data.wasteDetails?.type || 'غير محدد'}</span>
          </div>
          <div class="data-row">
            <span class="label">الوصف التفصيلي:</span>
            <span>${pdfData.data.wasteDetails?.description || 'غير متوفر'}</span>
          </div>
          <div class="data-row">
            <span class="label">الكمية:</span>
            <span>${pdfData.data.wasteDetails?.quantity || 'غير محدد'}</span>
          </div>
          <div class="data-row">
            <span class="label">نوع التعبئة:</span>
            <span>${pdfData.data.wasteDetails?.packaging || 'غير محدد'}</span>
          </div>
          <div class="data-row">
            <span class="label">مستوى الخطورة:</span>
            <span>${pdfData.data.wasteDetails?.hazardLevel || 'غير محدد'}</span>
          </div>
          <div class="data-row">
            <span class="label">الحالة الحالية:</span>
            <span class="status-badge">${pdfData.data.status}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">التواريخ والأوقات</div>
          <div class="data-row">
            <span class="label">تاريخ الإنشاء:</span>
            <span>${pdfData.data.createdAt}</span>
          </div>
          <div class="data-row">
            <span class="label">تاريخ التسليم:</span>
            <span>${pdfData.data.deliveredAt}</span>
          </div>
        </div>

        <div class="footer">
          <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
            هذا النموذج تم إنشاؤه تلقائياً بواسطة نظام آي ريسايكل لإدارة النفايات
          </p>
          <p style="text-align: center; font-size: 12px; color: #666;">
            تاريخ الإنشاء: ${new Date().toLocaleString('ar-SA')} | رقم المرجع: ${Math.random().toString(36).substr(2, 9).toUpperCase()}
          </p>
          <button onclick="window.print()" class="no-print" style="margin-top: 20px; padding: 10px 20px; background: #006400; color: white; border: none; border-radius: 5px; font-family: Cairo; cursor: pointer;">
            طباعة النموذج
          </button>
        </div>
      </body>
      </html>
    `;

    // Generate PDF with better error handling and actual implementation
    try {
      console.log('Opening print window...');
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('لا يمكن فتح نافذة الطباعة - يرجى السماح بالنوافذ المنبثقة');
      }
      
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 100);
      };
      
      toast({
        title: "تم بنجاح",
        description: "تم فتح نافذة الطباعة",
      });
    } catch (printError: any) {
      console.error('Print error:', printError);
      
      // Try to download as fallback
      try {
        const blob = new Blob([pdfContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `نموذج-تتبع-${shipmentId}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "تم التحميل",
          description: "تم تحميل النموذج كملف HTML",
        });
      } catch (downloadError: any) {
        console.error('Download error:', downloadError);
        toast({
          title: "خطأ في الطباعة",
          description: downloadError.message || "لا يمكن طباعة أو تحميل النموذج",
          variant: "destructive",
        });
      }
    }
  };

  return (
      <Button
        onClick={generatePDF}
        variant="outline"
        size="sm"
        className="font-cairo"
      >
        <Download className="h-4 w-4 ml-2" />
        طباعة نموذج التتبع
      </Button>
  );
};

export default PDFGenerator;