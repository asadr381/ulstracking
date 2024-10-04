import React, { useState } from "react";
import axios from "axios";
import './App.css';

function App() {
  const [trackingNumbers, setTrackingNumbers] = useState("");
  const [trackingData, setTrackingData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTime, setSearchTime] = useState(null);

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
          const response = await axios.get(`/track/${numbersArray[i]}`);
          const packageData = response.data.trackResponse?.shipment[0]?.package[0];
          const result = {
            number: numbersArray[i],
            data: packageData || null,
          };
  
          // Push the individual result into the results array
          results.push(result);
          
          // Update state with current results incrementally
          setTrackingData(prev => [...prev, result]);
  
        } catch (error) {
          console.error(`Error fetching data for ${numbersArray[i]}`, error);
          const result = {
            number: numbersArray[i],
            data: null,
          };
          
          // Push the error result and update state
          results.push(result);
          setTrackingData(prev => [...prev, result]);
        }
  
        // Update progress after each request
        setProgress(((i + 1) / totalNumbers) * 100);
  
        // Optional: Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
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
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {searchTime && <p>Total search time: {searchTime} seconds</p>}

      {trackingData.length > 0 && (
        <table>
          <thead>
            <tr>
              
              <th>Tracking Number</th>
              
<th>Status</th>
<th>Delivery Date</th>
<th>Last Scan</th>
<th>Time</th>
<th>Signed</th>
<th>Postal</th>
<th>City</th>
<th>Country</th>
<th>SL</th>
<th>Weight</th>
<th>Origin Country</th>
<th>Origin </th>
<th>PKG Count</th>
            </tr>
          </thead>
          <tbody>
            {trackingData.map((tracking, index) => (
              <tr key={index}>
                <td>{tracking.number}</td>
                <td>{tracking.data?.currentStatus?.description || "N/A"}</td>
                <td>{tracking.data?.deliveryDate?.[0]?.date || "N/A"}</td>
                <td>{tracking.data?.activity?.[0]?.status?.description || "No recent activity"}</td>
                <td>{tracking.data?.activity?.[0]?.time || "N/A"}</td>
                <td>{tracking.data?.activity?.[0]?.time || "N/A"}</td>
                <td>{tracking.data?.activity?.[0]?.location?.slic  || "N/A"}</td>
                <td>{tracking.data?.activity?.[0]?.location?.address?.city || "N/A"}</td>
                <td>{tracking.data?.activity?.[0]?.location?.address?.countryCode || "N/A"}</td>
                <td>{tracking.data?.service.description || "N/A"}</td>
                <td>{tracking.data?.weight.weight || "N/A"}</td>
                <td>{tracking.data?.activity?.[7]?.location?.address?.countryCode || "N/A"}</td>
                <td>{tracking.data?.activity?.[7]?.location?.address?.city || "N/A"}</td>
                <td>{tracking.data?.packageCount || "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && trackingData.length === 0 && <p>No tracking data available. Enter tracking numbers above.</p>}
    </div>
  );
}

export default App;
