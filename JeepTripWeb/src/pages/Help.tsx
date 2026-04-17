import { useLanguage } from '../context/LanguageContext';
import './Help.css';

// Importing local assets
import DASHBOARD_IMG from '../assets/images/dashboard_screenshot.png';
import CREATE_IMG from '../assets/images/create_mission_screenshot.png';
import DETAILS_IMG from '../assets/images/trip_details_screenshot.png';

export default function Help() {
  const { isRTL } = useLanguage();
  const rtl = isRTL ? 'rtl' : '';

  return (
    <div className="help-page screen-container">
      <div className={`help-hero ${rtl}`}>
        <h1>{isRTL ? 'מרכז העזרה של JeepTrip' : 'JeepTrip Help Center'}</h1>
        <p>{isRTL ? 'כל מה שצריך לדעת כדי לכבוש את השטח' : 'Everything you need to know to conquer the terrain'}</p>
      </div>

      <div className="screen-content">
        {/* Section 1: Dashboard */}
        <div className="help-section">
          <h2><span>📊</span> {isRTL ? 'מסך הבית וההתארגנות' : 'Dashboard & HQ'}</h2>
          <div className="help-grid">
            <div className="help-card">
              <h3>{isRTL ? 'סקירה כללית' : 'General Overview'}</h3>
              <p>
                  ? 'במסך הבית תוכלו לראות את הטיולים הקרובים אליהם נרשמתם, וסטטיסטיקה על הפעילות שלכם בשטח.'
                  : 'On the dashboard, you can see upcoming missions you joined and statistics about your off-road activity.'}
              </p>
              <div className="pro-tip">
                <strong>💡 Pro Tip:</strong> {isRTL ? 'לחצו על כרטיס טיול כדי להיכנס לצאט ולצפות במפה.' : 'Click on a mission card to enter the chat and view the map.'}
              </div>
            </div>
            <div className="help-image-container">
              <img src={DASHBOARD_IMG} alt="Dashboard" className="help-image" />
            </div>
          </div>
        </div>

        {/* Section 2: Creating a Trip */}
        <div className="help-section">
          <h2><span>➕</span> {isRTL ? 'יצירת טיול חדש' : 'Creating a New Mission'}</h2>
          <div className="help-grid">
            <div className="help-image-container">
              <img src={CREATE_IMG} alt="Create Trip" className="help-image" />
            </div>
            <div className="help-card">
              <h3>{isRTL ? 'איך פותחים טיול?' : 'How to start a trip?'}</h3>
              <p>
                {isRTL
                  ? 'לחצו על כפתור הפלוס, הזינו כותרת, תאריך ומיקום. אל תשכחו להעלות קובץ מסלול (GPX/KML) כדי שהחברים יוכלו לנווט.'
                  : 'Click the plus button, enter a title, date, and location. Don\'t forget to upload a route file (GPX/KML) so friends can navigate.'}
              </p>
              <div className="pro-tip">
                <strong>🔒 Privacy:</strong> {isRTL ? 'טיול "חסוי" לא תופיע ברשימה הציבורית אלא רק למי שתשלחו לו קישור.' : 'A "Hidden" mission won\'t appear in public lists, only for those you send a link to.'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Trip Details & Chat */}
        <div className="help-section">
          <h2><span>🗺️</span> {isRTL ? 'בתוך הטיול - המפה והצאט' : 'Inside the Mission - Map & Chat'}</h2>
          <div className="help-grid">
            <div className="help-card">
              <h3>{isRTL ? 'תקשורת וניווט' : 'Communication & Navigation'}</h3>
              <p>
                {isRTL
                  ? 'כל טיול כולל צאט ייעודי לתקשורת בזמן אמת. המפה מציגה את המסלול ונקודת המפגש שבחר המארגן.'
                  : 'Every mission includes a dedicated chat for real-time communication. The map shows the route and the meeting point chosen by the organizer.'}
              </p>
              <div className="pro-tip">
                <strong>💬 Chat:</strong> {isRTL ? 'ניתן לשלוח תמונות וסרטונים ישירות מהשטח כדי לעדכן על מצב העבירות.' : 'You can send photos and videos directly from the field to update on terrain conditions.'}
              </div>
            </div>
            <div className="help-image-container">
              <img src={DETAILS_IMG} alt="Trip Details" className="help-image" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
