// src/pages/History.jsx
import React, { useState, useMemo } from "react";
import { useMotors } from "../context/MotorsContext";
import './History.css';

const statusColors = {
  Healthy: "#28a745",
  Warning: "#ffc107",
  Fault: "#dc3545",
  Initialized: "#6c757d", // Optional: gray for "Initialized"
  Disconnected: "#6c757d",
};

const History = () => {
  const { historyData = [], motors = [] } = useMotors();

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    motor: "All",
    status: "All",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "desc",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const validMotorNames = useMemo(() => motors.map((m) => m.name), [motors]);

  const motorOptions = useMemo(() => ["All", ...validMotorNames], [validMotorNames]);

  const filteredData = useMemo(() => {
    return historyData.filter((log) => {
      if (!validMotorNames.includes(log.motor)) return false;

      const logDate = new Date(log.timestamp);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;

      if (startDate && logDate < startDate) return false;
      if (endDate && logDate > endDate) return false;
      if (filters.motor !== "All" && log.motor !== filters.motor) return false;
      if (filters.status !== "All" && log.status !== filters.status) return false;

      return true;
    });
  }, [filters, historyData, validMotorNames]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "timestamp") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage]);

  const summaryCounts = useMemo(() => {
    return filteredData.reduce(
      (acc, log) => {
        if (log.status === "Healthy") acc.healthy++;
        else if (log.status === "Warning") acc.warning++;
        else if (log.status === "Fault") acc.fault++;
        return acc;
      },
      { healthy: 0, warning: 0, fault: 0 }
    );
  }, [filteredData]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "", motor: "All", status: "All" });
  };

  return (
    <div className="history-container">
      <h1>Prediction History</h1>

      <section className="history-filter-section">
        <label>
          Start Date:
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="history-input" />
        </label>

        <label>
          End Date:
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="history-input" />
        </label>

        <label>
          Motor:
          <select name="motor" value={filters.motor} onChange={handleFilterChange} className="history-select">
            {motorOptions.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          Status:
          <select name="status" value={filters.status} onChange={handleFilterChange} className="history-select">
            <option value="All">All</option>
            <option value="Healthy">Healthy</option>
            <option value="Warning">Warning</option>
            <option value="Fault">Fault</option>
            <option value="Initialized">Initialized</option>
            <option value="Disconnected">Disconnected</option>
          </select>
        </label>

        <button onClick={clearFilters} className="history-clear-button">Clear Filters</button>
      </section>

      <section style={{ marginBottom: 16, display: "flex", gap: 16, fontWeight: "600", fontSize: 14 }}>
        <div style={{ color: statusColors.Healthy }}>Healthy: {summaryCounts.healthy}</div>
        <div style={{ color: statusColors.Warning }}>Warning: {summaryCounts.warning}</div>
        <div style={{ color: statusColors.Fault }}>Fault: {summaryCounts.fault}</div>
      </section>

      <table className="history-table">
        <thead className="history-table-header">
          <tr>
            <th onClick={() => handleSort("timestamp")}>Timestamp {sortConfig.key === "timestamp" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("motor")}>Motor {sortConfig.key === "motor" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("status")}>Status {sortConfig.key === "status" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("confidence")}>Confidence (%) {sortConfig.key === "confidence" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("temperature")}>Temperature (°C) {sortConfig.key === "temperature" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
            <th onClick={() => handleSort("vibration")}>Vibration {sortConfig.key === "vibration" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ padding: 12, textAlign: "center" }}>No records found.</td>
            </tr>
          ) : (
            paginatedData.map((log) => (
              <tr key={log.id} className="history-table-row">
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.motor}</td>
                <td style={{ color: statusColors[log.status] || "#000", fontWeight: "600" }}>{log.status}</td>
                <td>{log.confidence}%</td>
                <td>{parseFloat(log.temperature).toFixed(1)}</td>
                <td>{parseFloat(log.vibration).toFixed(2)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="history-pagination">
        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="history-pagination-button">{"<<"}</button>
        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="history-pagination-button">{"<"}</button>
        <span className="history-pagination-info">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="history-pagination-button">{">"}</button>
        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="history-pagination-button">{">>"}</button>
      </div>
    </div>
  );
};

export default History;
