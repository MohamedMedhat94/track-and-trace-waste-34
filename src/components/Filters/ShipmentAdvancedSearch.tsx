import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ShipmentAdvancedSearchProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  wasteTypeFilter: string;
  setWasteTypeFilter: (value: string) => void;
  companyFilter: string;
  setCompanyFilter: (value: string) => void;
  driverFilter: string;
  setDriverFilter: (value: string) => void;
  dateFromFilter: string;
  setDateFromFilter: (value: string) => void;
  dateToFilter: string;
  setDateToFilter: (value: string) => void;
  wasteTypes?: Array<{ id: string; name: string }>;
  companies?: Array<{ id: string; name: string }>;
  drivers?: Array<{ id: string; name: string }>;
  onReset: () => void;
}

const ShipmentAdvancedSearch: React.FC<ShipmentAdvancedSearchProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  wasteTypeFilter,
  setWasteTypeFilter,
  companyFilter,
  setCompanyFilter,
  driverFilter,
  setDriverFilter,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  wasteTypes = [],
  companies = [],
  drivers = [],
  onReset
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse mb-4">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="font-semibold font-cairo">البحث والتصفية المتقدمة</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search by shipment number */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم الشحنة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 font-cairo"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="حالة الشحنة" />
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

            {/* Waste type filter */}
            <Select value={wasteTypeFilter} onValueChange={setWasteTypeFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="نوع المخلف" />
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

            {/* Company filter */}
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="الشركة" />
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

            {/* Driver filter */}
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="font-cairo">
                <SelectValue placeholder="السائق" />
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

            {/* Date from */}
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              placeholder="من تاريخ"
              className="font-cairo"
            />

            {/* Date to */}
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              placeholder="إلى تاريخ"
              className="font-cairo"
            />

            {/* Reset button */}
            <Button
              variant="outline"
              onClick={onReset}
              className="font-cairo"
            >
              <X className="h-4 w-4 ml-2" />
              إعادة تعيين
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShipmentAdvancedSearch;
