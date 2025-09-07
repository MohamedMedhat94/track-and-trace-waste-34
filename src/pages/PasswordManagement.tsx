import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PasswordManager from '@/components/Admin/PasswordManager';

const PasswordManagement: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-cairo">إدارة كلمات المرور</CardTitle>
                <CardDescription className="text-lg">
                  عرض وإدارة كلمات المرور لجميع المستخدمين في النظام
                </CardDescription>
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

        {/* Password Manager Component */}
        <PasswordManager />
      </div>
    </div>
  );
};

export default PasswordManagement;