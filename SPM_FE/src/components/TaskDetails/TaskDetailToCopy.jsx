import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TaskInfoToCopy from "./TaskInfoToCopy";
import SidebarRight from "./SidebarRight";
import Sidebar from "../Sidebar";
import Header from "../Header";
import axios from "axios";
import "../../assets/css/TaskDetails/TaskDetailToCopy.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

const TaskDetailToCopy = () => {
  const navigate = useNavigate();
  const { projectId, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [error, setError] = useState(null);
  const [showComments, setShowComments] = useState(true);

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      accept: "application/json",
    },
    withCredentials: true,
  });

  const getAccessToken = () => {
    const accessToken =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    console.log("Access token:", accessToken);
    return accessToken;
  };

  useEffect(() => {
    const fetchProjectName = async () => {
      if (!projectId) return;

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

        const response = await api.get(`/projects/${projectId}`, config);
        setProjectName(response.data.project_name || "Untitled Project");
      } catch (err) {
        console.error("Error fetching project name:", err);
        setError("Failed to fetch project name");
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login");
        }
      }
    };

    fetchProjectName();
  }, [projectId, navigate]);

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

        const response = await api.get(
          `/projects/${projectId}/tasks/${taskId}`,
          config
        );
        const taskData = response.data;

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
          task_tag: taskData.task_tag || "NO TAG",
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
          <Header />
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
          <Header />
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
        <div className="task-detail-header">
          <h4 className="task-detail-title">
            {`${projectName} / ${task.title}`}
          </h4>
        </div>
        <div className="scrollable-content-detail d-flex flex-grow-1">
          <div className="task-info-wrapper">
            <TaskInfoToCopy selectedTask={task} projectId={projectId} />
          </div>
          <div className="sidebar-right-wrapper">
            <SidebarRight
              showComments={showComments}
              setShowComments={setShowComments}
              comments={[
                {
                  id: 1,
                  author: "Nguyen Minh Hieu",
                  text: "Comfort & Concentration - Pomodoro - Warm Lo-Fi in a Cozy Room for Focus & Relaxation",
                  date: "02/16/25 09:25 AM",
                  replies: [],
                },
                {
                  id: 2,
                  author: "U ba kien tan",
                  text: "hello mn, cho mình hỏi cách tích điểm để sửa lại ý, để cao lên sua chừng nào mà Đạt luôn thread chưa dò mò",
                  date: "02/19/25 12:25 PM",
                  replies: [],
                },
                {
                  id: 3,
                  author: "Nguyen Minh Hieu",
                  text: "Comfort & Concentration - Pomodoro - Warm Lo-Fi in a Cozy Room for Focus & Relaxation",
                  date: "02/16/25 09:25 AM",
                  replies: [],
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailToCopy;
