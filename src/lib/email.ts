
import { Resend } from 'resend';

const resend = new Resend('re_QB91z1qu_P5fTzi6n47Ejf1f7vCD1ajap');

interface ServeAttemptEmailProps {
  to: string;
  caseNumber: string;
  attemptNumber: number;
  caseName: string;
  defendantName: string;
  serviceAddress: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  notes: string;
  date: string;
}

export const sendServeAttemptEmail = async ({
  to,
  caseNumber,
  attemptNumber,
  caseName,
  defendantName,
  serviceAddress,
  photoUrl,
  latitude,
  longitude,
  notes,
  date
}: ServeAttemptEmailProps) => {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  
  const emailHtml = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .content {
            padding: 20px 0;
          }
          .details {
            margin-bottom: 30px;
          }
          .detail-row {
            display: flex;
            margin-bottom: 10px;
          }
          .detail-label {
            width: 150px;
            font-weight: bold;
          }
          .detail-value {
            flex: 1;
          }
          .photo {
            margin: 20px 0;
            text-align: center;
          }
          .photo img {
            max-width: 100%;
            border-radius: 8px;
            border: 1px solid #eee;
          }
          .notes {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .gps {
            margin-top: 20px;
          }
          .gps a {
            color: #3366cc;
            text-decoration: none;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Service Attempt Notification</h1>
            <p>Case #${caseNumber} - Attempt #${attemptNumber}</p>
          </div>
          
          <div class="content">
            <div class="details">
              <div class="detail-row">
                <div class="detail-label">Case Name:</div>
                <div class="detail-value">${caseName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Defendant:</div>
                <div class="detail-value">${defendantName}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Service Address:</div>
                <div class="detail-value">${serviceAddress}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Attempt Date:</div>
                <div class="detail-value">${date}</div>
              </div>
            </div>
            
            <div class="photo">
              <h3>Service Attempt Photo</h3>
              <img src="${photoUrl}" alt="Service Attempt Photo" />
            </div>
            
            <div class="notes">
              <h3>Server Notes:</h3>
              <p>${notes || 'No notes provided.'}</p>
            </div>
            
            <div class="gps">
              <h3>Location Information:</h3>
              <p>GPS Coordinates: ${latitude}, ${longitude}</p>
              <p><a href="${googleMapsUrl}" target="_blank">View on Google Maps</a></p>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from your process server. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Service Notifications <notifications@justlegalsolutions.tech>',
      to: [to],
      subject: `Case #${caseNumber} - Service Attempt #${attemptNumber}`,
      html: emailHtml,
    });
    
    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
