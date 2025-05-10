import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../Sidebar";
import TaskDetailToCopy from "./TaskDetailToCopy";
import axios from "axios";
import Header from "../Header";
import "../../assets/css/TaskDetails/CopyTaskDetail.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

const CopyTaskDetail = () => {
  const navigate = useNavigate();
  const { projectId, taskId } = useParams(); // Get projectId and taskId from the URL
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);

  console.log("CopyTaskDetail - projectId:", projectId, "taskId:", taskId);

  // Axios instance
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
    console.log("Access token:", accessToken);
    return accessToken;
  };

  // Fetch task details based on projectId and taskId
  useEffect(() => {
    const fetchTask = async () => {
      if (!projectId || !taskId) {
        setError("Project ID or Task ID is missing");
        navigate("/project/board");
        return;
      }

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
        };

        // Fetch the task details using projectId and taskId
        const response = await api.get(
          `/projects/${projectId}/tasks/${taskId}`,
          config
        );
        const taskData = response.data;

        // Format the task data to match the expected structure
        const formattedTask = {
          id: taskData.task_id,
          title: taskData.task_name || "Research",
          description:
            taskData.description ||
            "User research helps you to create an optimal product for users.",
          status: taskData.task_status
            ? taskData.task_status
              .toLowerCase()
              .replace("_", " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())
            : "To do",
          startDate: taskData.start_date
            ? new Date(taskData.start_date)
            : new Date(),
          endDate: taskData.end_date
            ? new Date(taskData.end_date)
            : (() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow;
            })(),
          priority: taskData.task_priority
            ? taskData.task_priority.charAt(0).toUpperCase() +
            taskData.task_priority.slice(1).toLowerCase()
            : "High",
          task_tag: taskData.task_tag || "Dev",
          attachments: taskData.attachments
            ? taskData.attachments.map((url, index) => ({
              name: `report${index + 1}.pdf`,
              type: "application/pdf",
              path: url,
              size: 105.52, // Placeholder size
            }))
            : [],
          links: taskData.links || [],
          assignees: taskData.assignees || [],
        };

        setTask(formattedTask);
      } catch (err) {
        console.error("Error fetching task:", err);
        setError(
          "Failed to fetch task details: " +
          (err.response?.data?.detail || err.message)
        );
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login");
        } else {
          navigate("/project/board");
        }
      }
    };

    fetchTask();
  }, [projectId, taskId, navigate]);

  if (error) {
    return (
      <div className="d-flex vh-100 overflow-hidden">
        <Sidebar />
        <div className="main-content d-flex flex-column flex-grow-1">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="d-flex vh-100 overflow-hidden">
        <Sidebar />
        <div className="main-content d-flex flex-column flex-grow-1">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex vh-100 overflow-hidden">
      <Sidebar />
      <div className="main-content d-flex flex-column flex-grow-1">
        <Header />
        <TaskDetailToCopy task={task} projectId={projectId} />
      </div>
    </div>
  );
};

export default CopyTaskDetail;
