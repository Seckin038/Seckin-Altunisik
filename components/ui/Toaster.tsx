
import React from 'react';
import { Toaster as HotToaster, toast } from 'react-hot-toast';

export const Toaster = () => (
  <HotToaster
    position="top-center"
    reverseOrder={false}
    toastOptions={{
      duration: 3000,
      style: {
        background: '#333',
        color: '#fff',
      },
      success: {
        duration: 3000,
        theme: {
          primary: 'green',
          secondary: 'black',
        },
      },
    }}
  />
);

export { toast };
