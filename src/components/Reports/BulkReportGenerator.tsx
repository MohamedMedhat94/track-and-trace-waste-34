import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const BulkReportGenerator: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wasteTypes, setWasteTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [shipmentCount, setShipmentCount] = useState(0);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    if (dateFrom || dateTo || wasteTypeFilter !== 'all' || companyFilter !== 'all') {
      previewCount();
    }
  }, [dateFrom, dateTo, wasteTypeFilter, companyFilter, statusFilter]);

  const fetchFilterData = async () => {
    try {
      const { data: wasteTypesData } = await supabase
        .from('waste_types')
        .select('id, name')
        .order('name');

      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      setWasteTypes(wasteTypesData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  const previewCount = async () => {
    try {
      let query = supabase
        .from('shipments')
        .select('id', { count: 'exact', head: true });

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }
      if (wasteTypeFilter !== 'all') {
        query = query.eq('waste_type_id', wasteTypeFilter);
      }
      if (companyFilter !== 'all') {
        query = query.or(`generator_company_id.eq.${companyFilter},transporter_company_id.eq.${companyFilter},recycler_company_id.eq.${companyFilter}`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Add company filter based on user role
      if (user?.role === 'generator' && user?.companyId) {
        query = query.eq('generator_company_id', user.companyId);
      } else if (user?.role === 'transporter' && user?.companyId) {
        query = query.eq('transporter_company_id', user.companyId);
      } else if (user?.role === 'recycler' && user?.companyId) {
        query = query.eq('recycler_company_id', user.companyId);
      }

      const { count } = await query;
      setShipmentCount(count || 0);
    } catch (error) {
      console.error('Error counting shipments:', error);
    }
  };

  const generateBulkReport = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: "يرجى تحديد الفترة",
        description: "يجب تحديد تاريخ البداية والنهاية",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          generator_company:companies!shipments_generator_company_id_fkey(name, tax_id),
          transporter_company:companies!shipments_transporter_company_id_fkey(name, tax_id),
          recycler_company:companies!shipments_recycler_company_id_fkey(name, tax_id),
          waste_type:waste_types(name),
          driver:drivers(name)
        `)
        .gte('created_at', new Date(dateFrom).toISOString())
        .lte('created_at', new Date(dateTo).toISOString())
        .order('created_at', { ascending: false });

      if (wasteTypeFilter !== 'all') {
        query = query.eq('waste_type_id', wasteTypeFilter);
      }
      if (companyFilter !== 'all') {
        query = query.or(`generator_company_id.eq.${companyFilter},transporter_company_id.eq.${companyFilter},recycler_company_id.eq.${companyFilter}`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filter by user company
      if (user?.role === 'generator' && user?.companyId) {
        query = query.eq('generator_company_id', user.companyId);
      } else if (user?.role === 'transporter' && user?.companyId) {
        query = query.eq('transporter_company_id', user.companyId);
      } else if (user?.role === 'recycler' && user?.companyId) {
        query = query.eq('recycler_company_id', user.companyId);
      }

      const { data: shipments, error } = await query;

      if (error) throw error;

      if (!shipments || shipments.length === 0) {
        toast({
          title: "لا توجد شحنات",
          description: "لا توجد شحنات تطابق المعايير المحددة",
          variant: "destructive",
        });
        return;
      }

      // Generate bulk report HTML
      const reportHTML = generateBulkReportHTML(shipments);
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('لا يمكن فتح نافذة الطباعة');
      }

      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.print();

      toast({
        title: "تم إنشاء التقرير",
        description: `تم إنشاء تقرير يحتوي على ${shipments.length} شحنة`,
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "خطأ في إنشاء التقرير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBulkReportHTML = (shipments: any[]) => {
    const totalQuantity = shipments.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const completedCount = shipments.filter(s => s.status === 'completed').length;

    const shipmentsRows = shipments.map((s, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: center;">${index + 1}</td>
        <td style="padding: 12px;">${s.shipment_number}</td>
        <td style="padding: 12px;">${new Date(s.created_at).toLocaleDateString('ar-SA')}</td>
        <td style="padding: 12px;">${s.waste_type?.name || 'غير محدد'}</td>
        <td style="padding: 12px;">${s.quantity || 0} كغ</td>
        <td style="padding: 12px;">${s.generator_company?.name || 'غير محدد'}</td>
        <td style="padding: 12px;">${s.transporter_company?.name || 'غير محدد'}</td>
        <td style="padding: 12px;">${s.recycler_company?.name || 'غير محدد'}</td>
        <td style="padding: 12px;">${s.status === 'completed' ? 'مكتمل' : 
                                      s.status === 'pending' ? 'في الانتظار' :
                                      s.status === 'in_transit' ? 'قيد النقل' : s.status}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير مجمع للشحنات</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          @page { size: A4 landscape; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            padding: 20px;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #006400;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .company-name {
            color: #006400;
            font-size: 28px;
            font-weight: 700;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .stat-box {
            padding: 15px;
            background: #f9f9f9;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            text-align: center;
          }
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #006400;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 11px;
          }
          th {
            background: #006400;
            color: white;
            padding: 12px;
            text-align: right;
            font-weight: 600;
          }
          td {
            padding: 8px;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e5e7eb;
          }
          .signature-box {
            text-align: center;
            padding: 20px;
            border: 2px solid #d1d5db;
            border-radius: 8px;
            min-height: 120px;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">آي ريسايكل</div>
          <h2>تقرير مجمع للشحنات</h2>
          <p>الفترة من ${new Date(dateFrom).toLocaleDateString('ar-SA')} إلى ${new Date(dateTo).toLocaleDateString('ar-SA')}</p>
        </div>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-value">${shipments.length}</div>
            <div>إجمالي الشحنات</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${completedCount}</div>
            <div>الشحنات المكتملة</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${totalQuantity.toLocaleString()}</div>
            <div>إجمالي الكمية (كغ)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم الشحنة</th>
              <th>التاريخ</th>
              <th>نوع المخلف</th>
              <th>الكمية</th>
              <th>الجهة المولدة</th>
              <th>الجهة الناقلة</th>
              <th>جهة التدوير</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${shipmentsRows}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-box">
            <h4>توقيع الجهة الناقلة</h4>
            <div style="margin-top: 40px; border-top: 2px solid #000; padding-top: 10px;">
              التوقيع والختم
            </div>
          </div>
          <div class="signature-box">
            <h4>توقيع الجهة المدورة</h4>
            <div style="margin-top: 40px; border-top: 2px solid #000; padding-top: 10px;">
              التوقيع والختم
            </div>
          </div>
          <div class="signature-box">
            <h4>توقيع الجهة المولدة</h4>
            <div style="margin-top: 40px; border-top: 2px solid #000; padding-top: 10px;">
              التوقيع والختم
            </div>
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
          <p>تاريخ الإصدار: ${new Date().toLocaleString('ar-SA')}</p>
          <p>هذا التقرير تم إنشاؤه تلقائياً من نظام آي ريسايكل</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 12px 24px; background: #006400; color: white; border: none; border-radius: 6px; font-family: Cairo; font-size: 16px; cursor: pointer;">
            طباعة التقرير
          </button>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <FileText className="h-5 w-5 ml-2" />
          إنشاء تقرير مجمع
        </CardTitle>
        <CardDescription>
          طباعة تقرير شامل لعدة شحنات معاً حسب معايير محددة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">من تاريخ *</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="font-cairo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">إلى تاريخ *</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="font-cairo"
            />
          </div>

          <div className="space-y-2">
            <Label>نوع المخلف</Label>
            <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
              <SelectTrigger className="font-cairo">
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

          <div className="space-y-2">
            <Label>الشركة</Label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="font-cairo">
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

          <div className="space-y-2">
            <Label>حالة الشحنة</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="in_transit">قيد النقل</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="processing">قيد المعالجة</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        {shipmentCount > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 ml-2 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">معاينة التقرير</p>
                  <p className="text-sm text-blue-700">
                    سيتم إنشاء تقرير يحتوي على {shipmentCount} شحنة
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {shipmentCount} شحنة
              </Badge>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={generateBulkReport}
            disabled={loading || !dateFrom || !dateTo || shipmentCount === 0}
            size="lg"
            className="min-w-[200px]"
          >
            {loading ? (
              'جاري الإنشاء...'
            ) : (
              <>
                <Download className="h-5 w-5 ml-2" />
                إنشاء وطباعة التقرير
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-semibold mb-1">ملاحظات:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>سيتم إنشاء تقرير شامل يحتوي على جميع الشحنات المطابقة للمعايير</li>
            <li>التقرير يحتوي على أماكن مخصصة للتوقيع والختم من جميع الأطراف</li>
            <li>يمكن طباعة التقرير مباشرة أو حفظه كملف PDF</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkReportGenerator;
