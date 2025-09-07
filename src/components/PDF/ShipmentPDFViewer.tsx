import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, FileText } from 'lucide-react';
import { useButtonValidation } from '@/hooks/useButtonValidation';

interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  tax_id?: string;
}

interface WasteType {
  id: string;
  name: string;
  description?: string;
}

interface ShipmentData {
  id: string;
  shipment_number: string;
  status: string;
  quantity?: number;
  pickup_date?: string;
  delivery_date?: string;
  pickup_location?: string;
  delivery_location?: string;
  created_at: string;
  generator_company?: Company;
  transporter_company?: Company;
  recycler_company?: Company;
  waste_type?: WasteType;
}

interface ShipmentPDFViewerProps {
  shipment: ShipmentData;
  driverName?: string;
}

const ShipmentPDFViewer: React.FC<ShipmentPDFViewerProps> = ({ 
  shipment, 
  driverName 
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { validateAndExecute } = useButtonValidation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'sorting': return 'bg-purple-100 text-purple-800';
      case 'recycling': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'in_transit': return 'قيد النقل';
      case 'delivered': return 'تم التسليم';
      case 'sorting': return 'قيد الفرز';
      case 'recycling': return 'قيد التدوير';
      case 'completed': return 'مكتملة';
      default: return status;
    }
  };

  const handlePrint = async () => {
    const action = async () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('فشل في فتح نافذة الطباعة');

      const printContent = printRef.current?.innerHTML;
      if (!printContent) throw new Error('لا يوجد محتوى للطباعة');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تفاصيل الشحنة - ${shipment.shipment_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 12px; 
              line-height: 1.4;
              direction: rtl;
              background: white;
            }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; }
            .section { margin-bottom: 25px; }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              color: #1f2937; 
              margin-bottom: 10px;
              padding: 8px 12px;
              background: #f3f4f6;
              border-right: 4px solid #2563eb;
            }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 8px; }
            .info-label { font-weight: bold; color: #374151; display: inline-block; min-width: 120px; }
            .info-value { color: #111827; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: bold;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in_transit { background: #dbeafe; color: #1e40af; }
            .status-delivered { background: #d1fae5; color: #065f46; }
            .status-completed { background: #dcfce7; color: #166534; }
            .company-box {
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 15px;
              background: #f9fafb;
            }
            .company-name { font-weight: bold; font-size: 14px; color: #1f2937; margin-bottom: 8px; }
            .company-details { font-size: 11px; color: #6b7280; }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #d1d5db;
              text-align: center;
              color: #6b7280;
              font-size: 10px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .container { max-width: none; margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">نظام تتبع النفايات</div>
              <div class="subtitle">تفاصيل الشحنة</div>
            </div>
            
            <div class="section">
              <div class="section-title">معلومات الشحنة الأساسية</div>
              <div class="info-grid">
                <div>
                  <div class="info-item">
                    <span class="info-label">رقم الشحنة:</span>
                    <span class="info-value">${shipment.shipment_number}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">الحالة:</span>
                    <span class="status-badge status-${shipment.status}">${getStatusText(shipment.status)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">الكمية:</span>
                    <span class="info-value">${shipment.quantity || 'غير محدد'} كجم</span>
                  </div>
                </div>
                <div>
                  <div class="info-item">
                    <span class="info-label">تاريخ الإنشاء:</span>
                    <span class="info-value">${new Date(shipment.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>
                  ${shipment.pickup_date ? `
                    <div class="info-item">
                      <span class="info-label">تاريخ الجمع:</span>
                      <span class="info-value">${new Date(shipment.pickup_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                  ` : ''}
                  ${shipment.delivery_date ? `
                    <div class="info-item">
                      <span class="info-label">تاريخ التسليم:</span>
                      <span class="info-value">${new Date(shipment.delivery_date).toLocaleDateString('ar-SA')}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>

            ${shipment.waste_type ? `
              <div class="section">
                <div class="section-title">نوع النفايات</div>
                <div class="company-box">
                  <div class="company-name">${shipment.waste_type.name}</div>
                  ${shipment.waste_type.description ? `
                    <div class="company-details">${shipment.waste_type.description}</div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <div class="section">
              <div class="section-title">الشركات المشاركة</div>
              
              ${shipment.generator_company ? `
                <div class="company-box">
                  <div class="company-name">الشركة المولدة: ${shipment.generator_company.name}</div>
                  <div class="company-details">
                    ${shipment.generator_company.address ? `العنوان: ${shipment.generator_company.address}<br>` : ''}
                    ${shipment.generator_company.phone ? `الهاتف: ${shipment.generator_company.phone}<br>` : ''}
                    ${shipment.generator_company.tax_id ? `الرقم الضريبي: ${shipment.generator_company.tax_id}` : ''}
                  </div>
                </div>
              ` : ''}

              ${shipment.transporter_company ? `
                <div class="company-box">
                  <div class="company-name">شركة النقل: ${shipment.transporter_company.name}</div>
                  <div class="company-details">
                    ${shipment.transporter_company.address ? `العنوان: ${shipment.transporter_company.address}<br>` : ''}
                    ${shipment.transporter_company.phone ? `الهاتف: ${shipment.transporter_company.phone}<br>` : ''}
                    ${shipment.transporter_company.tax_id ? `الرقم الضريبي: ${shipment.transporter_company.tax_id}` : ''}
                  </div>
                </div>
              ` : ''}

              ${shipment.recycler_company ? `
                <div class="company-box">
                  <div class="company-name">شركة التدوير: ${shipment.recycler_company.name}</div>
                  <div class="company-details">
                    ${shipment.recycler_company.address ? `العنوان: ${shipment.recycler_company.address}<br>` : ''}
                    ${shipment.recycler_company.phone ? `الهاتف: ${shipment.recycler_company.phone}<br>` : ''}
                    ${shipment.recycler_company.tax_id ? `الرقم الضريبي: ${shipment.recycler_company.tax_id}` : ''}
                  </div>
                </div>
              ` : ''}
            </div>

            ${(shipment.pickup_location || shipment.delivery_location) ? `
              <div class="section">
                <div class="section-title">مواقع الجمع والتسليم</div>
                <div class="info-grid">
                  ${shipment.pickup_location ? `
                    <div>
                      <div class="info-label">موقع الجمع:</div>
                      <div class="info-value">${shipment.pickup_location}</div>
                    </div>
                  ` : ''}
                  ${shipment.delivery_location ? `
                    <div>
                      <div class="info-label">موقع التسليم:</div>
                      <div class="info-value">${shipment.delivery_location}</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            ${driverName ? `
              <div class="section">
                <div class="section-title">معلومات السائق</div>
                <div class="info-item">
                  <span class="info-label">اسم السائق:</span>
                  <span class="info-value">${driverName}</span>
                </div>
              </div>
            ` : ''}

            <div class="footer">
              <div>تم إنشاء هذا التقرير في: ${new Date().toLocaleString('ar-SA')}</div>
              <div>نظام تتبع النفايات - جميع الحقوق محفوظة</div>
            </div>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = function() {
        printWindow.print();
        printWindow.close();
      };
    };

    await validateAndExecute(
      'print_shipment_details',
      action,
      'تم إرسال تفاصيل الشحنة للطباعة'
    );
  };

  const handleDownloadPDF = async () => {
    const action = async () => {
      // This would typically generate a proper PDF
      // For now, we'll open the print dialog
      await handlePrint();
    };

    await validateAndExecute(
      'download_shipment_pdf',
      action,
      'تم إعداد ملف PDF للتنزيل'
    );
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button onClick={handlePrint} variant="default">
          <Printer className="h-4 w-4 ml-2" />
          طباعة
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline">
          <Download className="h-4 w-4 ml-2" />
          تنزيل PDF
        </Button>
      </div>

      {/* Print-ready Content */}
      <div ref={printRef} className="hidden">
        {/* This content is used for printing - styled separately */}
      </div>

      {/* Display Content */}
      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center">
            <FileText className="h-5 w-5 ml-2" />
            تفاصيل الشحنة للطباعة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Shipment Info */}
          <div>
            <h3 className="font-semibold mb-3">معلومات الشحنة الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">رقم الشحنة:</span>
                  <p className="font-medium">{shipment.shipment_number}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">الحالة:</span>
                  <div className="mt-1">
                    <Badge className={getStatusColor(shipment.status)}>
                      {getStatusText(shipment.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">الكمية:</span>
                  <p className="font-medium">{shipment.quantity || 'غير محدد'} كجم</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">تاريخ الإنشاء:</span>
                  <p className="font-medium">
                    {new Date(shipment.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                {shipment.pickup_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">تاريخ الجمع:</span>
                    <p className="font-medium">
                      {new Date(shipment.pickup_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}
                {shipment.delivery_date && (
                  <div>
                    <span className="text-sm text-muted-foreground">تاريخ التسليم:</span>
                    <p className="font-medium">
                      {new Date(shipment.delivery_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Waste Type */}
          {shipment.waste_type && (
            <>
              <div>
                <h3 className="font-semibold mb-3">نوع النفايات</h3>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-medium">{shipment.waste_type.name}</h4>
                  {shipment.waste_type.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {shipment.waste_type.description}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Companies */}
          <div>
            <h3 className="font-semibold mb-3">الشركات المشاركة</h3>
            <div className="space-y-4">
              {shipment.generator_company && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-blue-600 mb-2">
                    الشركة المولدة
                  </h4>
                  <p className="font-medium">{shipment.generator_company.name}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-2">
                    {shipment.generator_company.address && (
                      <p>العنوان: {shipment.generator_company.address}</p>
                    )}
                    {shipment.generator_company.phone && (
                      <p>الهاتف: {shipment.generator_company.phone}</p>
                    )}
                    {shipment.generator_company.tax_id && (
                      <p>الرقم الضريبي: {shipment.generator_company.tax_id}</p>
                    )}
                  </div>
                </div>
              )}

              {shipment.transporter_company && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-green-600 mb-2">
                    شركة النقل
                  </h4>
                  <p className="font-medium">{shipment.transporter_company.name}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-2">
                    {shipment.transporter_company.address && (
                      <p>العنوان: {shipment.transporter_company.address}</p>
                    )}
                    {shipment.transporter_company.phone && (
                      <p>الهاتف: {shipment.transporter_company.phone}</p>
                    )}
                    {shipment.transporter_company.tax_id && (
                      <p>الرقم الضريبي: {shipment.transporter_company.tax_id}</p>
                    )}
                  </div>
                </div>
              )}

              {shipment.recycler_company && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-purple-600 mb-2">
                    شركة التدوير
                  </h4>
                  <p className="font-medium">{shipment.recycler_company.name}</p>
                  <div className="text-sm text-muted-foreground space-y-1 mt-2">
                    {shipment.recycler_company.address && (
                      <p>العنوان: {shipment.recycler_company.address}</p>
                    )}
                    {shipment.recycler_company.phone && (
                      <p>الهاتف: {shipment.recycler_company.phone}</p>
                    )}
                    {shipment.recycler_company.tax_id && (
                      <p>الرقم الضريبي: {shipment.recycler_company.tax_id}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Locations */}
          {(shipment.pickup_location || shipment.delivery_location) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">مواقع الجمع والتسليم</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shipment.pickup_location && (
                    <div>
                      <span className="text-sm text-muted-foreground">موقع الجمع:</span>
                      <p className="font-medium">{shipment.pickup_location}</p>
                    </div>
                  )}
                  {shipment.delivery_location && (
                    <div>
                      <span className="text-sm text-muted-foreground">موقع التسليم:</span>
                      <p className="font-medium">{shipment.delivery_location}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Driver Info */}
          {driverName && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">معلومات السائق</h3>
                <div>
                  <span className="text-sm text-muted-foreground">اسم السائق:</span>
                  <p className="font-medium">{driverName}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShipmentPDFViewer;