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
import * as XLSX from 'xlsx';

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



  const downloadExcel = () => {
    if (trackingData.length === 0) {
      setError("No data available to download.");
      return;
    }

    // Prepare the data for export
    const worksheetData = trackingData.map(tracking => ({
      "Tracking Number": tracking.number,
      "ICIRS Number": tracking.data?.referenceNumber?.[1]?.number.slice(0, 6) || "N/A",
      "Status": tracking.data?.currentStatus?.description || "N/A",
      "Delivery Date": tracking.data?.deliveryDate?.[0]?.date || "N/A",
      "Last Scan": tracking.data?.activity?.[0]?.status?.description || "No recent activity",
      "Last Scan Country": tracking.data?.activity?.[0]?.location?.address?.countryCode || "No recent activity",
      "Time": tracking.data?.activity?.[0]?.time || "N/A",
      "Date": tracking.data?.activity?.[0]?.date || "N/A",
      "Signed By": tracking.data?.deliveryInformation?.receivedBy || "N/A",
      "Destination Country": tracking.data?.packageAddress?.[1]?.address?.countryCode || "N/A",
      "Destination City": tracking.data?.packageAddress?.[1]?.address?.city || "N/A",
      "Slic": tracking.data?.activity?.[0]?.location?.slic || "N/A",
      "Delivery Type": tracking.data?.deliveryInformation?.location || "N/A",
      "Service": tracking.data?.service?.description || "N/A",
      "Label Actual Weight": tracking.data?.weight?.weight || "N/A",
      "Origin Country": tracking.data?.packageAddress?.[0]?.address?.countryCode || "N/A",
      "Origin City": tracking.data?.packageAddress?.[0]?.address?.city || "N/A",
      "Package Count": tracking.data?.packageCount || "N/A",
      "Shipment Number": tracking.data?.referenceNumber?.[1]?.number || "N/A",
      "Width": tracking.data?.dimension?.width || "N/A",
      "Height": tracking.data?.dimension?.height || "N/A",
      "Length": tracking.data?.dimension?.length || "N/A",
    "Dimensional Weight": tracking.data?.dimension ? (() => {
  const dimWeight = (tracking.data.dimension.length * tracking.data.dimension.width * tracking.data.dimension.height) / 5000;
  if (dimWeight < 20) {
    return (Math.round(dimWeight * 2) / 2).toFixed(1); // Round to nearest 0.5 if under 20kg
  } else {
    return Math.round(dimWeight).toFixed(0); // Round to nearest 1kg if 20kg or over
  }
})() : "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tracking Data");

    // Download the Excel file
    XLSX.writeFile(workbook, "TrackingData.xlsx");
  };


  useEffect(() => {
    // Automatically uses wss:// for HTTPS and ws:// for HTTP
    const socket = io('https://liveusers-xtjj.onrender.com', {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Connected to Socket.io server');
    });

    socket.on('activeUsersCount', (count) => {
      setActiveUsers(count);
      console.log('Active users:', count);
      // Update your state or UI with the count here
    });

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



const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    let numbersArray = new Set(); // Use Set to store unique tracking numbers

    if (file.type === "text/plain") {
      // Split by newline for text files
      const lines = content.split(/\r?\n/);
      lines.forEach(line => {
        // Match tracking numbers starting with '1Z' followed by 16 alphanumeric characters
        const matches = line.match(/(1Z[A-Z0-9]{16})/g);
        if (matches) {
          matches.forEach(match => numbersArray.add(match)); // Add found matches to the Set
        }
      });
    } else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel") {
      // Read Excel file
      const workbook = XLSX.read(content, { type: 'binary' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      sheetData.flat()
        .map(num => num.toString().trim())
        .filter(num => /^1Z[A-Z0-9]{16}$/.test(num)) // Only include valid tracking numbers from Excel
        .forEach(validNum => numbersArray.add(validNum)); // Add each valid number to the Set
    }

    // Convert the Set to an array and join it with newline characters
    if (numbersArray.size > 0) {
      setTrackingNumbers(Array.from(numbersArray).join('\n'));
      setError(""); // Clear any previous error
    } else {
      setError("No valid tracking numbers found.");
    }
  };

  if (file.type === "text/plain") {
    reader.readAsText(file); // Use readAsText for plain text files
  } else {
    reader.readAsBinaryString(file); // Use readAsBinaryString for Excel files
  }
};


  return (
    <div className="App">
      <h1>Shipment Tracker</h1>
    


      <div className="active-users-container">
        <div className="dot"></div>
        Active Users: {activeUsers}
      </div>


      <textarea
        rows="10"
        cols="50"
        placeholder="Enter tracking numbers (separated by commas or new lines)"
        value={trackingNumbers}
        onChange={(e) => setTrackingNumbers(e.target.value)}
      />
    


    <input
  id="file-upload"
  type="file"
  accept=".txt,.xlsx,.xls"
  onChange={handleFileUpload}
  className="upload-input" // Class for styling
  style={{ display: 'none' }} // Hide default input
/>

<label className="upload-label" htmlFor="file-upload">
  Upload File
</label>


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
      <button onClick={downloadExcel} disabled={trackingData.length === 0}>
        Download Excel
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
         const referenceNumber1 = tracking.data?.referenceNumber?.find(ref => ref.code === "13")?.number || "N/A";

         const firstSixDigits = referenceNumber1.slice(0, 6);
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
           referenceNumber1,
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
