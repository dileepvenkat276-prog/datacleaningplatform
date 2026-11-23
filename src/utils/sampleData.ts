import { Row } from '../types/dataset';

export const SAMPLE_HEADERS = [
  'Customer_ID',
  'Full_Name',
  'Email',
  'Phone_Number',
  'Age',
  'Department',
  'Annual_Salary',
  'Join_Date',
  'Country',
  'Record_Status',
  'Notes'
];

export const RAW_SAMPLE_DATA: Record<string, any>[] = [
  {
    Customer_ID: 'CUST-1001',
    Full_Name: '  Johnathan Vance  ',
    Email: 'johnathan.vance@example.com',
    Phone_Number: '+1-555-0199',
    Age: '34',
    Department: 'engineering',
    Annual_Salary: '$85,000',
    Join_Date: '2021-03-15',
    Country: 'United States',
    Record_Status: 'ACTIVE',
    Notes: 'Senior lead architect'
  },
  {
    Customer_ID: 'CUST-1002',
    Full_Name: 'SARAH JANE CONNOR',
    Email: 'sarah.connor@cyberdyne.org',
    Phone_Number: '555-0142',
    Age: '29',
    Department: 'Operations',
    Annual_Salary: '92000',
    Join_Date: '15/04/2022',
    Country: 'USA',
    Record_Status: 'ACTIVE',
    Notes: 'Requested shift update'
  },
  {
    Customer_ID: 'CUST-1003',
    Full_Name: 'Michael Chang',
    Email: 'michael.chang@sample.com',
    Phone_Number: '+1 555-0188',
    Age: '41',
    Department: 'Product Management',
    Annual_Salary: '$110,500',
    Join_Date: '2019-11-01',
    Country: 'Canada',
    Record_Status: 'ACTIVE',
    Notes: 'Certified scrum master'
  },
  // EXACT DUPLICATE OF CUST-1003
  {
    Customer_ID: 'CUST-1003',
    Full_Name: 'Michael Chang',
    Email: 'michael.chang@sample.com',
    Phone_Number: '+1 555-0188',
    Age: '41',
    Department: 'Product Management',
    Annual_Salary: '$110,500',
    Join_Date: '2019-11-01',
    Country: 'Canada',
    Record_Status: 'ACTIVE',
    Notes: 'Certified scrum master'
  },
  // FUZZY DUPLICATE OF CUST-1001
  {
    Customer_ID: 'CUST-1004',
    Full_Name: 'Johnathan Vance',
    Email: 'johnathan.vance@example.com',
    Phone_Number: '555-0199',
    Age: '34',
    Department: 'Engineering',
    Annual_Salary: '85000',
    Join_Date: '2021/03/15',
    Country: 'United States',
    Record_Status: 'ACTIVE',
    Notes: 'Duplicate entry detected'
  },
  {
    Customer_ID: 'CUST-1005',
    Full_Name: 'elena rostova',
    Email: 'elena.rostova@globalcorp.eu',
    Phone_Number: '+44 20 7946 0912',
    Age: '38',
    Department: 'finance',
    Annual_Salary: '£78,000',
    Join_Date: '2020-07-22',
    Country: 'United Kingdom',
    Record_Status: 'ACTIVE',
    Notes: 'Auditor specialist'
  },
  // OUTLIER IN AGE & SALARY
  {
    Customer_ID: 'CUST-1006',
    Full_Name: 'Marcus Aurelius Sterling',
    Email: 'marcus.sterling@apexholdings.com',
    Phone_Number: '555-999-8877',
    Age: '195', // Outlier age
    Department: 'Executive',
    Annual_Salary: '$9,850,000', // Extreme salary outlier
    Join_Date: '1901-01-01',
    Country: 'Switzerland',
    Record_Status: 'ACTIVE',
    Notes: 'CEO and principal investor'
  },
  // MISSING VALUES & INVALID EMAIL
  {
    Customer_ID: 'CUST-1007',
    Full_Name: 'Priya Sharma',
    Email: 'priya.sharma@@invalid-mail..com', // Invalid email format
    Phone_Number: '9820098200',
    Age: '', // Missing age
    Department: 'Research & Development',
    Annual_Salary: '135000',
    Join_Date: '2023-01-10',
    Country: 'India',
    Record_Status: 'ACTIVE',
    Notes: ''
  },
  {
    Customer_ID: 'CUST-1008',
    Full_Name: 'Liam O\'Connor',
    Email: '', // Missing email
    Phone_Number: 'not-a-number', // Invalid phone
    Age: '24',
    Department: 'engineering',
    Annual_Salary: '$62,000',
    Join_Date: '2022-09-01',
    Country: 'Ireland',
    Record_Status: 'ACTIVE',
    Notes: 'Junior frontend dev'
  },
  // COMPLETELY EMPTY ROW (or nearly empty)
  {
    Customer_ID: '',
    Full_Name: '',
    Email: '',
    Phone_Number: '',
    Age: '',
    Department: '',
    Annual_Salary: '',
    Join_Date: '',
    Country: '',
    Record_Status: '',
    Notes: ''
  },
  {
    Customer_ID: 'CUST-1009',
    Full_Name: 'Amina Al-Mansoor',
    Email: 'amina.mansoor@techuae.ae',
    Phone_Number: '+971 50 123 4567',
    Age: '31',
    Department: 'Marketing',
    Annual_Salary: 'AED 240,000',
    Join_Date: '12-08-2021', // Different date format
    Country: 'United Arab Emirates',
    Record_Status: 'ACTIVE',
    Notes: 'Regional campaign director'
  },
  // OUTLIER: NEGATIVE SALARY
  {
    Customer_ID: 'CUST-1010',
    Full_Name: 'David K. Miller',
    Email: 'dmiller@logistics.net',
    Phone_Number: '+1-555-3211',
    Age: '-5', // Invalid / Outlier age
    Department: 'Logistics',
    Annual_Salary: '-45000', // Negative salary
    Join_Date: '2022/10/30',
    Country: 'USA',
    Record_Status: 'ACTIVE',
    Notes: 'Payroll error reported'
  },
  {
    Customer_ID: 'CUST-1011',
    Full_Name: '  CHLOE DUPONT  ',
    Email: 'chloe.dupont@paris-solutions.fr',
    Phone_Number: '+33 1 42 68 55 00',
    Age: '27',
    Department: 'Human Resources',
    Annual_Salary: '€58,000',
    Join_Date: '2023-04-18',
    Country: 'France',
    Record_Status: 'ACTIVE',
    Notes: 'Talent acquisition'
  },
  {
    Customer_ID: 'CUST-1012',
    Full_Name: 'Kenji Sato',
    Email: 'kenji.sato@nippon-tech.co.jp',
    Phone_Number: '+81 3 5555 0143',
    Age: '45',
    Department: 'Engineering',
    Annual_Salary: '¥9,200,000',
    Join_Date: '2018-06-12',
    Country: 'Japan',
    Record_Status: 'ACTIVE',
    Notes: 'Infrastructure architect'
  },
  {
    Customer_ID: 'CUST-1013',
    Full_Name: 'Sofia Hernandez',
    Email: 'sofia.h@mercosur-trade.org',
    Phone_Number: '+54 11 4321 8899',
    Age: '36',
    Department: 'Sales & Accounts',
    Annual_Salary: '$82,500',
    Join_Date: '2021-08-25',
    Country: 'Argentina',
    Record_Status: 'ACTIVE',
    Notes: 'Key enterprise accounts'
  }
];

export function generateSampleDataset(): { headers: string[]; rows: Row[] } {
  const rows: Row[] = RAW_SAMPLE_DATA.map((item, idx) => ({
    ...item,
    _id: `row-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
  }));
  return {
    headers: [...SAMPLE_HEADERS],
    rows
  };
}
