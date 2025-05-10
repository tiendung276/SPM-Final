import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../../assets/css/ProjectPage/ProjectPageHeader.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

const TaskPageHeader = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [projectName, setProjectName] = useState("All Tasks");
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("todo");

  // Create axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      accept: "application/json",
    },
    withCredentials: true,
  });

  // Get access token from storage
  const getAccessToken = () => {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    console.log("Retrieved access token from storage:", accessToken);
    return accessToken;
  };

  // Fetch project details
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

  // Fetch project name on mount
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
        setProjectName("All Tasks");
      }
    };

    fetchProjectName();
  }, [projectId]);

  // Handle Create Task button click
  const handleCreateTask = () => {
    if (!projectId) {
      console.error("No project ID provided");
      return;
    }
    navigate(`/task/add/${selectedStatus}`, { state: { projectId } });
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      const projectUrl = `${window.location.origin}/project/board/${projectId}`;
      await navigator.clipboard.writeText(projectUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
      alert("Failed to copy link. Please try again.");
    }
  };

  return (
    <div className="task-header-container px-4 py-3">
      {/* Breadcrumb navigation */}
      <div className="breadcrumb-1 mb-2">
        <span className="text-mu">{projectName}</span>
        <span className="text-mu"> / </span>
        <span className="text-mu">All Tasks</span>
      </div>

      {/* Main header row */}
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : (
            <>
              <h1
                className="fw-bold task-title m-0"
                style={{ fontSize: "44px", color: "#1A1F4A" }}
              >
                All Tasks
              </h1>
              <div className="position-relative">
                <img
                  src="/assets/icons/project_page_icon.svg"
                  alt="Copy Link"
                  className="app-icon"
                  onClick={handleCopyLink}
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

        {/* Create Task button */}
        <button
          className="btn create-task-btn d-flex align-items-center gap-1"
          onClick={handleCreateTask}
          style={{
            backgroundColor: "#FF5733",
            color: "white",
            borderRadius: "20px",
            padding: "8px 16px",
            fontWeight: "500",
            border: "none",
          }}
        >
          <span className="plus-icon" style={{ fontSize: "16px" }}>
            +
          </span>
          <span>Create Task</span>
        </button>
      </div>
    </div>
  );
};

export default TaskPageHeader;
