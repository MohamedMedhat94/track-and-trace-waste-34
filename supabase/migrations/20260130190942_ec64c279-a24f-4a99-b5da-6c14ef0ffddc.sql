-- Link test driver to transporter company
UPDATE drivers 
SET transport_company_id = '757d0cad-2185-46e5-b5d0-0377bf8b3d30'
WHERE email = 'test.driver@demo.com' AND transport_company_id IS NULL;