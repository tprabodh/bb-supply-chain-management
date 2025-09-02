
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const CityOperationsHeadInput = () => {
  const { user } = useAuth();
  const subrole = user?.subrole || 'User';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-lg text-gray-600">
          Dear {subrole},
        </p>
        <p className="text-lg text-gray-600 mt-2">
          This input page is not available for your role at this time.
        </p>
        <p className="text-md text-gray-500 mt-4">
          Please navigate back to your dashboard or contact support if you believe this is an error.
        </p>
      </div>
    </div>
  );
};

export default CityOperationsHeadInput;
