import React, { useState } from 'react';
import Dashboard from './components/Dashboard';

function App() {
  const [data] = useState({
    balance: 5420.50,
    transactions: [
      { id: 1, name: 'Salary', amount: 3000, type: 'in' },
      { id: 2, name: 'Grocery', amount: -150, type: 'out' },
    ],
    limits: { monthly: 2000, spent: 450 },
  });

  return (
    <div className="App">
      <h1>Movo Financial Tracker</h1>
      <Dashboard data={data} />
    </div>
  );
}

export default App;
