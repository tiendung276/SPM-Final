import React, { useState, useEffect } from "react";
import { Dropdown, DropdownButton, ButtonGroup } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../../assets/css/ProjectPage/ProjectTaskList.css";
import config from '../../config/config';

const { API_BASE_URL } = config;

// Helper function to get initials from a name
const getInitials = (name) => {
  if (!name || name === "Unassigned") return "UA";
  const words = name.split(" ");
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
};

// Helper function to generate a consistent random color based on the name
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
    "#3498DB",
    "#E74C3C",
    "#2ECC71",
  ];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// TaskRow component for individual task items
const TaskRow = ({ task, onTaskSelect, isSelected, assignFilter }) => {
  const renderAssigneeInfo = () => {
    const allAssignees = task.assignees || [task.assignee];
    let displayAssignees = [];

    if (assignFilter === "All") {
      displayAssignees = allAssignees;
    } else {
      displayAssignees = allAssignees.filter(
        (assignee) => assignee.name === assignFilter
      );
    }

    if (displayAssignees.length === 0) {
      displayAssignees = allAssignees;
    }

    const primaryAssignee =
      displayAssignees.length > 0 ? displayAssignees[0] : null;
    const initials = getInitials(primaryAssignee?.name);
    const avatarColor = stringToColor(primaryAssignee?.name || "Unassigned");

    return (
      <div className="assignee-info d-flex align-items-center">
        {primaryAssignee ? (
          <>
            <div
              className="avatar-initials-a"
              style={{ backgroundColor: avatarColor }}
              title={primaryAssignee.name}
            >
              {initials}
            </div>
            <span className="assignee-name-kanban-a">
              {primaryAssignee.name}
              {displayAssignees.length > 1 &&
                ` +${displayAssignees.length - 1}`}
            </span>
          </>
        ) : (
          <span className="assignee-name">Unassigned</span>
        )}
      </div>
    );
  };

  return (
    <tr
      className={`task-row ${isSelected ? "selected" : ""}`}
      onClick={() => onTaskSelect(task)}
    >
      <td className="name-cell">
        <div className="task-name">{task.title}</div>
      </td>
      <td className="status-cell">
        <span
          className={`status-badge ${task.status
            .toLowerCase()
            .replace(/\s+/g, "")}`}
        >
          {task.status}
        </span>
      </td>
      <td className="tag-cell">{task.task_tag || "No Tag"}</td>
      <td className="priority-cell">
        <span
          className={`priority-badge ${task.priority
            .toLowerCase()
            .replace(/\s+/g, "")}`}
        >
          {task.priority}
        </span>
      </td>
      <td className="assign-cell">{renderAssigneeInfo()}</td>
      <td className="date-cell">{formatDate(task.createdAt)}</td>
    </tr>
  );
};

// Helper function to format dates
const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to check if a date is within a specific time range
const isDateInRange = (dateStr, range) => {
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const currentDay = today.getDay();
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - currentDay);

  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + (6 - currentDay));
  endOfThisWeek.setHours(23, 59, 59, 999);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const endOfLastWeek = new Date(endOfThisWeek);
  endOfLastWeek.setDate(endOfLastWeek.getDate() - 7);

  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfThisMonth.setHours(23, 59, 59, 999);

  switch (range) {
    case "Today":
      return date >= today && date < tomorrow;
    case "This Week":
      return date >= startOfThisWeek && date <= endOfThisWeek;
    case "Last Week":
      return date >= startOfLastWeek && date <= endOfLastWeek;
    case "This Month":
      return date >= startOfThisMonth && date <= endOfThisMonth;
    case "All Time":
      return true;
    default:
      return true;
  }
};

