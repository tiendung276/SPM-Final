import React from "react";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="navbar bg-white border-bottom" style={{ height: "60px" }}>
      <div className="container" style={{ maxWidth: "1200px" }}>
        {/* Option 1: Sử dụng đường dẫn thực */}
        <a className="navbar-brand d-flex align-items-center" href="/home">
          <img
            src="/assets/images/logo.png"
            alt="Crate Logo"
            style={{ height: "32px", marginRight: "8px" }}
          />
          <span style={{ fontWeight: "600" }}>crate</span>
        </a>

        <div className="d-flex justify-content-between">
          <ul className="nav me-4">
            <li className="nav-item">
              <a className="nav-link text-dark me-5" href="/about">
                About Us
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link  text-dark me-5" href="/products">
                Products
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link  text-dark me-5" href="/pricing">
                Pricing
              </a>
            </li>
          </ul>
          <div>
            <Link to="/login" className="btn btn-outline-secondary me-2">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-dark">
              Sign Up for Free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
