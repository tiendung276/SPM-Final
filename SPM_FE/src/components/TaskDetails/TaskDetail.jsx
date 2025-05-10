import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import TaskInfo from "./TaskInfo";
import SidebarRight from "./SidebarRight";
import "../../assets/css/TaskDetails/TaskDetail.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

// Sample comments data (can be fetched from API if needed)
const commentsData = [];

const TaskDetail = ({ onClose, onTaskUpdate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, taskId } = useParams();
  const locationState = location.state || {};
  const [selectedTask, setSelectedTask] = useState(locationState.task);

  // State declarations
  const [showComments, setShowComments] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [error, setError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [updatedTask, setUpdatedTask] = useState(selectedTask);

  // Axios instance with cancellation support
  const sourceRef = useRef(null);

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      accept: "application/json",
    },
    withCredentials: true,
  });

  // Helper function to get access token
  const getAccessToken = () => {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    console.log("Retrieved access token from storage:", accessToken);
    return accessToken;
  };

  // Lấy thông tin returnToModule và returnPath từ location state
  const { returnToModule, returnPath } = locationState;

  // Fetch task details if not provided in location state
  const fetchTaskDetails = useCallback(async () => {
    if (!taskId || !projectId || isFetching || selectedTask) return;

    setIsFetching(true);
    setError(null);

    if (sourceRef.current) {
      sourceRef.current.cancel("Operation canceled due to new request.");
    }
    sourceRef.current = axios.CancelToken.source();

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found in storage");
      }

      const config = {
        headers: {
          authentication: accessToken,
          accept: "application/json",
        },
        cancelToken: sourceRef.current.token,
      };

      const response = await api.get(`/projects/${projectId}/tasks/${taskId}`, config);

      if (response.data) {
        const task = {
          id: response.data.task_id,
          title: response.data.task_name || "Untitled Task",
          description: response.data.description || "",
          status: mapStatusToUI(response.data.task_status),
          priority: response.data.task_priority ?
            response.data.task_priority.charAt(0).toUpperCase() +
            response.data.task_priority.slice(1).toLowerCase() : "Medium",
          task_tag: response.data.task_tag || "",
          startDate: response.data.start_date ? new Date(response.data.start_date) : new Date(),
          endDate: response.data.end_date ? new Date(response.data.end_date) : new Date(),
          assignees: []  // We'll fetch assignees separately if needed
        };
        setSelectedTask(task);
        setUpdatedTask(task);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request canceled:", err.message);
        return;
      }
      console.error("Error fetching task details:", err);
      setError("Failed to fetch task details");
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setIsFetching(false);
    }
  }, [projectId, taskId, navigate, isFetching, selectedTask]);

  // Helper function to map API status to UI status
  const mapStatusToUI = (apiStatus) => {
    switch (apiStatus) {
      case "TODO":
      case "BACKLOG":
        return "To do";
      case "IN_PROGRESS":
        return "In Progress";
      case "DONE":
        return "Done";
      default:
        return apiStatus;
    }
  };

  // Fetch project name based on projectId
  const fetchProjectName = useCallback(async () => {
    if (!projectId || isFetching) return;
    setIsFetching(true);
    setError(null);

    if (sourceRef.current) {
      sourceRef.current.cancel("Operation canceled due to new request.");
    }
    sourceRef.current = axios.CancelToken.source();

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found in storage");
      }

      const config = {
        headers: {
          authentication: accessToken,
          accept: "application/json",
        },
        cancelToken: sourceRef.current.token,
      };

      const response = await api.get(`/projects/${projectId}`, config);
      setProjectName(response.data.project_name || "Untitled Project");
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request canceled:", err.message);
        return;
      }
      console.error("Error fetching project name:", err);
      setError("Failed to fetch project name");
      setProjectName("Untitled Project");
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login");
      }
    } finally {
      setIsFetching(false);
    }
  }, [projectId, navigate, isFetching]);

  // Fetch data on mount
  useEffect(() => {
    if (projectId) {
      fetchProjectName();
    }

    fetchTaskDetails();

    // Cleanup on unmount
    return () => {
      if (sourceRef.current) {
        sourceRef.current.cancel("Component unmounted.");
      }
    };
  }, [projectId, fetchProjectName, fetchTaskDetails]);

  // Sync updatedTask with selectedTask
  useEffect(() => {
    if (selectedTask) {
      setUpdatedTask(selectedTask);
    }
  }, [selectedTask]);

  // Handle closing the task detail view
  const handleClose = () => {
    // Kiểm tra xem có quay lại module không
    if (returnToModule && returnPath) {
      navigate(returnPath);
    } else {
      navigate(`/project/board/${projectId}`);
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle task updates from TaskInfo
  const handleTaskUpdate = (newTask) => {
    setUpdatedTask(newTask);
    if (onTaskUpdate) {
      onTaskUpdate(newTask);
    }
  };

  // Redirect if no data is available and we're not loading
  if (!isFetching && !selectedTask && !taskId) {
    navigate(`/project/board/${projectId || ""}`);
    return null;
  }

  // Show loading state
  if (isFetching && !selectedTask) {
    return (
      <div className="task-detail-popup">
        <div className="task-detail-content">
          <div className="d-flex justify-content-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-popup">
      <div className="task-detail-content">
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="task-detail-header">
          <h4 className="task-detail-title">
            {`${projectName}${updatedTask?.title ? ` / ${updatedTask.title}` : ""}`}
          </h4>
          <button
            className="close-btn"
            onClick={handleClose}
            aria-label="Close"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="task-main-body">
          <div className="task-info-container">
            {updatedTask && (
              <TaskInfo
                selectedTask={updatedTask}
                onTaskUpdate={handleTaskUpdate}
                isTaskDetail={true}
                projectId={projectId}
              />
            )}
          </div>

          <div className="sidebar-right-container">
            <SidebarRight
              showComments={showComments}
              setShowComments={setShowComments}
              comments={commentsData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
