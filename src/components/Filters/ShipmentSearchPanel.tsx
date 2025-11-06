import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X } from 'lucide-react';

interface ShipmentSearchPanelProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  wasteTypeFilter: string;
  setWasteTypeFilter: (value: string) => void;
  companyFilter: string;
  setCompanyFilter: (value: string) => void;
  driverFilter: string;
  setDriverFilter: (value: string) => void;
  wasteTypes?: any[];
  companies?: any[];
  drivers?: any[];
  onReset: () => void;
}

const ShipmentSearchPanel: React.FC<ShipmentSearchPanelProps> = ({
  searchTerm,
  setSearchTerm,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  wasteTypeFilter,
  setWasteTypeFilter,
  companyFilter,
  setCompanyFilter,
  driverFilter,
  setDriverFilter,
  wasteTypes = [],
  companies = [],
  drivers = [],
  onReset,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center font-cairo">
          <Search className="h-5 w-5 ml-2" />
          البحث والتصفية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search by number */}
          <div>
            <Label className="font-cairo">البحث برقم الشحنة</Label>
            <Input
              placeholder="ابحث برقم الشحنة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Date Range */}
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

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Waste Type Filter */}
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

            {/* Company Filter */}
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

            {/* Driver Filter */}
            <div>
              <Label className="font-cairo">السائق</Label>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع السائقين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع السائقين</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentSearchPanel;
