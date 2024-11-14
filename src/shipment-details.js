import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import './ShipmentDetails.css';

const ShipmentDetails = () => {
  const [searchParams] = useSearchParams();
  const trackingNumber = searchParams.get('trackingNumber');
  const [shipmentDetails, setShipmentDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = process.env.NODE_ENV === 'development'
    ? '/track'
    : 'https://excel-api-0x2r.onrender.com/track';

  useEffect(() => {
    const fetchShipmentDetails = async () => {
      if (!trackingNumber) {
        setError("Tracking number not provided.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${apiBaseUrl}/${trackingNumber}`, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        });
        const packageData = response.data.trackResponse?.shipment[0]?.package[0];

        if (packageData) {
          const height = packageData.dimension?.height || 0;
          const length = packageData.dimension?.length || 0;
          const width = packageData.dimension?.width || 0;
          const dimWeight = (length * width * height) / 5000;
   const referenceNumber = packageData.referenceNumber?.find(ref => ref.code === "13")?.number || "N/A";
          const firstSixDigits = referenceNumber.slice(0, 6);
          const deliveryDate = packageData.deliveryDate?.[0]?.date;
          const formattedDeliveryDate = deliveryDate 
            ? `${deliveryDate.slice(0, 4)}-${deliveryDate.slice(4, 6)}-${deliveryDate.slice(6, 8)}`
            : "N/A";

            const formattedActivities = packageData.activity?.map(activity => {
              return {
                date: activity.date ? `${activity.date.slice(0, 4)}-${activity.date.slice(4, 6)}-${activity.date.slice(6, 8)}` : "",
                description: activity.status.description || "",
                city: activity.location.address.city || "",
                country: activity.location.address.country || "",
                time: activity.gmtTime || ""
              };
            }) || [];
            

          const formattedLastScanDate = formattedActivities[0]?.date || "N/A";
          const formattedLastScanTime = formattedActivities[0]?.time || "N/A";
          const lastScanCountry = formattedActivities[0]?.country || "N/A";

          setShipmentDetails({
            number: trackingNumber,
            firstSixDigits,
            currentStatus: packageData.currentStatus?.description || "",
            formattedDeliveryDate,
            formattedActivities,
            formattedLastScanDate,
            formattedLastScanTime,
            lastScanCountry,
            receivedBy: packageData.deliveryInformation?.receivedBy || "",
            destinationCountry: packageData.packageAddress?.[1]?.address?.countryCode || "",
            destinationCity: packageData.packageAddress?.[1]?.address?.city || "",
            originCountry: packageData.packageAddress?.[0]?.address?.countryCode || "",
            originCity: packageData.packageAddress?.[0]?.address?.city || "",
            packageCount: packageData.packageCount || "",
            dimWeight: dimWeight ? dimWeight.toFixed(2) : "",
            weight: packageData.weight?.weight || "",
            service: packageData.service?.description || ""
          });
        } else {
          setError("No shipment details found.");
        }
      } catch (error) {
        console.error("Error fetching shipment details", error);
        setError("An error occurred while fetching shipment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchShipmentDetails();
  }, [trackingNumber, apiBaseUrl]);

  if (loading) {
    return <p>Loading shipment details...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!shipmentDetails) {
    return <p>No details found for this tracking number.</p>;
  }

  const { 
    number, 
    firstSixDigits, 
    currentStatus, 
    formattedDeliveryDate, 
    formattedActivities, 
    formattedLastScanDate, 
    formattedLastScanTime, 
    lastScanCountry, 
    receivedBy, 
    destinationCountry, 
    destinationCity, 
    originCountry, 
    originCity, 
    packageCount, 
    dimWeight, 
    weight, 
    service 
  } = shipmentDetails;

  return (
    <div className="shipment-details">
      <h2>Shipment Details for {number}</h2>
      <div className="details-grid">
        <div><strong>ICIRS Number:</strong> {firstSixDigits}</div>
        <div><strong>Status:</strong> {currentStatus}</div>
        <div><strong>Delivery Date:</strong> {formattedDeliveryDate}</div>
        <div><strong>Last Scan Date:</strong> {formattedLastScanDate} at {formattedLastScanTime} GMT</div>
        <div><strong>Last Scan Country:</strong> {lastScanCountry}</div>
        <div><strong>Received By:</strong> {receivedBy}</div>
        <div><strong>Destination Country:</strong> {destinationCountry}</div>
        <div><strong>Destination City:</strong> {destinationCity}</div>
        <div><strong>Origin Country:</strong> {originCountry}</div>
        <div><strong>Origin City:</strong> {originCity}</div>
        <div><strong>Package Count:</strong> {packageCount}</div>
        <div><strong>Dimension Weight:</strong> {dimWeight}</div>
        <div><strong>Weight:</strong> {weight}</div>
        <div><strong>Service:</strong> {service}</div>
      </div>

      <div className="timeline">
        <h3>Shipment Lifecycle</h3>
        {formattedActivities.map((activity, index) => (
          <div key={index} className="timeline-item">
            <h3>{activity.city} {activity.country}</h3>
            <p>{activity.description} on {activity.date} at {activity.time} GMT</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShipmentDetails;
