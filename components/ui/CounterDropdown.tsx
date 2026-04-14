import React from 'react';

interface Counter {
  id: string;
  name: string;
  code: string;
  openingBalance: number;
  currentBalance: number;
}

interface CounterDropdownProps {
  counters: Counter[];
  selectedCounterId: string;
  onChange: (counterId: string) => void;
}

const CounterDropdown: React.FC<CounterDropdownProps> = ({ counters, selectedCounterId, onChange }) => {
  const selectedCounter = counters.find(c => c.id === selectedCounterId);

  return (
    <select
      value={selectedCounterId}
      onChange={(e) => onChange(e.target.value)}
      className="form-select border-0 bg-transparent fw-medium"
      style={{
        fontSize: '14px',
        height: '40px',
        cursor: 'pointer'
      }}
    >
      {counters.map((counter) => (
        <option key={counter.id} value={counter.id}>
          {counter.name}
        </option>
      ))}
    </select>
  );
};

export default CounterDropdown;
