import React, { useState, useRef } from "react";
import axios from "axios";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import './App.css';

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

    try {
      const results = [];

      for (let i = 0; i < totalNumbers; i++) {
        try {
          const response = await axios.get('${apiBaseUrl}/${numbersArray[i]}');
          const packageData = response.data.trackResponse?.shipment[0]?.package[0];
          const result = {
            number: numbersArray[i],
            data: packageData || null,
          };
          results.push(result);
          setTrackingData(prev => [...prev, result]);
        } catch (error) {
          console.error(Error fetching data for '${numbersArray[i]}', error);
          const result = {
            number: numbersArray[i],
            data: null,
          };
          results.push(result);
          setTrackingData(prev => [...prev, result]);
        }

        setProgress(((i + 1) / totalNumbers) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error("Error fetching tracking data", error);
      setError("An error occurred while fetching tracking data.");
    } finally {
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      setSearchTime(totalTime.toFixed(2));
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Shipment Tracker</h1>

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

      {loading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: ${progress}% }}></div>
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

            return [
              tracking.number,
              tracking.data?.currentStatus?.description || "N/A",
              tracking.data?.deliveryDate?.[0]?.date || "N/A",
              tracking.data?.activity?.[0]?.status?.description || "No recent activity",
              tracking.data?.activity?.[0]?.time || "N/A",
              tracking.data?.deliveryInformation?.receivedBy || "N/A",
              tracking.data?.packageAddress?.[1]?.address?.countryCode || "N/A",
              tracking.data?.packageAddress?.[1]?.address?.city || "N/A",
              tracking.data?.activity?.[0]?.location?.slic || "N/A",
              tracking.data?.deliveryInformation?.location || "N/A",
              tracking.data?.service?.description || "N/A",
              tracking.data?.weight?.weight || "N/A",
              tracking.data?.packageAddress?.[0]?.address?.countryCode || "N/A",
              tracking.data?.packageAddress?.[0]?.address?.city || "N/A",
              tracking.data?.packageCount || "N/A",
              tracking.data?.referenceNumber?.[0]?.number || "N/A",
              tracking.data?.dimension?.height || "N/A",
              tracking.data?.dimension?.length || "N/A",
              tracking.data?.dimension?.width|| "N/A",
              dimWeight ? dimWeight.toFixed(2) : "N/A",
            ];
          })}
          width="auto"
          height="auto"
          colWidths={100}
          rowHeights={23}
          rowHeaders={true}
          colHeaders={[
            "Tracking Number",
            "Status",
            "Delivery Date",
            "Last Scan",
            "Time",
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
            "Shipper Number",
            "Width",
            "Height",
            "Length",
            "Label Dim Weight"
          ]}
          filters={true}
          dropdownMenu={true}
          selectionMode="multiple"
          autoWrapRow={true}
          autoWrapCol={true}
          licenseKey="non-commercial-and-evaluation"
        />
      )}

      {!loading && trackingData.length === 0 && <p>No tracking data available. Enter tracking numbers above.</p>}
    </div>
  );
}

export default App;
