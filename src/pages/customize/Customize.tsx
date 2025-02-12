import React from 'react';
import { useLocation } from 'react-router-dom';
import CustomizationTool from '../../components/CustomizationTool';

interface LocationState {
  selectedProduct?: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
  };
}

export default function Customize() {
  const location = useLocation();
  const { selectedProduct } = location.state as LocationState || {};

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <CustomizationTool initialProduct={selectedProduct} />
      </div>
    </div>
  );
}