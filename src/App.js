// src/App.js
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { MotorsProvider } from './context/MotorsContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

// Component to control layout logic based on route
function AppContent() {
  return (
    <main>
      <AppRoutes />
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MotorsProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </MotorsProvider>
    </ThemeProvider>
  );
}

export default App;
