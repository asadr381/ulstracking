import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Import Routes instead of Switch
import './index.css';
import App from './App';
import ShipmentDetails from './shipment-details'; // Import your new component
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router> {/* Wrap your App with Router */}
      <Routes> {/* Use Routes to render routes */}
        <Route path="/" element={<App />} /> {/* Route for the main App */}
        <Route path="/shipment-details" element={<ShipmentDetails />} /> {/* Route for ShipmentDetails */}
      </Routes>
    </Router>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
