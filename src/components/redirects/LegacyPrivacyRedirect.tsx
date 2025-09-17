import React from 'react';
import { Navigate } from 'react-router-dom';

const LegacyPrivacyRedirect: React.FC = () => {
  return <Navigate to="/legal/privacy" replace />;
};

export default LegacyPrivacyRedirect;