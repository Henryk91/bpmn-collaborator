import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound: React.FC = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <div className="not-found-animation">
          <div className="bpmn-node start-event"></div>
          <div className="bpmn-flow"></div>
          <div className="bpmn-node task error-node">
            <span>Missing Path</span>
          </div>
          <div className="bpmn-flow"></div>
          <div className="bpmn-node end-event error-end"></div>
        </div>
        <p className="not-found-message">Oops! The process flow seems to have hit a dead end.</p>
        <p className="not-found-submessage">The diagram you are looking for doesn't exist or has been moved.</p>
        <Link to="/" className="back-home-button">
          Explore Diagrams
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
