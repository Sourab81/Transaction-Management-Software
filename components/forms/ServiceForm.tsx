'use client';

import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

interface ServiceFormProps {
  selectedCounter: string;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ selectedCounter }) => {
  const { state, dispatch } = useApp();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  // Mock data - in real app, this would come from API
  const services: { id: string; name: string; price: number }[] = [
    { id: '1', name: 'Mobile Recharge', price: 0 },
    { id: '2', name: 'Bill Payment', price: 0 },
    { id: '3', name: 'Money Transfer', price: 0 },
  ];

  const customers = state.customers;

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Smart autofill
    const foundCustomer = customers.find(c => c.phone === value);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setName(foundCustomer.name);
      setEmail(foundCustomer.email || '');
    } else {
      setCustomer(null);
      setName('');
      setEmail('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.phone === phone) || { id: '', name, phone, email };
    const serviceName = services.find(s => s.id === selectedService)?.name || '';

    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        customerId: customer.id,
        customerName: customer.name,
        service: serviceName,
        amount: parseFloat(amount),
        status: 'completed',
      },
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: 'success',
        message: `Transaction completed for ${customer.name}`,
      },
    });

    // Reset form
    setPhone('');
    setName('');
    setEmail('');
    setSelectedService('');
    setAmount('');
    setCustomer(null);
  };

  return (
    <div className="card border-0 shadow-sm" style={{borderRadius: '1.5rem'}}>
      <div className="card-body p-5">
        <div className="mb-4 p-4 bg-light rounded-3" style={{borderRadius: '1.5rem'}}>
          <p className="text-muted small mb-1" style={{letterSpacing: '0.1em'}}>Selected Counter</p>
          <p className="h5 mb-0 fw-semibold text-dark">{selectedCounter}</p>
        </div>
        <h2 className="h4 mb-4 fw-semibold text-dark">New Transaction</h2>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <Input
                label="Customer Phone"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <Input
                label="Customer Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                required
              />
            </div>
          </div>
          <div className="row g-3 mt-1">
            <div className="col-12 col-md-6">
              <Input
                label="Email (Optional)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="col-12 col-md-6">
              <Select
                label="Service"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                options={[
                  { value: '', label: 'Select Service' },
                  ...services.map(s => ({ value: s.id, label: s.name })),
                ]}
                required
              />
            </div>
          </div>
          <div className="mt-3">
            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="mt-4">
            <Button type="submit" className="w-full">
              Process Transaction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceForm;