// src/components/Sidebar.jsx
import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import {
  Home,
  Activity,
  BarChart,
  Clock,
  Info,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dashboard", icon: <Home size={20} /> },
  { name: "Live Data", path: "/live-data", icon: <Activity size={20} /> },
  { name: "Prediction", path: "/prediction", icon: <BarChart size={20} /> },
  { name: "History", path: "/history", icon: <Clock size={20} /> },
  { name: "Overview", path: "/overview", icon: <Info size={20} /> },
  { name: "Settings", path: "/settings", icon: <Settings size={20} /> },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="header">
        {!collapsed && <h2 className="title">SEP MONITOR</h2>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="toggle-btn"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <ul>
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              end
            >
              <span className="icon">{item.icon}</span>
              {!collapsed && <span className="text">{item.name}</span>}
              {collapsed && <span className="tooltip">{item.name}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
