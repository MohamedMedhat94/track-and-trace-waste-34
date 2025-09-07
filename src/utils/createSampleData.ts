import { supabase } from '@/integrations/supabase/client';

export const createSampleData = async () => {
  try {
    console.log('Creating sample data...');

    // Create sample waste types
    const wasteTypes = [
      { name: 'ورق ومخلفات ورقية', description: 'ورق مكاتب، جرائد، مجلات' },
      { name: 'مخلفات بلاستيكية', description: 'قوارير بلاستيك، أكياس، عبوات' },
      { name: 'مخلفات معدنية', description: 'علب معدنية، خردة معادن' },
      { name: 'مخلفات زجاجية', description: 'قوارير زجاج، نوافذ مكسورة' },
      { name: 'مخلفات إلكترونية', description: 'أجهزة كمبيوتر، هواتف، أجهزة كهربائية' },
      { name: 'مخلفات عضوية', description: 'مخلفات طعام، أوراق شجر' }
    ];

    for (const wasteType of wasteTypes) {
      const { error } = await supabase
        .from('waste_types')
        .upsert(wasteType, { onConflict: 'name' });
      
      if (error) {
        console.error('Error creating waste type:', error);
      }
    }

    // Create sample companies with test users
    const sampleCompanies = [
      {
        name: 'شركة النقل السريع',
        type: 'transporter',
        email: 'transporter@test.com',
        password: '123456789',
        phone: '01234567890',
        address: 'المنطقة الصناعية الأولى، القاهرة',
        contact_person: 'أحمد محمد - مدير النقل',
        tax_id: 'TAX123456',
        commercial_reg_no: 'CR789012',
        license_no: 'LIC345678',
        is_active: true,
        status: 'active'
      },
      {
        name: 'مصنع إعادة التدوير المتقدم',
        type: 'recycler', 
        email: 'recycler@test.com',
        password: '123456789',
        phone: '01234567891',
        address: 'مدينة بدر الصناعية، القاهرة',
        contact_person: 'سارة أحمد - مديرة الإنتاج',
        tax_id: 'TAX234567',
        commercial_reg_no: 'CR890123',
        license_no: 'LIC456789',
        environmental_approval_no: 'ENV123456',
        is_active: true,
        status: 'active'
      },
      {
        name: 'شركة الصناعات الغذائية المصرية',
        type: 'generator',
        email: 'generator1@test.com',
        password: '123456789',
        phone: '01234567892', 
        address: 'مدينة العبور، القليوبية',
        contact_person: 'محمد علي - مدير البيئة',
        tax_id: 'TAX345678',
        commercial_reg_no: 'CR901234',
        facility_reg_no: 'FAC123456',
        registered_activity: 'تصنيع المواد الغذائية والمشروبات',
        is_active: true,
        status: 'active'
      },
      {
        name: 'مجموعة المصانع الكيماوية',
        type: 'generator',
        email: 'generator2@test.com',
        password: '123456789',
        phone: '01234567893',
        address: 'المنطقة الصناعية، العاشر من رمضان',
        contact_person: 'فاطمة حسن - مسؤولة البيئة',
        tax_id: 'TAX456789',
        commercial_reg_no: 'CR012345',
        environmental_approval_no: 'ENV234567',
        operating_license_no: 'OPL123456',
        registered_activity: 'تصنيع المواد الكيماوية والبتروكيماوية',
        is_active: true,
        status: 'active'
      }
    ];

    // Create companies and their users
    for (const companyData of sampleCompanies) {
      try {
        // First, create the company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .upsert({
            name: companyData.name,
            type: companyData.type,
            email: companyData.email,
            phone: companyData.phone,
            address: companyData.address,
            contact_person: companyData.contact_person,
            tax_id: companyData.tax_id,
            commercial_reg_no: companyData.commercial_reg_no,
            license_no: companyData.license_no,
            environmental_approval_no: companyData.environmental_approval_no,
            operating_license_no: companyData.operating_license_no,
            facility_reg_no: companyData.facility_reg_no,
            registered_activity: companyData.registered_activity,
            is_active: companyData.is_active,
            status: companyData.status
          }, { onConflict: 'email' })
          .select()
          .single();
        
        if (companyError) {
          console.error('Error creating company:', companyError);
          continue;
        }

        // Then create user account for the company
        if (companyData.email && companyData.password) {
          try {
            // Create user without email confirmation requirement
            const { data: user, error: userError } = await supabase.auth.admin.createUser({
              email: companyData.email,
              password: companyData.password,
              email_confirm: true, // Skip email confirmation
              user_metadata: {
                full_name: companyData.contact_person || companyData.name,
                role: companyData.type
              }
            });

            if (userError) {
              console.error(`Error creating user for ${companyData.name}:`, userError);
              // Try alternative method with edge function
              const { error: edgeFunctionError } = await supabase.functions.invoke('create-user-with-password', {
                body: {
                  email: companyData.email,
                  password: companyData.password,
                  fullName: companyData.contact_person || companyData.name,
                  role: companyData.type,
                  companyId: company.id
                }
              });

              if (edgeFunctionError) {
                console.error(`Edge function error for ${companyData.name}:`, edgeFunctionError);
              } else {
                console.log(`User created via edge function for ${companyData.name}`);
              }
            } else if (user) {
              // Create profile for the user
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  user_id: user.user.id,
                  full_name: companyData.contact_person || companyData.name,
                  email: companyData.email,
                  role: companyData.type,
                  company_id: company.id,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (profileError) {
                console.error(`Profile creation error for ${companyData.name}:`, profileError);
              } else {
                console.log(`User and profile created successfully for ${companyData.name}`);
              }
            }
          } catch (adminError) {
            console.error(`Admin user creation failed for ${companyData.name}, trying edge function:`, adminError);
            
            // Fallback to edge function
            const { error: edgeFunctionError } = await supabase.functions.invoke('create-user-with-password', {
              body: {
                email: companyData.email,
                password: companyData.password,
                fullName: companyData.contact_person || companyData.name,
                role: companyData.type,
                companyId: company.id
              }
            });

            if (edgeFunctionError) {
              console.error(`Final fallback failed for ${companyData.name}:`, edgeFunctionError);
            } else {
              console.log(`User created via fallback edge function for ${companyData.name}`);
            }
          }
        }

      } catch (error) {
        console.error(`Error processing company ${companyData.name}:`, error);
      }
    }

    console.log('Sample data created successfully!');
    return { success: true };

  } catch (error) {
    console.error('Error creating sample data:', error);
    return { success: false, error };
  }
};