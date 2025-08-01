// Shared utilities for generating realistic demo data

export const generateDateRange = (days) => {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toISOString().split('T')[0];
  });
};

export const generateTrendData = (days, baseValue = 50, variance = 20) => {
  return generateDateRange(days).map((date, i) => ({
    date,
    count: Math.floor(Math.random() * variance) + baseValue + Math.sin(i * 0.3) * 10
  }));
};

export const generateRealisticNames = () => [
  'Sarah Johnson', 'Mike Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Taylor',
  'Robert Martinez', 'Amanda Lee', 'Christopher Wang', 'Lauren Smith', 'Daniel Brown',
  'Michelle Davis', 'Andrew Wilson', 'Nicole Garcia', 'Kevin Anderson', 'Rachel Moore'
];

export const generateCompanyNames = () => [
  'TechFlow Solutions', 'DataDrive Inc', 'CloudSync Corp', 'InnovateLab', 'NextGen Systems',
  'DigitalForward LLC', 'ScaleUp Technologies', 'FutureWork Solutions', 'SmartBridge Co',
  'AgilePoint Ventures', 'ConnectWise Group', 'ProActive Systems', 'StreamlineOps'
];

export const generateRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const generateTimeAgo = (maxHours = 48) => {
  const hours = Math.floor(Math.random() * maxHours);
  const minutes = Math.floor(Math.random() * 60);
  
  if (hours === 0) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ${minutes}m ago`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ago`;
  }
};