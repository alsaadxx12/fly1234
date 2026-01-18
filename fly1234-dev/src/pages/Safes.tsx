import React from 'react';
import { Navigate } from 'react-router-dom';
import SafesModular from './Safes/index';

// This file now serves as a redirect to the new modular structure
const Safes: React.FC = () => {
  return <SafesModular />;
};

export default Safes;
