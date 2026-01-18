import React from 'react';
import { Navigate } from 'react-router-dom';
import SubscriptionsModular from './Subscriptions/index';

// This file serves as a redirect to the new modular structure
const Subscriptions: React.FC = () => {
  return <SubscriptionsModular />;
};

export default Subscriptions;
