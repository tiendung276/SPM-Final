// export default TaskInfo;
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import "../../assets/css/TaskDetails/TaskInfo.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

// Helper functions
const TaskInfo = ({
  selectedTask,
  onTaskUpdate,
  onTitleChange,
  isTaskDetail,
  projectId,
  onTaskDelete,
}) => {
  const navigate = useNavigate();
  // State declarations
  const [copySuccess, setCopySuccess] = useState(false);
  const [title, setTitle] = useState(selectedTask?.title || "Research");
  const [description, setDescription] = useState(
    selectedTask?.description ||
    "User research helps you to create an optimal product for users."
  );
  const [status, setStatus] = useState("To do"); // Will be set based on selectedTask
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [startDate, setStartDate] = useState(
    selectedTask?.startDate ? new Date(selectedTask.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState(
    selectedTask?.endDate
      ? new Date(selectedTask.endDate)
      : (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
      })()
  );
  const [priority, setPriority] = useState(selectedTask?.priority || "High");
  const [tag, setTag] = useState(selectedTask?.task_tag || "");
  const [attachments, setAttachments] = useState(
    selectedTask?.attachments || []
  );
  const [links, setLinks] = useState(selectedTask?.links || []);
  const [isEditing, setIsEditing] = useState({
    title: false,
    description: false,
    status: false,
    dates: false,
    priority: false,
    tag: false,
    link: false,
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);

  // Axios instance and token getter
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
    console.log("Retrieved access token from storage:", accessToken);
    return accessToken;
  };

  // Status mapping for display and database
  const statusDisplayMapping = {
    TODO: "TO DO",
    IN_PROGRESS: "IN PROGRESS",
    DONE: "DONE",
    BACKLOG: "BACKLOG",
  };

  const statusDatabaseMapping = {
    "TO DO": "TODO",
    "IN PROGRESS": "IN_PROGRESS",
    DONE: "DONE",
    BACKLOG: "BACKLOG",
  };

  const statusOptions = ["TO DO", "IN PROGRESS", "DONE", "BACKLOG"];
  const priorityOptions = ["Critical", "High", "Mid", "Low"];
  // Fetch project members (users) for assignee dropdown
  useEffect(() => {
    const fetchProjectMembers = async () => {
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

        console.log("Fetching project members for project:", projectId);
        const response = await api.get(`/projects/${projectId}/users`, config);

        const members = Array.isArray(response.data)
          ? response.data.map((user, index) => ({
            id: index + 1,
            avatar: user.user_first_name
              ? user.user_first_name.charAt(0).toUpperCase()
              : "U",
            name: `${user.user_first_name || "Unknown"} ${user.user_last_name || "User"
              }`,
            emailAddress: user.user_email || "unknown@example.com",
            userId: user.user_id,
          }))
          : [];

        setProjectMembers(members);
        console.log("Project members set:", members);
      } catch (err) {
        console.error("Error fetching project members:", err);
        setError(
          "Failed to fetch project members: " +
          (err.response?.data?.detail || err.message)
        );
        setProjectMembers([]);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Authentication error. Please log in again.");
          navigate("/login");
        }
      }
    };

    fetchProjectMembers();
  }, [projectId, navigate]);

  // Fetch tags for tag dropdown
  useEffect(() => {
    const fetchTags = async () => {
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

        console.log("Fetching tags for project:", projectId);
        const response = await api.get(`/projects/${projectId}/tags`, config);

        const tags = Array.isArray(response.data)
          ? response.data.map((tag) => tag.tag_name || tag)
          : [];

        setTagOptions(["", ...tags]);
        console.log("Tags set:", ["", ...tags]);

        if (selectedTask?.task_tag) {
          setTag(selectedTask.task_tag);
        } else {
          setTag("");
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
        setError(
          "Failed to fetch tags: " + (err.response?.data?.detail || err.message)
        );
        setTagOptions([""]);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Authentication error. Please log in again.");
          navigate("/login");
        }
      }
    };

    fetchTags();
  }, [projectId, navigate, selectedTask]);

  // Fetch assignees and set initial task data
  useEffect(() => {
    const fetchAssignees = async () => {
      if (!selectedTask || !selectedTask.id) return;

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

        console.log("Fetching assignees for task:", selectedTask.id);
        const response = await api.get(
          `/projects/${projectId}/tasks/${selectedTask.id}/assignees`,
          config
        );

        if (
          response.data &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          const assignee = response.data[0];
          setAssigneeEmail(assignee.user_email || "");
        } else {
          setAssigneeEmail("");
        }
      } catch (err) {
        console.error("Error fetching assignees:", err);
        setAssigneeEmail("");
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Authentication error. Please log in again.");
          navigate("/login");
        }
      }
    };

    fetchAssignees();

    if (selectedTask) {
      setTitle(selectedTask.title || "Research");
      setDescription(
        selectedTask.description ||
        "User research helps you to create an optimal product for users."
      );
      // Map the database status to the display value
      const displayStatus =
        statusDisplayMapping[selectedTask.status] || "TO DO";
      setStatus(displayStatus);
      setStartDate(
        selectedTask.startDate ? new Date(selectedTask.startDate) : new Date()
      );
      setEndDate(
        selectedTask.endDate
          ? new Date(selectedTask.endDate)
          : (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
          })()
      );
      setPriority(selectedTask.priority || "High");
      setAttachments(selectedTask.attachments || []);
      setLinks(selectedTask.links || []);
      if (typeof onTitleChange === "function") {
        onTitleChange(selectedTask.title || "Research");
      }
    }
  }, [selectedTask, onTitleChange, navigate, projectId]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (!isTaskDetail) return;

      const newAttachments = [];
      for (const file of acceptedFiles) {
        try {
          const accessToken = getAccessToken();
          if (!accessToken) {
            throw new Error("No access token found in storage");
          }

          const formData = new FormData();
          formData.append("file", file);

          const config = {
            headers: {
              authentication: accessToken,
              "Content-Type": "multipart/form-data",
            },
          };

          console.log("Uploading attachment for task:", selectedTask.id);
          const response = await api.post(
            `/projects/tasks/${selectedTask.id}/upload-attachment`,
            formData,
            config
          );

          const attachmentUrl = response.data.url;
          newAttachments.push({
            name: file.name,
            type: file.type.split("/")[0],
            path: attachmentUrl,
            size: file.size,
          });
        } catch (err) {
          console.error("Error uploading attachment:", err);
          setError(
            "Failed to upload attachment: " +
            (err.response?.data?.detail || err.message)
          );
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    },
    [selectedTask, isTaskDetail]
  );

  const handleCopyLink = async () => {
    try {
      // Tạo URL để điều hướng đến TaskDetailToCopy
      const taskDetailUrl = `${window.location.origin}/task-detail/${projectId}/${selectedTask.id}`;
      await navigator.clipboard.writeText(taskDetailUrl);
      setCopySuccess(true);
      setShowMenu(false); // Ẩn menu sau khi copy link
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy link: ", err);
      alert("Failed to copy link. Please try again.");
    }
  };

  const handleFileClick = (filePath) => {
    window.open(filePath, "_blank");

  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    disabled: !isTaskDetail,
  });

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const assignUserToTask = async (taskId, userEmail) => {
    if (!taskId || !userEmail) {
      throw new Error("Task ID or user email is missing");
    }

    const user = projectMembers.find(
      (member) => member.emailAddress === userEmail
    );
    if (!user) {
      console.warn(`User not found for email: ${userEmail}. Skipping assign.`);

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
          "Content-Type": "application/json",
        },
      };
      const payload = { user_email: userEmail };
      console.log("Assigning user to task:", {
        projectId,
        taskId,
        userEmail,
        payload,
      });
      await api.post(
        `/projects/${projectId}/tasks/${taskId}/assign`,
        payload,
        config
      );
    } catch (err) {
      console.error("Error assigning user to task:", err);
      throw err;
    }
  };

  const unassignUserFromTask = async (taskId, userEmail) => {
    if (!taskId || !userEmail) {
      throw new Error("Task ID or user email is missing");
    }

    const user = projectMembers.find(
      (member) => member.emailAddress === userEmail
    );
    if (!user || !user.userId) {
      console.warn(
        `User ID not found for email: ${userEmail}. Skipping unassign.`
      );
      return;
    }
    const userId = user.userId;

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
      console.log("Unassigning user from task:", { projectId, taskId, userId });
      await api.delete(
        `/projects/${projectId}/tasks/${taskId}/unassign/${userId}`,
        config
      );
    } catch (err) {
      console.error("Error unassigning user from task:", err);
      throw err;
    }
  };

  const updateTask = async () => {
    if (!isTaskDetail || !selectedTask || !selectedTask.id) return;

    const member = projectMembers.find((m) => m.emailAddress === assigneeEmail);
    const assignees =
      assigneeEmail && member
        ? [
          {
            name: member.name,
            avatar: member.avatar,
            emailAddress: member.emailAddress,
            position: "Dev team",
          },
        ]
        : [];

    const updatedTask = {
      ...selectedTask,
      title,
      description,
      status,
      assignees,
      startDate,
      endDate,
      priority,
      task_tag: tag === "" ? null : tag,
      attachments,
      links,
    };

    const updateTaskPayload = {
      task_name: title,
      description: description,
      task_status: statusDatabaseMapping[status], // Map UI status to database status
      task_priority: priority.toUpperCase(),
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      attachments: attachments.map((att) => att.path),
      ...(tag !== selectedTask?.task_tag && {
        task_tag: tag || null,
      }),
    };

    console.log("Updating task with payload:", updateTaskPayload);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found in storage");
      }

      const config = {
        headers: {
          authentication: accessToken,
          "Content-Type": "application/json",
        },
      };

      const originalAssignees = (selectedTask.assignees || [])
        .map((a) => a.emailAddress)
        .filter((email) => email);
      const newAssigneeEmails = assignees
        .map((a) => a.emailAddress)
        .filter((email) => email);

      const assigneesToAdd = newAssigneeEmails.filter(
        (email) => !originalAssignees.includes(email)
      );
      const assigneesToRemove = originalAssignees.filter(
        (email) => !newAssigneeEmails.includes(email)
      );

      for (const email of assigneesToRemove) {
        if (email) {
          try {
            await unassignUserFromTask(selectedTask.id, email);
          } catch (err) {
            console.warn(`Failed to unassign user ${email}:`, err.message);
          }
        }
      }

      for (const email of assigneesToAdd) {
        if (email) {
          try {
            await assignUserToTask(selectedTask.id, email);
          } catch (err) {
            console.warn(`Failed to assign user ${email}:`, err.message);
          }
        }
      }

      console.log("Sending update request with payload:", updateTaskPayload);
      const response = await api.put(
        `/projects/${projectId}/tasks/${selectedTask.id}/update`,
        updateTaskPayload,
        config
      );

      console.log("Task updated successfully:", response.data);

      onTaskUpdate && onTaskUpdate(updatedTask);
      if (typeof onTitleChange === "function") {
        onTitleChange(title);
      }
      setError(null);
      setSuccessMessage("Task updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error updating task:", err);
      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          setError("Authentication error. Please log in again.");
          setTimeout(() => setError(null), 3000);
          navigate("/login");
        } else {
          setError(
            `Failed to update task: ${err.response.status} - ${err.response.data?.detail || err.message
            }`
          );
        }
      } else {
        setError(`Failed to update task: ${err.message}`);
        setTimeout(() => setError(null), 3000);
      }

      onTaskUpdate && onTaskUpdate(updatedTask);
      if (typeof onTitleChange === "function") {
        onTitleChange(title);
      }
    }
  };

  const handleEditClick = (task) => {
    navigate(`/project/${projectId}/task/${task.id}`, {
      state: { task, projectId },
    });
  };

  const DeleteConfirmationPopup = ({ taskTitle, onConfirm, onCancel }) => {
    return (
      <div className="popup-overlay">
        <div className="popup-content">
          <h3>Are you sure you want to delete this task?</h3>
          <p>
            You are about to delete "{taskTitle}". This action cannot be undone.
          </p>
          <div className="popup-buttons">
            <button className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
            <button className="confirm-btn" onClick={onConfirm}>
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) return;

    // Show the custom popup
    setShowDeletePopup(true);
  };

  const confirmDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) {
      setError("No task selected for deletion.");
      setTimeout(() => setError(null), 3000); // Tự động xóa sau 3 giây
      setShowDeletePopup(false);
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

      console.log("Deleting task:", selectedTask.id);
      const response = await api.delete(
        `/projects/${projectId}/tasks/${selectedTask.id}/delete`,
        config
      );

      setSuccessMessage("Task deleted successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
      window.location.reload();
      // Chuyển hướng hoặc gọi callback thay vì reload
      if (typeof onTaskDelete === "function") {
        onTaskDelete(selectedTask.id);
      }
      navigate(`/project/board/${projectId}`);
    } catch (err) {
      console.error("Error deleting task:", err);

      if (err.response) {
        const { status, data } = err.response;
        if (status === 403) {
          setError("You do not have permission to delete this task.");
          setTimeout(() => setError(null), 3000); // Tự động xóa thông báo sau 3 giây
        } else if (status === 401) {
          setError("Authentication error. Please log in again.");
          setTimeout(() => setError(null), 3000); // Tự động xóa thông báo sau 3 giây
          navigate("/login");
        } else {
          setError(`Failed to delete task: ${data?.detail || err.message}`);
          setTimeout(() => setError(null), 3000); // Tự động xóa thông báo sau 3 giây
        }
      } else {
        setError(`Failed to delete task: ${err.message}`);
        setTimeout(() => setError(null), 3000); // Tự động xóa thông báo sau 3 giây
      }
    } finally {
      setShowMenu(false);
      setShowDeletePopup(false);

    }
  };

  return (
    <div className="task-info">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      <div className="task-header mb-2">
        {!isTaskDetail && !isEditing.title && (
          <div className="position-relative d-flex justify-content-end">
            <img
              src="/assets/icons/3_dot.svg"
              alt="More options"
              className="list-icon active cursor-pointer"
              onClick={() => setShowMenu(!showMenu)}
              style={{ width: "32px", height: "32px" }}
            />
            {showMenu && (
              <div
                className="dropdown-menu show"
                style={{
                  position: "absolute",
                  top: "25px",
                  right: "0",
                  zIndex: 1000,
                  minWidth: "150px",
                  backgroundColor: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                }}
              >
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => handleEditClick(selectedTask)}
                >
                  <img
                    src="/assets/icons/edit_icon.svg"
                    alt="Edit"
                    style={{
                      width: "16px",
                      height: "16px",
                      marginRight: "8px",
                    }}
                  />
                  Edit Task
                </button>
                <button
                  className="dropdown-item d-flex align-items-center"
                  onClick={handleCopyLink}
                >
                  <img
                    src="/assets/icons/link_icon.svg"
                    alt="Copy Link"
                    style={{
                      width: "16px",
                      height: "16px",
                      marginRight: "8px",
                    }}
                  />
                  Copy Link
                  {copySuccess && (
                    <span
                      style={{
                        marginLeft: "5px",
                        color: "#28a745",
                        fontSize: "12px",
                      }}
                    >
                      Copied!
                    </span>
                  )}
                </button>
                <button
                  className="dropdown-item text-danger d-flex align-items-center"
                  onClick={handleDeleteTask}
                >
                  <img
                    src="/assets/icons/delete_icon.svg"
                    alt="Delete"
                    style={{
                      width: "16px",
                      height: "16px",
                      marginRight: "8px",
                    }}
                  />
                  Delete Task
                </button>
              </div>
            )}
          </div>
        )}
        <div className="d-flex align-items-center justify-content-between mb-2">
          {isTaskDetail && isEditing.title ? (
            <input
              type="text"
              className="task-title-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (typeof onTitleChange === "function") {
                  onTitleChange(e.target.value);
                }
              }}
              onBlur={() => {
                setIsEditing({ ...isEditing, title: false });
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  setIsEditing({ ...isEditing, title: false });
                }
              }}
              autoFocus
              style={{ flex: 1 }}
            />
          ) : (
            <h5
              className={`task-title ${!isTaskDetail ? "text-center" : ""}`}
              onClick={
                isTaskDetail
                  ? () => setIsEditing({ ...isEditing, title: true })
                  : undefined
              }
              style={{ cursor: isTaskDetail ? "pointer" : "default", flex: 1 }}
            >
              {title}
            </h5>
          )}
        </div>
      </div>
      {isTaskDetail && isEditing.description ? (
        <textarea
          className="task-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            setIsEditing({ ...isEditing, description: false });
          }}

          rows="3"
          autoFocus
        />
      ) : (
        <p
          className="task-description"

          onClick={
            isTaskDetail
              ? () => setIsEditing({ ...isEditing, description: true })
              : undefined
          }
          style={{ cursor: isTaskDetail ? "pointer" : "default" }}
        >
          {description}

        </p>
      )}

      <div className="task-info-grid">
        <div className="field">
          <label>Status</label>
          {isTaskDetail && isEditing.status ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              onBlur={() => {
                setIsEditing({ ...isEditing, status: false });
              }}
              autoFocus
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>

              ))}
            </select>
          ) : (
            <span
              className={`status-badge ${status
                .toLowerCase()
                .replace(" ", "-")}`}
              onClick={
                isTaskDetail
                  ? () => setIsEditing({ ...isEditing, status: true })
                  : undefined
              }
              style={{ cursor: isTaskDetail ? "pointer" : "default" }}

            >
              {status}
            </span>
          )}
        </div>
        <div className="field">
          <label>Assignee</label>
          {isTaskDetail ? (
            <select
              value={assigneeEmail}
              onChange={(e) => {
                setAssigneeEmail(e.target.value);
              }}
              style={{ width: "100%" }}
            >
              <option value="">No assignees</option>
              {projectMembers.map((member) => (
                <option key={member.id} value={member.emailAddress}>
                  {member.emailAddress}
                </option>
              ))}
            </select>
          ) : (
            <span>{assigneeEmail || "No assignees"}</span>
          )}
        </div>

        <div className="field dates-field">
          <label>Dates:</label>
          {isTaskDetail && isEditing.dates ? (
            <div className="date-picker-container">
              <div className="date-row">
                <div className="input-with-icon">
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => {
                      console.log("Selected start date:", date);
                      setStartDate(date);
                    }}
                    showTimeSelect={false}
                    dateFormat="MM/dd/yyyy"
                    className="date-input-small"
                  />
                  <img
                    src="/assets/icons/calendar_icon.svg"
                    alt="Calendar"
                    className="input-icon"
                  />
                </div>
              </div>
              <div className="date-row">
                <div className="input-with-icon">
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => {
                      console.log("Selected end date:", date);
                      setEndDate(date);
                    }}
                    minDate={startDate}
                    showTimeSelect={false}
                    dateFormat="MM/dd/yyyy"
                    className="date-input-small"
                  />
                  <img
                    src="/assets/icons/calendar_icon.svg"
                    alt="Calendar"
                    className="input-icon"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="date-view-container">
              <div className="date-view-row">
                <div
                  className="date-time-section"
                  onClick={
                    isTaskDetail
                      ? () =>
                        setIsEditing({
                          ...isEditing,
                          dates: true,
                          editingEnd: false,
                        })
                      : undefined
                  }
                  style={{ cursor: isTaskDetail ? "pointer" : "default" }}
                >
                  <img
                    src="/assets/icons/calendar_icon.svg"
                    alt="Calendar"
                    className="date-view-icon"
                  />
                  <span className="date-text">
                    {formatDisplayDate(startDate)}
                  </span>
                </div>
              </div>
              <div className="date-view-row">
                <div
                  className="date-time-section"
                  onClick={
                    isTaskDetail
                      ? () =>
                        setIsEditing({
                          ...isEditing,
                          dates: true,
                          editingEnd: true,
                        })
                      : undefined
                  }
                  style={{ cursor: isTaskDetail ? "pointer" : "default" }}
                >
                  <img
                    src="/assets/icons/calendar_icon.svg"
                    alt="Calendar"
                    className="date-view-icon"
                  />
                  <span className="date-text">
                    {formatDisplayDate(endDate)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="field">
          <label>Priority:</label>
          {isTaskDetail && isEditing.priority ? (
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              onBlur={() => {
                setIsEditing({ ...isEditing, priority: false });
              }}
              autoFocus
            >
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>

              ))}
            </select>
          ) : (
            <span
              className={`task-priority ${priority.toLowerCase()}`}
              onClick={
                isTaskDetail
                  ? () => setIsEditing({ ...isEditing, priority: true })
                  : undefined
              }
              style={{ cursor: isTaskDetail ? "pointer" : "default" }}       >
              {priority}
            </span>
          )}
        </div>
        <div className="field">
          <label>Tag</label>
          {isTaskDetail && isEditing.tag ? (
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onBlur={() => {
                setIsEditing({ ...isEditing, tag: false });
              }}
              autoFocus
            >
              {tagOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="task-tag"
              onClick={
                isTaskDetail
                  ? () => setIsEditing({ ...isEditing, tag: true })
                  : undefined
              }
              style={{ cursor: isTaskDetail ? "pointer" : "default" }}
            >
              <span
                className={`tag-indicator ${tag ? tag.toLowerCase().replace(/\s+/g, "-") : "no-tag"
                  }`}
              ></span>
              <span className="tag-text">{tag}</span>
            </div>

          )}
        </div>
      </div>

      <div className="attachments-section">
        <h4>Attachments</h4>
        {/* Conditionally render the dropzone only when isTaskDetail is true */}
        {isTaskDetail && (
          <div
            {...getRootProps()}
            className={`drop-zone ${isDragActive ? "active" : ""}`}
          >
            <input {...getInputProps()} />
            <p>
              {isDragActive
                ? "Drop files here"
                : "Drag & drop files, or click to select"}
            </p>
          </div>
        )}

        <div className="attachment-list">
          {attachments.map((file, index) => (
            <div
              key={index}
              className={`attachment ${file.type}`}
              onClick={() => handleFileClick(file.path)}
            >
              {file.type === "image" ? (

                <img src="/assets/icons/image_icon.svg" alt="Images" />
              ) : (
                <img src="/assets/icons/pdf_icon.svg" alt="PDF" />
              )}
              <span>{file.name}</span>
            </div>
          ))}
        </div>
      </div>
      {isTaskDetail && (
        <div className="update-task-section mt-3">
          <button className="btn btn-primary" onClick={updateTask}>
            Update Task
          </button>
        </div>
      )}

      {/* Render the Delete Confirmation Popup */}
      {showDeletePopup && (
        <DeleteConfirmationPopup
          taskTitle={selectedTask?.title || "this task"}
          onConfirm={confirmDeleteTask}
          onCancel={() => setShowDeletePopup(false)}
        />
      )}
    </div>
  );
};

export default TaskInfo;
