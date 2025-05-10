import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../../assets/css/ProjectPage/ProjectPageHeader.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

const ProjectPageHeader = () => {
  const [projectName, setProjectName] = useState("All Tasks"); // Default to "All Tasks"
  const [error, setError] = useState(null); // State to handle errors
  const [copySuccess, setCopySuccess] = useState(false); // State để hiển thị thông báo sao chép thành công
  const { projectId } = useParams(); // Get projectId from URL

  // Create axios instance with proper configuration
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      accept: "application/json",
    },
    withCredentials: true, // Enable sending cookies with requests
  });

  // Get access token from storage
  const getAccessToken = () => {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    console.log("Retrieved access token from storage:", accessToken);
    return accessToken;
  };

  // Fetch project details to get the project name
  const fetchProjectDetails = async (projectId, config) => {
    try {
      const response = await api.get(`/projects/${projectId}`, config);
      console.log(`Project details for project ${projectId}:`, response.data);
      return response.data.project_name || "All Tasks";
    } catch (err) {
      console.error(
        `Error fetching project details for project ${projectId}:`,
        err
      );
      setError(
        `Failed to fetch project details: ${err.response?.status} - ${err.response?.data?.detail || err.message
        }`
      );
      return "All Tasks";
    }
  };

  // Fetch the project name when the component mounts
  useEffect(() => {
    const fetchProjectName = async () => {
      try {
        const accessToken = getAccessToken();
        if (!accessToken) {
          throw new Error("No access token found in storage");
        }

        if (!projectId) {
          throw new Error("No project ID provided");
        }

        const config = {
          headers: {
            authentication: accessToken,
            accept: "application/json",
          },
        };

        const fetchedProjectName = await fetchProjectDetails(projectId, config);
        setProjectName(fetchedProjectName);
      } catch (err) {
        console.error("Error fetching project name:", err);
        setError(err.message);
        setProjectName("All Tasks"); // Fallback project name
      }
    };

    fetchProjectName();
  }, [projectId]); // Re-fetch if projectId changes

  // Handle copying the project link
  const handleCopyLink = async () => {
    try {
      const projectUrl = `${window.location.origin}/project/board/${projectId}`;
      await navigator.clipboard.writeText(projectUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hiển thị "Copied!" trong 2 giây
    } catch (err) {
      console.error("Failed to copy link: ", err);
      alert("Failed to copy link. Please try again.");
    }
  };

  return (
    <div className="project-header-container">
      {/* Breadcrumb navigation */}
      <div className="breadcrumb mb-2">
        <span className="text-mu">{projectName}</span>
        <span className="text-mu"> / </span>
        <span className="text-mu">All Tasks</span>
      </div>

      {/* Project title and icon */}
      <div className="d-flex justify-content-between align-items-center project-header">
        <div className="d-flex align-items-center mx-4 gap-1">
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : (
            <>
              <h1 className="fw-bold project-title">All Tasks</h1>
              <div className="position-relative">
                <img
                  src="/assets/icons/project_page_icon.svg"
                  alt="Copy Link"
                  className="app-icon cursor-pointer"
                  onClick={handleCopyLink} // Gắn sự kiện click vào icon
                  style={{ cursor: "pointer" }}
                />
                {copySuccess && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-25px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      color: "#28a745",
                      fontSize: "12px",
                      backgroundColor: "#fff",
                      padding: "2px 5px",
                      borderRadius: "3px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    Copied!
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPageHeader;
