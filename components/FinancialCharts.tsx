import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { startOfMonth, subMonths, format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomizedAxisTick: React.FC<any> = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="#666" transform="rotate(-35)" className="text-xs">
        {payload.value}
      </text>
    </g>
  );
};

export const FinancialCharts: React.FC = () => {
  const payments = useLiveQuery(() => db.payments.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());

  const revenueData = useMemo(() => {
    if (!payments) return [];
    const monthlyRevenue: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthKey = format(date, 'MMM yy', { locale: nl });
      monthlyRevenue[monthKey] = 0;
    }

    payments.forEach(p => {
      const paymentMonth = startOfMonth(p.payment_date);
      if (paymentMonth >= subMonths(startOfMonth(now), 5)) {
        const monthKey = format(paymentMonth, 'MMM yy', { locale: nl });
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + p.amount;
      }
    });

    return Object.entries(monthlyRevenue).map(([name, Omzet]) => ({ name, Omzet }));
  }, [payments]);
  
  const customerGrowthData = useMemo(() => {
    if (!customers) return [];
    
    const sortedCustomers = [...customers].sort((a,b) => a.created_at - b.created_at);
    const monthlyGrowth: Record<string, number> = {};
    
    sortedCustomers.forEach(c => {
        const monthKey = format(startOfMonth(c.created_at), 'MMM yy', { locale: nl });
        monthlyGrowth[monthKey] = (monthlyGrowth[monthKey] || 0) + 1;
    });
    
    const dataPoints = Object.entries(monthlyGrowth).map(([name, count]) => ({name, new: count}));
    
    let cumulative = 0;
    return dataPoints.map(dp => {
        cumulative += dp.new;
        return { name: dp.name, Klanten: cumulative };
    });

  }, [customers]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-2">Omzet per Maand (Laatste 6 Maanden)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={revenueData} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={<CustomizedAxisTick />} interval={0} />
              <YAxis />
              <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Omzet" fill="#4773f3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
       <div>
        <h3 className="text-lg font-semibold mb-2">Groei Actieve Klanten</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={customerGrowthData} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={<CustomizedAxisTick />} interval={0} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Klanten" stroke="#3a5ee9" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};