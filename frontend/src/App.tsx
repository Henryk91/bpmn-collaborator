import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DiagramList from "./components/DiagramList";
import DiagramEditor from "./components/DiagramEditor";
import NotFound from "./components/NotFound";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="App">
        <Routes>
          <Route path="/" element={<DiagramList />} />
          <Route path="/diagram/:diagramId" element={<DiagramEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
