import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, FileText, FileSignature, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import companyLogo from '@/assets/company-logo.png';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'مسؤول النظام';
      case 'generator': return 'شركة مولدة للنفايات';
      case 'transporter': return 'شركة نقل';
      case 'recycler': return 'شركة إعادة تدوير';
      case 'driver': return 'سائق';
      default: return role;
    }
  };

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 space-x-reverse">
            <img 
              src={companyLogo} 
              alt="آي ريسايكل لإدارة النفايات" 
              className="h-12 w-auto"
            />
            <div className="text-right">
              <h1 className="text-2xl font-bold font-cairo">آي ريسايكل</h1>
              <p className="text-sm opacity-90">نظام إدارة وتتبع النفايات</p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center space-x-4 space-x-reverse">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="h-5 w-5" />
                      <div className="text-right hidden md:block">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs opacity-90">{getRoleDisplayName(user.role)}</p>
                      </div>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-cairo">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {user.companyName && (
                        <p className="text-xs text-muted-foreground mt-1">{user.companyName}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {(user.role === 'transporter' || user.role === 'recycler' || user.role === 'generator') && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/company-signatures')}>
                        <FileSignature className="h-4 w-4 ml-2" />
                        إدارة الامضاء والختم
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuItem onClick={() => navigate('/view-terms-acceptance')}>
                    <FileText className="h-4 w-4 ml-2" />
                    عرض الشروط المقبولة
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={async () => {
                      const { error } = await signOut();
                      if (error) {
                        toast({
                          title: "خطأ في تسجيل الخروج",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                    تسجيل خروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;