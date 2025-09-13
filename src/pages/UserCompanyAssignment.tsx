import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, ArrowLeft, Link } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UnassignedUser {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
  type: string;
}

interface CompanyUser {
  user_id: string;
  email: string;
  role: string;
  full_name: string;
  created_at: string;
}

const UserCompanyAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unassignedUsers, setUnassignedUsers] = useState<UnassignedUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyUsers(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch unassigned users
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_unassigned_users');
      
      if (usersError) throw usersError;
      
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .rpc('get_companies_for_selection');
      
      if (companiesError) throw companiesError;
      
      setUnassignedUsers(usersData || []);
      setCompanies(companiesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ في تحميل البيانات",
        description: "حدث خطأ أثناء تحميل المستخدمين والشركات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUsers = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_company_users', { target_company_id: companyId });
      
      if (error) throw error;
      
      setCompanyUsers(data || []);
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const assignUserToCompany = async (userId: string, companyId: string) => {
    try {
      setAssignLoading(true);
      
      const { error } = await supabase
        .rpc('assign_user_to_company', { 
          target_user_id: userId, 
          target_company_id: companyId 
        });
      
      if (error) throw error;
      
      toast({
        title: "تم الربط بنجاح",
        description: "تم ربط المستخدم بالشركة بنجاح"
      });
      
      // Refresh data
      await fetchData();
      if (selectedCompany) {
        await fetchCompanyUsers(selectedCompany);
      }
    } catch (error: any) {
      console.error('Error assigning user to company:', error);
      toast({
        title: "خطأ في الربط",
        description: error.message || "حدث خطأ أثناء ربط المستخدم بالشركة",
        variant: "destructive"
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      generator: 'جهة مولدة',
      transporter: 'شركة نقل',
      recycler: 'جهة تدوير',
      driver: 'سائق',
      admin: 'مدير'
    };
    return roleNames[role] || role;
  };

  const getTypeDisplayName = (type: string) => {
    const typeNames: Record<string, string> = {
      generator: 'جهة مولدة',
      transporter: 'شركة نقل',
      recycler: 'جهة تدوير'
    };
    return typeNames[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Link className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-cairo">ربط المستخدمين بالشركات</CardTitle>
                  <CardDescription className="text-lg">
                    إدارة ربط المستخدمين بالشركات المناسبة لهم
                  </CardDescription>
                </div>
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
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* المستخدمون غير المربوطين */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center font-cairo">
                <Users className="h-5 w-5 ml-2" />
                المستخدمون غير المربوطين ({unassignedUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unassignedUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">جميع المستخدمين مربوطون بشركات</p>
                  </div>
                ) : (
                  unassignedUsers.map((user) => (
                    <div key={user.user_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <Badge variant="secondary" className="mt-1">
                            {getRoleDisplayName(user.role)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Select onValueChange={(companyId) => assignUserToCompany(user.user_id, companyId)}>
                          <SelectTrigger className="font-cairo">
                            <SelectValue placeholder="اختر الشركة المناسبة" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies
                              .filter(company => {
                                // Filter companies based on user role
                                if (user.role === 'generator') return company.type === 'generator';
                                if (user.role === 'recycler') return company.type === 'recycler';
                                if (user.role === 'transporter' || user.role === 'driver') return company.type === 'transporter';
                                return true;
                              })
                              .map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                  {company.name} ({getTypeDisplayName(company.type)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* مستخدمو الشركة المحددة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center font-cairo">
                <Building2 className="h-5 w-5 ml-2" />
                مستخدمو الشركة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="font-cairo">
                    <SelectValue placeholder="اختر شركة لعرض مستخدميها" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name} ({getTypeDisplayName(company.type)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCompany && (
                  <div className="space-y-3">
                    {companyUsers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">لا يوجد مستخدمون مربوطون بهذه الشركة</p>
                      </div>
                    ) : (
                      companyUsers.map((user) => (
                        <div key={user.user_id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{user.full_name || user.email}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <Badge variant="default" className="mt-1">
                                {getRoleDisplayName(user.role)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString('ar-EG')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserCompanyAssignment;