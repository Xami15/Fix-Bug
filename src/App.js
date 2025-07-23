// src/App.js
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { MotorsProvider } from './context/MotorsContext';
import { ThemeProvider } from './context/ThemeContext';
import Topbar from './components/Topbar';

// Component to control layout logic based on route
function AppContent() {
  const location = useLocation();

  // All routes where Topbar should be hidden
  const hideTopbarOnPaths = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password' ,
    
  ];

  // If current path matches any in the list, hide the Topbar
  const shouldHideTopbar = hideTopbarOnPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideTopbar && <Topbar />}
      <main>
        <AppRoutes />
      </main>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MotorsProvider>
        <Router>
          <AppContent />
        </Router>
      </MotorsProvider>
    </ThemeProvider>
  );
}

export default App;
