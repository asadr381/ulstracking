import React, { useState, useRef, useEffect  } from "react";
import axios from "axios";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import Handsontable from "handsontable"; // Import Handsontable
import "handsontable/dist/handsontable.full.min.css";
import './App.css';
import { useNavigate, Routes, Route } from 'react-router-dom';
import ShipmentDetails from './shipment-details';
import { io } from "socket.io-client"; 

// Register Handsontable's modules
registerAllModules();

function App() {
  const [trackingNumbers, setTrackingNumbers] = useState("");
  const [trackingData, setTrackingData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTime, setSearchTime] = useState(null);
  const hotRef = useRef(null); // Ref for Handsontable instance
  const abortControllerRef = useRef(null); // Ref to manage abort controller
  const navigate = useNavigate();
  const [activeUsers, setActiveUsers] = useState(0);
  


  useEffect(() => {
    // Connect to WebSocket server
    const socket = io("https://liveusers-xtjj.onrender.com"); // Replace with your server URL

    // Listen for updates on user count
    socket.on("userCount", (count) => {
      setActiveUsers(count);
    });

    // Clean up on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);
  // Dynamically set the API URL based on the environment
  const apiBaseUrl = process.env.NODE_ENV === 'development'
    ? '/track' // Proxy will handle this in development
    : 'https://excel-api-0x2r.onrender.com/track'; // Full URL for production

  const handleTrack = async () => {
    setError(null);
    setLoading(true);
    setTrackingData([]);
    setProgress(0);
    setSearchTime(null);

    const numbersArray = trackingNumbers.split(/\n|,/).map(num => num.trim()).filter(num => num !== "");

    if (numbersArray.length === 0) {
      setError("Please enter at least one tracking number.");
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    const totalNumbers = numbersArray.length;

    abortControllerRef.current = new AbortController(); // Initialize abort controller

    try {
      const results = [];

      for (let i = 0; i < totalNumbers; i++) {
        try {
          const response = await axios.get(`${apiBaseUrl}/${numbersArray[i]}`, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json',
            },
            signal: abortControllerRef.current.signal, // Pass the abort signal
          });
          const packageData = response.data.trackResponse?.shipment[0]?.package[0];
          const result = {
            number: numbersArray[i],
            data: packageData || null,
          };
          results.push(result);
          setTrackingData(prev => [...prev, result]);
        } catch (error) {
          if (axios.isCancel(error)) {
            console.log("Request canceled");
            break; // Stop the loop if tracking is stopped
          }
          console.error(`Error fetching data for ${numbersArray[i]}`, error);
          const result = {
            number: numbersArray[i],
            data: null,
          };
          results.push(result);
          setTrackingData(prev => [...prev, result]);
        }

        setProgress(((i + 1) / totalNumbers) * 100);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (error) {
      console.error("Error fetching tracking data", error);
      setError("An error occurred while fetching tracking data.");
    } finally {
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      setSearchTime(totalTime.toFixed(0));
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Cancel the ongoing requests
      setLoading(false); // Update loading state
    }
  };

  const handleViewDetails = (trackingNumber) => {
  window.open(`/shipment-details?trackingNumber=${trackingNumber}`);
  };

  // Custom renderer for the button
    const buttonRenderer = (hotInstance, td, row, col, prop, value, cellProperties) => {
    Handsontable.dom.empty(td);
    const button = document.createElement('button');
    button.innerText = "View Details";
 // Use rem for better responsiveness
    button.style.padding = '0.1rem 1rem'; // Use rem units for padding
    button.style.fontSize = '1rem'; // Keep font size consistent
    button.style.margin = '0 0.25rem'; // Adjust margins with rem
    button.style.width = 'auto'; // Let the button size adapt
    td.style.padding = '1'; // Ensure no extra padding around the cell
    td.style.verticalAlign = 'middle';
    button.onclick = () => handleViewDetails(trackingData[row].number);
    td.appendChild(button);
};

  return (
    <div className="App">
      <h1>Shipment Tracker</h1>
      <div style={{ position: "absolute", top: "10px", right: "10px", backgroundColor: "#f0f0f0", padding: "10px", borderRadius: "5px" }}>
        Active Users: {activeUsers}
      </div>

      <textarea
        rows="10"
        cols="50"
        placeholder="Enter tracking numbers (separated by commas or new lines)"
        value={trackingNumbers}
        onChange={(e) => setTrackingNumbers(e.target.value)}
      />

      <button onClick={handleTrack} disabled={loading || trackingNumbers.trim() === ""}>
        {loading ? "Tracking..." : "Track Shipments"}
      </button>

      <button
        onClick={handleStop}
        disabled={!loading}
        style={{
          backgroundColor: "red",
          color: "white",
          padding: "10px 20px",
          border: "none",
          cursor: loading ? "pointer" : "not-allowed",
          opacity: loading ? 1 : 0.5, // Dim the button when disabled
        }}
      >
        Stop Tracking
      </button>

      {loading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {searchTime && <p>Total search time: {searchTime} seconds</p>}

      {trackingData.length > 0 && (
       <HotTable
       ref={hotRef}
       data={trackingData.map(tracking => {
         const height = tracking.data?.dimension?.height || 0;
         const length = tracking.data?.dimension?.length || 0;
         const width = tracking.data?.dimension?.width || 0;
         const dimWeight = (length * width * height) / 5000;
         const referenceNumber = tracking.data?.referenceNumber?.[0]?.number || "N/A";
         const firstSixDigits = referenceNumber.slice(0, 6);
         const deliveryDate = tracking.data?.deliveryDate?.[0]?.date;
         const formattedDeliveryDate = deliveryDate 
           ? `${deliveryDate.slice(0, 4)}-${deliveryDate.slice(4, 6)}-${deliveryDate.slice(6, 8)}`
           : "N/A";
         const lastScanActivity = tracking.data?.activity?.[0] || {};
         const lastScanDate = lastScanActivity.date;
         const formattedLastScanDate = lastScanDate 
           ? `${lastScanDate.slice(0, 4)}-${lastScanDate.slice(4, 6)}-${lastScanDate.slice(6, 8)}`
           : "N/A";
         const lastScanTime = lastScanActivity.time;
         const formattedLastScanTime = lastScanTime
           ? `${lastScanTime.slice(0, 2)}:${lastScanTime.slice(2, 4)}:${lastScanTime.slice(4, 6)}`
           : "N/A";
     
         return [
           "", // Placeholder for the button column, handled separately
           tracking.number, // Ensure the tracking number is explicitly included
           firstSixDigits, 
           tracking.data?.currentStatus?.description || "N/A",
           formattedDeliveryDate,
           lastScanActivity.status?.description || "No recent activity",
           lastScanActivity.location?.address?.countryCode || "No recent activity",
           formattedLastScanTime,
           formattedLastScanDate,
           tracking.data?.deliveryInformation?.receivedBy || "N/A",
           tracking.data?.packageAddress?.[1]?.address?.countryCode || "N/A",
           tracking.data?.packageAddress?.[1]?.address?.city || "N/A",
           lastScanActivity.location?.slic || "N/A",
           tracking.data?.deliveryInformation?.location || "N/A",
           tracking.data?.service?.description || "N/A",
           tracking.data?.weight?.weight || "N/A",
           tracking.data?.packageAddress?.[0]?.address?.countryCode || "N/A",
           tracking.data?.packageAddress?.[0]?.address?.city || "N/A",
           tracking.data?.packageCount || "N/A",
           tracking.data?.referenceNumber?.[0]?.number || "N/A",
           tracking.data?.dimension?.height || "N/A",
           tracking.data?.dimension?.length || "N/A",
           tracking.data?.dimension?.width || "N/A",
           dimWeight ? dimWeight.toFixed(2) : "N/A",
         ];
       })}
    width="100%"
       height="500px"
       rowHeaders={true}
       colHeaders={[
         "View Details", // Moved to the first column
         "Tracking Number",
         "ICIRS Number",
         "Status",
         "Delivery Date",
         "Last Scan",
         "Last Scan Country",
         "Time",
         "Date",
         "Signed By",
         "Destination Country",
         "Destination City",
         "Slic",
         "Delivery Type",
         "Service",
         "Label Actual Weight",
         "Origin Country",
         "Origin City",
         "Package Count",
         "Shipment Number",
         "Width",
         "Height",
         "Length",
         "Dimensional Weight"
       ]}
       columns={[
         { renderer: buttonRenderer }, // Move button renderer to the first column
         {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
       ]}
          columnSorting={true}
          dropdownMenu={true}
          filters={true}
          manualColumnResize={true}
          manualRowResize={true}
          licenseKey="non-commercial-and-evaluation" // Replace with your Handsontable license key if needed
          
          beforeCopy={(data, coords) => {
            const hotInstance = hotRef.current.hotInstance;
            const totalRows = hotInstance.countRows();
        
            // Check if the selection covers entire columns
            const isFullColumnSelection = coords.every(range =>
              range.startRow === 0 && range.endRow === totalRows - 1
            );
        
            if (isFullColumnSelection) {
              // Determine the columns that are selected
              const startCol = coords[0].startCol;
              const endCol = coords[0].endCol;
        
              // Get the headers of the selected columns
              const headers = [];
              for (let col = startCol; col <= endCol; col++) {
                headers.push(hotInstance.getColHeader(col));
              }
        
              // Add headers as the first row in the copied data
              data.unshift(headers);
            }
          }}

        />
      )}

      <Routes>
        <Route path="/shipment-details" element={<ShipmentDetails />} />
      </Routes>
    </div>
  );
}

export default App;
