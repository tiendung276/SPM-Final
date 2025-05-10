import React from "react";

const SocialButtons = () => {
  return (
    <div className="text-center">
      <div className="d-flex justify-content-center gap-3">
        <button
          className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: "52px", height: "52px" }}
        >
          <img src="/assets/icons/google_icon.svg" alt="Google" width="52" />
        </button>
        <button
          className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: "52px", height: "52px" }}
        >
          <img src="/assets/icons/apple_icon.svg" alt="Apple" width="52" />
        </button>
        <button
          className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: "52px", height: "52px" }}
        >
          <img src="/assets/icons/fb_icon.svg" alt="Facebook" width="52" />
        </button>
      </div>
    </div>
  );
};

export default SocialButtons;
