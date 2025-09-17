import React from 'react';
import { Navigate } from 'react-router-dom';

const LegacyTermsRedirect: React.FC = () => {
  return <Navigate to="/legal/terms" replace />;
};

export default LegacyTermsRedirect;