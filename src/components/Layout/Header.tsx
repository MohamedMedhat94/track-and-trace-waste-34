import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import companyLogo from '@/assets/company-logo.png';

const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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
              <div className="flex items-center space-x-2 space-x-reverse">
                <User className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm opacity-90">{getRoleDisplayName(user.role)}</p>
                  {user.companyName && (
                    <p className="text-xs opacity-75">{user.companyName}</p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
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
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary flex items-center space-x-2 space-x-reverse"
              >
                <LogOut className="h-4 w-4" />
                <span>تسجيل خروج</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;