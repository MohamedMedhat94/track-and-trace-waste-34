import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Printer, FileText } from 'lucide-react';

const ConsolidatedShipmentReport: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      previewShipmentCount();
    }
  }, [dateFrom, dateTo, wasteTypeFilter, companyFilter]);

  const fetchFilterData = async () => {
    try {
      const { data: wasteData } = await supabase
        .from('waste_types')
        .select('id, name')
        .order('name');
      
      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      setWasteTypes(wasteData || []);
      setCompanies(companyData || []);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    }
  };

  const previewShipmentCount = async () => {
    try {
      let query = supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (wasteTypeFilter !== 'all') {
        query = query.eq('waste_type_id', wasteTypeFilter);
      }

      if (companyFilter !== 'all') {
        query = query.or(`generator_company_id.eq.${companyFilter},transporter_company_id.eq.${companyFilter},recycler_company_id.eq.${companyFilter}`);
      }

      const { count } = await query;
      setPreviewCount(count || 0);
    } catch (error) {
      console.error('خطأ في معاينة العدد:', error);
    }
  };

  const generateConsolidatedReport = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "خطأ",
        description: "يرجى تحديد نطاق التاريخ",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name, phone, address),
          transporter_company:companies!shipments_transporter_company_id_fkey(name, phone, address),
          recycler_company:companies!shipments_recycler_company_id_fkey(name, phone, address),
          waste_type:waste_types(name),
          driver:drivers(name, phone)
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: false });

      if (wasteTypeFilter !== 'all') {
        query = query.eq('waste_type_id', wasteTypeFilter);
      }

      if (companyFilter !== 'all') {
        query = query.or(`generator_company_id.eq.${companyFilter},transporter_company_id.eq.${companyFilter},recycler_company_id.eq.${companyFilter}`);
      }

      const { data: shipments, error } = await query;

      if (error) throw error;

      if (!shipments || shipments.length === 0) {
        toast({
          title: "لا توجد شحنات",
          description: "لم يتم العثور على شحنات مطابقة للفلاتر المحددة",
          variant: "destructive",
        });
        return;
      }

      // Fetch company signatures
      const { data: signatures } = await supabase
        .from('company_signatures')
        .select('*');

      const reportHTML = generateReportHTML(shipments, signatures || []);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.print();
      }

      toast({
        title: "تم إنشاء التقرير",
        description: `تم إنشاء تقرير مجمع لـ ${shipments.length} شحنة`,
      });

    } catch (error: any) {
      console.error('خطأ في إنشاء التقرير:', error);
      toast({
        title: "خطأ في إنشاء التقرير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportHTML = (shipments: any[], signatures: any[]) => {
    const totalQuantity = shipments.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const completedCount = shipments.filter(s => s.status === 'completed').length;

    const getSignature = (companyId: string) => {
      return signatures.find(s => s.company_id === companyId);
    };

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير الشحنات المجمع</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Arial', sans-serif; 
            direction: rtl;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 3px solid #333;
            padding-bottom: 10px;
          }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .report-info { 
            display: flex;
            justify-content: space-between;
            margin: 15px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 20px 0;
          }
          .summary-card {
            padding: 15px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 5px;
            text-align: center;
          }
          .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: right;
          }
          th { 
            background-color: #2563eb; 
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
            page-break-inside: avoid;
          }
          .signature-box {
            border: 1px solid #ddd;
            padding: 15px;
            min-height: 120px;
            text-align: center;
          }
          .signature-img {
            max-width: 100px;
            max-height: 60px;
            margin: 10px auto;
          }
          .stamp-img {
            max-width: 80px;
            max-height: 80px;
            margin: 10px auto;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #333;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
          @media print {
            button { display: none; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${user?.companyName || 'نظام إدارة المخلفات'}</div>
          <h2>تقرير الشحنات المجمع</h2>
        </div>

        <div class="report-info">
          <div><strong>الفترة:</strong> من ${new Date(dateFrom).toLocaleDateString('ar-SA')} إلى ${new Date(dateTo).toLocaleDateString('ar-SA')}</div>
          <div><strong>تاريخ الإنشاء:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
          <div><strong>المستخدم:</strong> ${user?.name || 'غير محدد'}</div>
        </div>

        <div class="summary">
          <div class="summary-card">
            <div>إجمالي الشحنات</div>
            <div class="value">${shipments.length}</div>
          </div>
          <div class="summary-card">
            <div>الشحنات المكتملة</div>
            <div class="value">${completedCount}</div>
          </div>
          <div class="summary-card">
            <div>الكمية الإجمالية</div>
            <div class="value">${totalQuantity.toFixed(1)} كجم</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>رقم الشحنة</th>
              <th>التاريخ</th>
              <th>الجهة المولدة</th>
              <th>الناقل</th>
              <th>المدور</th>
              <th>نوع المخلف</th>
              <th>الكمية</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${shipments.map(s => `
              <tr>
                <td>${s.shipment_number || 'غير محدد'}</td>
                <td>${new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
                <td>${s.generator_company?.name || 'غير محدد'}</td>
                <td>${s.transporter_company?.name || 'غير محدد'}</td>
                <td>${s.recycler_company?.name || 'غير محدد'}</td>
                <td>${s.waste_type?.name || 'غير محدد'}</td>
                <td>${s.quantity || 0} كجم</td>
                <td>${getStatusText(s.status)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-box">
            <h4>توقيع الجهة المولدة</h4>
            ${shipments[0]?.generator_company_id ? (
              getSignature(shipments[0].generator_company_id) ? `
                <img class="signature-img" src="${getSignature(shipments[0].generator_company_id)?.signature_image_url || ''}" alt="التوقيع" />
                <img class="stamp-img" src="${getSignature(shipments[0].generator_company_id)?.stamp_image_url || ''}" alt="الختم" />
              ` : '<div style="margin-top: 30px;">_______________</div>'
            ) : ''}
            <div style="margin-top: 10px;">التاريخ: _____________</div>
          </div>
          <div class="signature-box">
            <h4>توقيع شركة النقل</h4>
            ${shipments[0]?.transporter_company_id ? (
              getSignature(shipments[0].transporter_company_id) ? `
                <img class="signature-img" src="${getSignature(shipments[0].transporter_company_id)?.signature_image_url || ''}" alt="التوقيع" />
                <img class="stamp-img" src="${getSignature(shipments[0].transporter_company_id)?.stamp_image_url || ''}" alt="الختم" />
              ` : '<div style="margin-top: 30px;">_______________</div>'
            ) : ''}
            <div style="margin-top: 10px;">التاريخ: _____________</div>
          </div>
          <div class="signature-box">
            <h4>توقيع الجهة المدورة</h4>
            ${shipments[0]?.recycler_company_id ? (
              getSignature(shipments[0].recycler_company_id) ? `
                <img class="signature-img" src="${getSignature(shipments[0].recycler_company_id)?.signature_image_url || ''}" alt="التوقيع" />
                <img class="stamp-img" src="${getSignature(shipments[0].recycler_company_id)?.stamp_image_url || ''}" alt="الختم" />
              ` : '<div style="margin-top: 30px;">_______________</div>'
            ) : ''}
            <div style="margin-top: 10px;">التاريخ: _____________</div>
          </div>
        </div>

        <div class="footer">
          <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة المخلفات - ${new Date().toLocaleString('ar-SA')}</p>
          <p>جميع الحقوق محفوظة © ${new Date().getFullYear()}</p>
        </div>

        <button onclick="window.print()" class="no-print" style="position: fixed; top: 20px; left: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; z-index: 1000;">
          طباعة التقرير
        </button>
      </body>
      </html>
    `;
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      in_transit: 'قيد النقل',
      delivered: 'تم التسليم',
      sorting: 'قيد الفرز',
      recycling: 'قيد التدوير',
      completed: 'مكتمل'
    };
    return statusMap[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <FileText className="h-5 w-5 ml-2" />
          التقرير المجمع للشحنات
        </CardTitle>
        <CardDescription>
          طباعة تقرير مجمع للشحنات مع التوقيعات والأختام
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-cairo">من تاريخ</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label className="font-cairo">إلى تاريخ</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="font-cairo">نوع المخلف</Label>
              <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  {wasteTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-cairo">الشركة</Label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الشركات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الشركات</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {previewCount !== null && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium">
                عدد الشحنات المطابقة: <span className="text-lg font-bold text-blue-700">{previewCount}</span>
              </p>
            </div>
          )}

          <Button
            onClick={generateConsolidatedReport}
            disabled={isGenerating || !dateFrom || !dateTo || previewCount === 0}
            className="w-full"
          >
            <Printer className="h-4 w-4 ml-2" />
            {isGenerating ? 'جاري إنشاء التقرير...' : 'إنشاء وطباعة التقرير المجمع'}
          </Button>

          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <h4 className="font-semibold mb-2">ملاحظات:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>سيتم تضمين التوقيعات والأختام المحفوظة تلقائياً</li>
              <li>يمكن تصفية الشحنات حسب التاريخ، نوع المخلف، والشركة</li>
              <li>سيتم عرض معاينة العدد قبل الطباعة</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsolidatedShipmentReport;