// Main ProjectTaskList component
const ProjectTaskList = ({ onTaskSelect, onTaskUpdate, onViewChange }) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [tagFilter, setTagFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [assignFilter, setAssignFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [currentView, setCurrentView] = useState("List");
  const [tasks, setTasks] = useState([]);
  const [assigneeOptions, setAssigneeOptions] = useState(["All"]);
  const [tagOptions, setTagOptions] = useState(["All"]);
  const [priorityOptions, setPriorityOptions] = useState(["All"]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    page_size: 100,
    total_pages: 0,
  });

  const navigate = useNavigate();
  const { projectId } = useParams();

  // Create axios instance with proper configuration
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

  // Fetch project details to get the project name
  const fetchProjectDetails = async (projectId, config) => {
    try {
      const response = await api.get(`/projects/${projectId}`, config);
      console.log(`Project details for project ${projectId}:`, response.data);
      return response.data.project_name || "Unknown Project";
    } catch (err) {
      console.error(
        `Error fetching project details for project ${projectId}:`,
        err
      );
      setError((prev) =>
        prev
          ? `${prev}\nFailed to fetch project details: ${err.message}`
          : `Failed to fetch project details: ${err.message}`
      );
      return "Unknown Project";
    }
  };

  // Fetch assignees for a task
  const fetchAssignees = async (taskId, config) => {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/assignees`,
        config
      );
      console.log(`Assignees for task ${taskId}:`, response.data);
      return Array.isArray(response.data) ? response.data : [];
    } catch (err) {
      console.log(`No assignees found for task ${taskId}:`, err.message);
      return [];
    }
  };

  // Fetch tags from API
  const fetchTags = async () => {
    try {
      if (!projectId) {
        console.log("No project ID provided for fetching tags");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        throw new Error("No token found in storage");
      }

      const config = {
        headers: {
          authentication: token,
          accept: "application/json",
        },
      };

      const response = await api.get(`/projects/${projectId}/tags`, config);

      const tags = Array.isArray(response.data)
        ? response.data.map((tag) => tag.tag_name || tag)
        : [];

      setTagOptions(["All", ...tags]);
    } catch (err) {
      console.error("Error fetching tags:", err);
      setTagOptions(["All", "Design", "FE", "BE", "DevOps"]);
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        setError("Authentication error. Please log in again.");
        navigate("/login");
      }
    }
  };

  // Fetch priorities from API
  const fetchPriorities = async () => {
    try {
      if (!projectId) {
        console.log("No project ID provided for fetching priorities");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        throw new Error("No token found in storage");
      }

      const config = {
        headers: {
          authentication: token,
          accept: "application/json",
        },
      };

      // Assuming an endpoint exists for fetching priorities
      const response = await api.get(
        `/projects/${projectId}/priorities`,
        config
      );

      const priorities = Array.isArray(response.data)
        ? response.data.map((priority) => priority.priority_name || priority)
        : [];

      setPriorityOptions(["All", ...priorities]);
    } catch (err) {
      console.error("Error fetching priorities:", err);
      // Fallback to hardcoded values as in ProjectKanban
      setPriorityOptions(["All", "High", "Mid", "Low", "Critical"]);
      if (
        err.response &&
        (err.response.status === 401 || err.response.status === 403)
      ) {
        setError("Authentication error. Please log in again.");
        navigate("/login");
      }
    }
  };

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);
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

        // Fetch project details to get the project name
        const fetchedProjectName = await fetchProjectDetails(projectId, config);
        setProjectName(fetchedProjectName);

        // Fetch tags and priorities
        await Promise.all([fetchTags(), fetchPriorities()]);

        // Fetch all tasks
        const response = await api.get(
          `/projects/${projectId}/tasks/${pagination.page}/${pagination.page_size}`,
          config
        );

        const apiTasks = Array.isArray(response.data.tasks)
          ? response.data.tasks
          : [];
        setPagination(
          response.data.pagination || {
            total: 0,
            page: 0,
            page_size: 100,
            total_pages: 0,
          }
        );

        // Fetch assignees for each task and include task_tag
        const tasksWithAssignees = await Promise.all(
          apiTasks.map(async (task) => {
            const assignees = await fetchAssignees(task.task_id, config);
            return {
              id: task.task_id,
              title: task.task_name || "Untitled Task",
              status: mapStatus(task.task_status),
              projectName: fetchedProjectName,
              createdAt: task.created_at
                ? new Date(task.created_at)
                : new Date(),
              type: task.type || "Unknown",
              priority: task.task_priority
                ? task.task_priority.charAt(0).toUpperCase() +
                task.task_priority.slice(1).toLowerCase()
                : "Medium",
              description: task.description || "",
              task_tag: task.task_tag || "No Tag",
              assignees: assignees.length
                ? assignees.map((assignee) => ({
                  name: `${assignee.user_first_name || "Unknown"} ${assignee.user_last_name || "User"
                    }`,
                  avatar: "/assets/images/avt.png",
                  emailAddress: assignee.user_email || "unknown@example.com",
                }))
                : [
                  {
                    name: "Unassigned",
                    avatar: "/assets/images/avt.png",
                    emailAddress: "unassigned@example.com",
                  },
                ],
              startDate: task.start_date
                ? new Date(task.start_date)
                : new Date(),
              endDate: task.end_date ? new Date(task.end_date) : new Date(),
              position: "Dev team",
              phoneNumber: "555-123-4567",
              totalUsers: 0,
              attachments: [],
            };
          })
        );

        const allAssigneesSet = new Set();
        tasksWithAssignees.forEach((task) => {
          task.assignees.forEach((assignee) => {
            if (assignee.name !== "Unassigned") {
              allAssigneesSet.add(assignee.name);
            }
          });
        });
        setAssigneeOptions(["All", ...Array.from(allAssigneesSet)]);

        // Giữ lại task hiện tại và thêm mới khi load more
        setTasks(prevTasks => {
          if (pagination.page === 0) {
            return tasksWithAssignees;
          } else {
            // Loại bỏ các task trùng lặp bằng ID
            const existingIds = new Set(prevTasks.map(task => task.id));
            const newTasks = tasksWithAssignees.filter(task => !existingIds.has(task.id));
            return [...prevTasks, ...newTasks];
          }
        });

        // Chỉ đặt loading là false khi load trang đầu hoặc khi đã load xong
        setLoading(false);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        if (err.response) {
          if (err.response.status === 401 || err.response.status === 403) {
            setError("Lỗi xác thực. Vui lòng đăng nhập lại.");
            navigate("/login");
          } else {
            setError(
              `Không thể tải tasks: ${err.response.status} - ${err.response.data?.detail || err.message
              }. Kiểm tra xem project ID có hợp lệ và endpoint có tồn tại không.`
            );
            setLoading(false);

            const demoTasks = [];

            const allAssignees = new Set();
            demoTasks.forEach((task) => {
              task.assignees.forEach((assignee) => {
                if (assignee.name !== "Unassigned") {
                  allAssignees.add(assignee.name);
                }
              });
            });
            setAssigneeOptions(["All", ...Array.from(allAssignees)]);
            setProjectName("Project 0");
            setTasks(demoTasks);
          }
        } else {
          setError(`Không thể tải tasks: ${err.message}`);
          setLoading(false);
        }
      }
    };

    if (projectId) {
      fetchTasks();
    } else {
      setError("Không có project ID được cung cấp");
      setLoading(false);
    }
  }, [projectId, pagination.page, navigate]);

  // Helper function to map API status to display status
  const mapStatus = (apiStatus) => {
    switch (apiStatus) {
      case "TODO":
      case "BACKLOG":
        return "To do";
      case "IN_PROGRESS":
        return "In progress";
      case "DONE":
        return "Done";
      default:
        return apiStatus;
    }
  };

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case "tag":
        setTagFilter(value);
        break;
      case "time":
        setTimeFilter(value);
        break;
      case "assign":
        setAssignFilter(value);
        break;
      case "status":
        setStatusFilter(value);
        break;
      case "priority":
        setPriorityFilter(value);
        break;
      default:
        break;
    }
  };

  // Handle view change
  const handleViewChange = (view) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      if (view === "List") navigate(`/project/list/${projectId}`);
      else if (view === "Board") navigate(`/project/board/${projectId}`);
    }
  };

  // Filter tasks based on selected filters
  const getFilteredTasks = () => {
    return tasks.filter((task) => {
      const tagMatch = tagFilter === "All" || task.task_tag === tagFilter;
      const statusMatch =
        statusFilter === "All" || task.status === statusFilter;
      const priorityMatch =
        priorityFilter === "All" || task.priority === priorityFilter;
      const timeMatch = isDateInRange(task.createdAt, timeFilter);
      const assignees = task.assignees || [task.assignee];
      const assignMatch =
        assignFilter === "All" ||
        assignees.some((assignee) => assignee.name === assignFilter);

      return (
        tagMatch && statusMatch && priorityMatch && timeMatch && assignMatch
      );
    });
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  };

  const filteredTasks = getFilteredTasks();

  // Load more tasks if needed
  const loadMoreTasks = () => {
    if (pagination.page < pagination.total_pages - 1) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  };

  // Filter component
  const ProjectFilters = ({
    tagFilter,
    timeFilter,
    assignFilter,
    statusFilter,
    priorityFilter,
    onFilterChange,
    currentView,
    onViewChange,
    assigneeOptions,
    tagOptions,
    priorityOptions,
  }) => {
    return (
      <div className="filter-container d-flex align-items-center mb-3">
        <div className="filter-group">
          <DropdownButton
            as={ButtonGroup}
            title={`Tag: ${tagFilter}`}
            id="dropdown-tag"
            variant="outline-secondary"
            className="me-2 filter-dropdown"
            onSelect={(value) => onFilterChange("tag", value)}
          >
            {tagOptions.map((option) => (
              <Dropdown.Item key={option} eventKey={option}>
                {option}
              </Dropdown.Item>
            ))}
          </DropdownButton>

          <DropdownButton
            as={ButtonGroup}
            title={`Time: ${timeFilter}`}
            id="dropdown-time"
            variant="outline-secondary"
            className="me-2 filter-dropdown"
            onSelect={(value) => onFilterChange("time", value)}
          >
            <Dropdown.Item eventKey="Today">Today</Dropdown.Item>
            <Dropdown.Item eventKey="This Week">This Week</Dropdown.Item>
            <Dropdown.Item eventKey="Last Week">Last Week</Dropdown.Item>
            <Dropdown.Item eventKey="This Month">This Month</Dropdown.Item>
            <Dropdown.Item eventKey="All Time">All Time</Dropdown.Item>
          </DropdownButton>

          <DropdownButton
            as={ButtonGroup}
            title={`Assign: ${assignFilter}`}
            id="dropdown-assign"
            variant="outline-secondary"
            className="me-2 filter-dropdown"
            onSelect={(value) => onFilterChange("assign", value)}
          >
            {assigneeOptions.map((option) => (
              <Dropdown.Item key={option} eventKey={option}>
                {option}
              </Dropdown.Item>
            ))}
          </DropdownButton>

          <DropdownButton
            as={ButtonGroup}
            title={`Status: ${statusFilter}`}
            id="dropdown-status"
            variant="outline-secondary"
            className="me-2 filter-dropdown"
            onSelect={(value) => onFilterChange("status", value)}
          >
            <Dropdown.Item eventKey="All">All</Dropdown.Item>
            <Dropdown.Item eventKey="To do">To do</Dropdown.Item>
            <Dropdown.Item eventKey="In progress">In progress</Dropdown.Item>
            <Dropdown.Item eventKey="Done">Done</Dropdown.Item>
          </DropdownButton>

          <DropdownButton
            as={ButtonGroup}
            title={`Priority: ${priorityFilter}`}
            id="dropdown-priority"
            variant="outline-secondary"
            className="filter-dropdown"
            onSelect={(value) => onFilterChange("priority", value)}
          >
            {priorityOptions.map((option) => (
              <Dropdown.Item key={option} eventKey={option}>
                {option}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>
        <div className="ms-auto d-flex align-items-center border p-2 rounded">
          <img
            src="/assets/icons/list_icon.svg"
            className="me-2"
            style={{ cursor: "pointer" }}
            alt="List View"
          />
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              id="dropdown-view-switch"
              className="view-dropdown border-0"
              style={{ background: "none" }}
            >
              {currentView}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => onViewChange("List")}>
                List
              </Dropdown.Item>
              <Dropdown.Item onClick={() => onViewChange("Board")}>
                Board
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    );
  };

  return (
    <div className="project-list-view">
      <ProjectFilters
        tagFilter={tagFilter}
        timeFilter={timeFilter}
        assignFilter={assignFilter}
        statusFilter={statusFilter}
        priorityFilter={priorityFilter}
        onFilterChange={handleFilterChange}
        currentView={currentView}
        onViewChange={handleViewChange}
        assigneeOptions={assigneeOptions}
        tagOptions={tagOptions}
        priorityOptions={priorityOptions}
      />

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger m-3" role="alert">
          <p>{error}</p>
          {error.includes("Authentication error") ? null : (
            <p>
              Using fallback data instead. Make sure you are authenticated and
              have permission to access this project.
            </p>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="task-table">
            <thead>
              <tr>
                <th className="name-header">Name</th>
                <th className="status-header">Status</th>
                <th className="tag-header">Tag</th>
                <th className="priority-header">Priority</th>
                <th className="assign-header">Assign</th>
                <th className="date-header">Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onTaskSelect={handleTaskSelect}
                  isSelected={selectedTask && selectedTask.id === task.id}
                  assignFilter={assignFilter}
                />
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No tasks match the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {pagination.page < pagination.total_pages - 1 && (
            <div className="text-center py-3">
              <button
                className="btn btn-outline-primary"
                onClick={loadMoreTasks}
                disabled={loading && pagination.page > 0}
              >
                {loading && pagination.page > 0 ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang tải...
                  </>
                ) : (
                  <>Tải thêm tasks ({pagination.page + 1}/{pagination.total_pages})</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="floating-btn-container-1">
        <div className="tooltip-container-1">
          <span className="tooltip-1">Create AI</span>
          <button className="create-ai-btn-1">
            <img
              src="/assets/icons/create-ai.svg"
              alt="Create AI"
              className="create-icon-1"
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectTaskList;
