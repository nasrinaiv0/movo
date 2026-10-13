import React from 'react';

const Dashboard = ({ data }) => (
  <div>
    <h2>Dashboard</h2>
    <p>Total Balance: ${data.balance.toFixed(2)}</p>
    
    <h3>Money In/Out</h3>
    <ul>
      {data.transactions.map(t => <li key={t.id}>{t.name}: {t.amount}</li>)}
    </ul>

    <h3>Spending Limit</h3>
    <p>Limit: ${data.limits.monthly} | Spent: ${data.limits.spent}</p>
  </div>
);

export default Dashboard;
