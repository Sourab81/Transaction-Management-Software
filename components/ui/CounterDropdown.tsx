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
  disabled?: boolean;
}

const CounterDropdown: React.FC<CounterDropdownProps> = ({ counters, selectedCounterId, onChange, disabled = false }) => {
  return (
    <select
      value={selectedCounterId}
      onChange={(e) => onChange(e.target.value)}
      className="form-select counter-select__field fw-medium"
      aria-label="Select department"
      disabled={disabled}
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
