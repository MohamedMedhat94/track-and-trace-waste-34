import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, ArrowLeft, Users, Activity, Clock, Filter, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Company {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

const CompaniesDetails: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchCompanies();
  }, [user]);

  useEffect(() => {
    filterCompanies();
  }, [companies, searchTerm, typeFilter, statusFilter]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (!error && data) {
      setIsAdmin(data.role === 'admin');
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        toast({
          title: "خطأ في تحميل البيانات",
          description: "تعذر تحميل بيانات الشركات",
          variant: "destructive",
        });
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر الاتصال بقاعدة البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = companies;

    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.phone?.includes(searchTerm)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(company => company.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(company => company.is_active === true);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(company => company.is_active === false);
      } else {
        filtered = filtered.filter(company => company.status === statusFilter);
      }
    }

    setFilteredCompanies(filtered);
  };

  const handleDeleteAllCompanies = async () => {
    try {
      setDeleting(true);
      
      const { error } = await supabase.rpc('delete_all_companies');
      
      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "خطأ في الحذف",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف جميع الشركات والبيانات المرتبطة بها",
      });
      
      // إعادة تحميل البيانات
      await fetchCompanies();
      
    } catch (error) {
      console.error('Error deleting companies:', error);
      toast({
        title: "خطأ في العملية",
        description: "حدث خطأ أثناء حذف الشركات",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'generator': return 'مولد نفايات';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة إعادة تدوير';
      default: return type;
    }
  };

  const getStatusBadge = (company: Company) => {
    if (!company.is_active) {
      return <Badge variant="destructive">غير نشط</Badge>;
    }
    
    switch (company.status) {
      case 'active':
        return <Badge variant="default">نشط</Badge>;
      case 'pending':
        return <Badge variant="secondary">في الانتظار</Badge>;
      case 'suspended':
        return <Badge variant="destructive">معلق</Badge>;
      default:
        return <Badge variant="outline">{company.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>جاري تحميل بيانات الشركات...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: companies.length,
    active: companies.filter(c => c.is_active).length,
    pending: companies.filter(c => c.status === 'pending').length,
    generators: companies.filter(c => c.type === 'generator').length,
    transporters: companies.filter(c => c.type === 'transporter').length,
    recyclers: companies.filter(c => c.type === 'recycler').length
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center font-cairo"
        >
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold font-cairo">تفاصيل الشركات</h1>
          <p className="text-muted-foreground">عرض وإدارة جميع الشركات المسجلة</p>
        </div>
        {isAdmin && companies.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center">
                <Trash2 className="h-4 w-4 ml-2" />
                حذف جميع الشركات
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-cairo">هل أنت متأكد؟</AlertDialogTitle>
                <AlertDialogDescription className="font-cairo">
                  هذا الإجراء سيقوم بحذف جميع الشركات والبيانات المرتبطة بها (الشحنات، السائقين، التوقيعات، إلخ).
                  <br />
                  <strong className="text-destructive">لا يمكن التراجع عن هذا الإجراء!</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-cairo">إلغاء</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAllCompanies}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-cairo"
                >
                  {deleting ? 'جاري الحذف...' : 'نعم، احذف الجميع'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الشركات</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الشركات النشطة</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">في الانتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مولدة نفايات</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.generators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">شركات نقل</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.transporters}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إعادة تدوير</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.recyclers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center font-cairo">
            <Filter className="h-5 w-5 ml-2" />
            البحث والفلترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في اسم الشركة، البريد، أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="فلترة حسب النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="generator">مولد نفايات</SelectItem>
                  <SelectItem value="transporter">شركة نقل</SelectItem>
                  <SelectItem value="recycler">شركة إعادة تدوير</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="فلترة حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="suspended">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      {filteredCompanies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد شركات</h3>
            <p className="text-muted-foreground">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'لا توجد شركات تطابق معايير البحث المحددة'
                : 'لم يتم تسجيل أي شركات بعد'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="font-cairo text-lg">{company.name}</CardTitle>
                    <CardDescription>{getTypeText(company.type)}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(company)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {company.email && (
                    <div className="flex items-center">
                      <span className="font-medium ml-2">البريد:</span>
                      <span className="text-muted-foreground">{company.email}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center">
                      <span className="font-medium ml-2">الهاتف:</span>
                      <span className="text-muted-foreground">{company.phone}</span>
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-start">
                      <span className="font-medium ml-2">العنوان:</span>
                      <span className="text-muted-foreground flex-1">{company.address}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="font-medium ml-2">تاريخ التسجيل:</span>
                    <span className="text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompaniesDetails;