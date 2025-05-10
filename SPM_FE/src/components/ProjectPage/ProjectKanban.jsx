import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Dropdown, DropdownButton, ButtonGroup } from "react-bootstrap";
import { FaPlus } from "react-icons/fa";
import { DndContext, closestCenter, useDroppable, useSensor, useSensors, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import axios from "axios";
import "../../assets/css/ProjectPage/ProjectKanban.css";
import AIChat from "../AIChatPage/AIChat";
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

// TaskCard component
const TaskCard = ({
  id,
  priority,
  title,
  description,
  task_tag,
  assignees,
  onClick,
  task,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(false);
    }
  };

  const handleMouseMove = () => {
    setIsDragging(true);
  };

  const handleMouseUp = (e) => {
    if (e.button === 0 && !isDragging) {
      onClick(task);
    }
  };

  const primaryAssignee = assignees?.length > 0 ? assignees[0] : null;
  const initials = getInitials(primaryAssignee?.name);
  const avatarColor = stringToColor(primaryAssignee?.name || "Unassigned");

  // Normalize task_tag for class name (lowercase, replace spaces if any)
  const tagClass = task_tag
    ? task_tag.toLowerCase().replace(/\s+/g, "-")
    : "default";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="task-tag">
        <span className={`tag-indicator ${tagClass}`}></span>
        <span className="tag-text">{task_tag || "No Tag"}</span>
      </div>
      <h3 className="task-title-kanban">{title}</h3>
      <p className="task-description">{description}</p>
      <div className="task-footer-n mb-2">
        <div className="assignee-n">
          <div
            className="avatar-initials-n"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <span className="assignee-name-kanban">
            {primaryAssignee?.name || "Unassigned"}
            {assignees?.length > 1 && ` +${assignees.length - 1}`}
          </span>
        </div>
        <span className={`priority-badge ${priority.toLowerCase()}-badge`}>
          {priority}
        </span>
      </div>
    </div>
  );
};

// Column component
const Column = ({ id, title, tasks, onTaskSelect }) => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className="col-md-4 mb-2"
      style={{
        minWidth: "300px",
        backgroundColor: isOver ? "#e0e0e0" : "transparent",
      }}
    >
      <div className="column-card">
        <div className="column-header">
          <div className="column-title-wrapper">
            <h5 className={`column-title ${id}-title`}>
              <span className={`column-dot ${id}-dot`}></span>
              {id === "todo"
                ? "To Do"
                : id === "process"
                  ? "In Progress"
                  : "Done"}
              <button className={`column-add-btn ${id}-add-btn`}>
                <FaPlus
                  className={`${id}-icon`}
                  onClick={() =>
                    navigate(`/task/add/${id}`, { state: { projectId } })
                  }
                />
              </button>
            </h5>
          </div>
        </div>
        <div className="column-body">
          <SortableContext
            items={tasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                priority={task.priority}
                title={task.title}
                description={task.description}
                task_tag={task.task_tag}
                assignees={task.assignees}
                onClick={onTaskSelect}
                task={task}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};

// Filter component
const ProjectFilters = ({
  tagFilter,
  timeFilter,
  assignFilter,
  priorityFilter,
  onFilterChange,
  currentView,
  onViewChange,
  assigneeOptions,
  tagOptions,
  priorityOptions,
}) => {
  return (
    <div className="filter-board d-flex justify-content-between align-items-center">
      <div className="d-flex gap-2 mx-4">
        <DropdownButton
          as={ButtonGroup}
          title={`Tag: ${tagFilter}`}
          id="dropdown-tag"
          variant="outline-secondary"
          className="me-2"
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
          className="me-2"
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
          className="me-2"
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
          title={`Priority: ${priorityFilter}`}
          id="dropdown-priority"
          variant="outline-secondary"
          onSelect={(value) => onFilterChange("priority", value)}
        >
          {priorityOptions.map((option) => (
            <Dropdown.Item key={option} eventKey={option}>
              {option}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      </div>
      <div className="d-flex align-items-center border p-2 rounded">
        <img
          src="/assets/icons/clipboard-text.svg"
          className="me-2"
          style={{ cursor: "pointer" }}
          alt="Board"
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

// Main component
const ProjectKanban = ({ onTaskSelect, onTaskUpdate, onViewChange }) => {
  const [currentView, setCurrentView] = useState("Board");
  const [tagFilter, setTagFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [assignFilter, setAssignFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [tasks, setTasks] = useState({
    todo: [],
    process: [],
    done: [],
  });
  const [assigneeOptions, setAssigneeOptions] = useState(["All"]);
  const [tagOptions, setTagOptions] = useState(["All"]);
  const [priorityOptions, setPriorityOptions] = useState(["All", "High", "Mid", "Low", "Critical"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    page_size: 10,
    total_pages: 0,
  });
  const [newlyCreatedTaskIds, setNewlyCreatedTaskIds] = useState(new Set());
  const [showAIChat, setShowAIChat] = useState(false);

  // Định nghĩa sensors cho DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();

  // Create axios instance with proper configuration
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      accept: "application/json",
    },
    withCredentials: true,
  });

  // Get auth token from storage
  const getAuthToken = () => {
    const token =
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token");
    console.log("Retrieved token from storage:", token);
    return token;
  };

  // New function to fetch tags from API
  const fetchTags = async () => {
    try {
      if (!projectId) {
        console.log("No project ID provided for fetching tags");
        return;
      }

      const token = getAuthToken();
      if (!token) {
        throw new Error("No token found in storage");
      }

      const config = {
        headers: {
          authentication: token,
          accept: "application/json",
        },
      };

      console.log("Fetching tags for project:", projectId);
      const response = await api.get(`/projects/${projectId}/tags`, config);

      const tags = Array.isArray(response.data)
        ? response.data.map((tag) => tag.tag_name || tag)
        : [];

      // Always include "All" as the first option
      setTagOptions(["All", ...tags]);
      console.log("Tags fetched from API:", tags);
    } catch (err) {
      console.error("Error fetching tags:", err);
      // Fallback to default tags if API fails
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

  // Fetch assignees for a task
  const fetchAssignees = async (taskId, config) => {
    try {
      const response = await api.get(
        `/projects/${projectId}/tasks/${taskId}/assignees`,
        config
      );
      console.log(`Assignees for task ${taskId}:`, response.data);
      return Array.isArray(response.data)
        ? response.data.map((assignee) => ({
          user_id: assignee.user_id,
          user_first_name: assignee.user_first_name || "Unknown",
          user_last_name: assignee.user_last_name || "User",
          user_email: assignee.user_email || "unknown@example.com",
          role: assignee.role || "Dev team",
        }))
        : [];
    } catch (err) {
      if (err.response && err.response.status === 500) {
        return [];
      }
      console.error(
        `Unexpected error fetching assignees for task ${taskId}:`,
        err
      );
      if (err.response) {
        console.error(`Response status: ${err.response.status}`);
        console.error(`Response data: ${JSON.stringify(err.response.data)}`);
      }
      return [];
    }
  };

  // Fetch tasks from API
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      console.log("Token in fetchTasks:", token);

      if (!token) {
        throw new Error("No token found in storage");
      }

      if (!projectId) {
        throw new Error("No project ID provided");
      }

      const config = {
        headers: {
          authentication: token,
          accept: "application/json",
        },
      };
      console.log("Request config:", config);

      // First fetch the tags
      await fetchTags();

      const response = await api.get(
        `/projects/${projectId}/tasks/${pagination.page}/${pagination.page_size}`,
        config
      );

      console.log("API Response:", response.data);

      const apiTasks = Array.isArray(response.data.tasks)
        ? response.data.tasks
        : [];
      setPagination(
        response.data.pagination || {
          total: 0,
          page: 0,
          page_size: 10,
          total_pages: 0,
        }
      );

      // Fetch assignees for each task, but skip for newly created tasks
      const tasksWithAssignees = await Promise.all(
        apiTasks.map(async (task) => {
          if (newlyCreatedTaskIds.has(task.task_id)) {
            return { ...task, assignees: [] };
          }

          const assignees = await fetchAssignees(task.task_id, config);
          return { ...task, assignees };
        })
      );

      // Clear the newly created task IDs after processing
      setNewlyCreatedTaskIds(new Set());

      // Organize tasks by status
      const categorizedTasks = {
        todo: [],
        process: [],
        done: [],
      };

      tasksWithAssignees.forEach((task) => {
        const processedTask = {
          id: task.task_id,
          task_tag: task.task_tag || "No Tag", // Use task_tag directly from API
          priority: task.task_priority
            ? task.task_priority.charAt(0).toUpperCase() +
            task.task_priority.slice(1).toLowerCase()
            : "Medium",
          title: task.task_name || "Untitled Task",
          description: task.description || "",
          assignees: task.assignees?.length
            ? task.assignees.map((assignee) => ({
              name: `${assignee.user_first_name} ${assignee.user_last_name}`,
              avatar: "/assets/images/avt.png",
              emailAddress: assignee.user_email,
              position: assignee.role,
            }))
            : [
              {
                name: "Unassigned",
                avatar: "/assets/images/avt.png",
                emailAddress: "unassigned@example.com",
                position: "Dev team",
              },
            ],
          status: task.task_status,
          startDate: task.start_date ? new Date(task.start_date) : new Date(),
          endDate: task.end_date
            ? new Date(task.end_date)
            : new Date(Date.now() + 86400000),
          createdAt: task.created_at ? new Date(task.created_at) : new Date(),
        };

        if (task.task_status === "TODO" || task.task_status === "BACKLOG") {
          categorizedTasks.todo.push(processedTask);
        } else if (task.task_status === "IN_PROGRESS") {
          categorizedTasks.process.push(processedTask);
        } else if (task.task_status === "DONE") {
          categorizedTasks.done.push(processedTask);
        }
      });

      // Extract unique assignees for the filter
      const allAssignees = new Set();
      Object.values(categorizedTasks)
        .flat()
        .forEach((task) => {
          task.assignees.forEach((assignee) => {
            if (assignee.name !== "Unassigned") {
              allAssignees.add(assignee.name);
            }
          });
        });
      setAssigneeOptions(["All", ...Array.from(allAssignees)]);

      setTasks(categorizedTasks);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching tasks:", err);

      if (err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          setError("Authentication error. Please log in again.");
          navigate("/login");
        } else {
          setError(
            `Failed to load tasks: ${err.response.status} - ${err.response.data?.detail || err.message
            }`
          );
          setLoading(false);

          // Fallback to demo data if API fails
          const demoTasks = {
            todo: [],
            process: [],
            done: [],
          };

          // Extract unique assignees from demo data
          const allAssignees = new Set();
          Object.values(demoTasks)
            .flat()
            .forEach((task) => {
              task.assignees.forEach((assignee) => {
                if (assignee.name !== "Unassigned") {
                  allAssignees.add(assignee.name);
                }
              });
            });
          setAssigneeOptions(["All", ...Array.from(allAssignees)]);

          setTasks(demoTasks);
        }
      } else {
        setError(`Failed to load tasks: ${err.message}`);
        setLoading(false);
      }
    }
  };

  // Fetch tasks on mount and when refresh query parameter changes
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const refresh = queryParams.get("refresh") === "true";
    const newTaskId = queryParams.get("newTaskId");

    if (newTaskId) {
      setNewlyCreatedTaskIds((prev) => new Set(prev).add(newTaskId));
    }

    if (refresh || !tasks.todo.length) {
      fetchTasks();
    }
  }, [projectId, pagination.page, navigate, location.search]);

  // Load more tasks if needed
  const loadMoreTasks = () => {
    if (pagination.page < pagination.total_pages - 1) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
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
      case "priority":
        setPriorityFilter(value);
        break;
      default:
        break;
    }
  };

  const getFilteredTasks = () => {
    const filteredTasks = { ...tasks };
    Object.keys(filteredTasks).forEach((column) => {
      filteredTasks[column] = filteredTasks[column].filter((task) => {
        const tagMatch =
          tagFilter === "All" || (task.task_tag && task.task_tag === tagFilter);
        const timeMatch = isDateInRange(task.createdAt, timeFilter);
        const assignMatch =
          assignFilter === "All" ||
          task.assignees.some((assignee) => assignee.name === assignFilter);
        const priorityMatch =
          priorityFilter === "All" ||
          (task.priority &&
            priorityFilter &&
            task.priority.toLowerCase() === priorityFilter.toLowerCase());
        return tagMatch && timeMatch && assignMatch && priorityMatch;
      });
    });
    return filteredTasks;
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    console.log("Drag End - Active:", active, "Over:", over);

    if (!over) {
      console.log("No over target detected");
      return;
    }

    const activeColumn = Object.keys(tasks).find((key) =>
      tasks[key].some((task) => task.id === active.id)
    );
    if (!activeColumn) {
      console.log("Active column not found for task:", active.id);
      return;
    }

    const activeTask = tasks[activeColumn].find(
      (task) => task.id === active.id
    );
    if (!activeTask) {
      console.log("Active task not found:", active.id);
      return;
    }

    const statusMap = {
      todo: "TODO",
      process: "IN_PROGRESS",
      done: "DONE",
    };

    // Map for converting between priority values if needed
    const priorityMap = {
      LOW: "LOW",
      MID: "MID", // Convert MID back to MEDIUM for the API
      HIGH: "HIGH",
      CRITICAL: "CRITICAL",
    };

    // Case 1: Dropped over another task
    if (
      over.id in tasks ||
      tasks.todo.some((task) => task.id === over.id) ||
      tasks.process.some((task) => task.id === over.id) ||
      tasks.done.some((task) => task.id === over.id)
    ) {
      const overColumn = Object.keys(tasks).find((key) =>
        tasks[key].some((task) => task.id === over.id)
      );
      if (!overColumn) {
        console.log("Over column not found for task:", over.id);
        return;
      }

      if (activeColumn === overColumn) {
        // Reordering within the same column
        console.log("Reordering within the same column:", activeColumn);
        setTasks((prevTasks) => ({
          ...prevTasks,
          [activeColumn]: arrayMove(
            prevTasks[activeColumn],
            prevTasks[activeColumn].findIndex((task) => task.id === active.id),
            prevTasks[activeColumn].findIndex((task) => task.id === over.id)
          ),
        }));
      } else {
        // Moving between columns
        console.log("Moving between columns:", activeColumn, "to", overColumn);

        // Create updated task with new status
        const updatedTask = {
          ...activeTask,
          status: statusMap[overColumn],
        };

        // Optimistically update the UI
        setTasks((prevTasks) => ({
          ...prevTasks,
          [activeColumn]: prevTasks[activeColumn].filter(
            (task) => task.id !== active.id
          ),
          [overColumn]: [...prevTasks[overColumn], updatedTask],
        }));

        try {
          if (onTaskUpdate) {
            onTaskUpdate(updatedTask);
          }

          const token = getAuthToken();
          if (!token) {
            throw new Error("No token found");
          }

          const config = {
            headers: {
              authentication: token,
              accept: "application/json",
              "Content-Type": "application/json",
            },
          };

          // Prepare a complete payload with all required fields from the active task
          const payload = {
            task_name: activeTask.title, // Use title as task_name
            description: activeTask.description || "",
            task_status: statusMap[overColumn],
            task_priority:
              priorityMap[activeTask.priority.toUpperCase()] || "MID", // Map priority back to API format
            start_date: activeTask.startDate
              ? new Date(activeTask.startDate).toISOString()
              : null, // Use startDate
            end_date: activeTask.endDate
              ? new Date(activeTask.endDate).toISOString()
              : null, // Use endDate
            task_tag:
              activeTask.task_tag === "No Tag" ? null : activeTask.task_tag, // Set to null if "No Tag"
            attachments: activeTask.attachments || [],
            module_id: activeTask.module_id,
            cycle_id: activeTask.cycle_id,
          };

          console.log("Sending complete payload to update task:", payload);

          await api.put(
            `/projects/${projectId}/tasks/${activeTask.id}/update`,
            payload,
            config
          );

          console.log(
            `Task ${activeTask.id} status updated to ${statusMap[overColumn]}`
          );
        } catch (error) {
          console.error("Failed to update task status:", error);
          if (error.response) {
            console.error("Error response status:", error.response.status);
            console.error("Error response data:", error.response.data);
          }

          // Revert UI changes on error
          setTasks((prevTasks) => ({
            ...prevTasks,
            [activeColumn]: [...prevTasks[activeColumn], activeTask],
            [overColumn]: prevTasks[overColumn].filter(
              (task) => task.id !== active.id
            ),
          }));

          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            setError("Authentication error. Please log in again.");
            navigate("/login");
          } else if (error.response && error.response.status === 422) {
            const detail = error.response.data?.detail;
            let errorMsg = "Validation error";
            if (detail) {
              if (Array.isArray(detail)) {
                errorMsg += ": " + detail.map((err) => err.msg).join(", ");
              } else if (typeof detail === "string") {
                errorMsg += ": " + detail;
              } else {
                errorMsg += ": " + JSON.stringify(detail);
              }
            }
            alert(errorMsg);
          } else {
            alert("Failed to update task status. Please try again.");
          }
        }
      }
    }
    // Case 2: Dropped directly onto a column
    else if (over.id.startsWith("column-")) {
      const overColumn = over.id.replace("column-", "");
      console.log("Dropped onto column:", overColumn);

      if (activeColumn !== overColumn) {
        // Create updated task with new status
        const updatedTask = {
          ...activeTask,
          status: statusMap[overColumn],
        };

        // Optimistically update the UI
        setTasks((prevTasks) => ({
          ...prevTasks,
          [activeColumn]: prevTasks[activeColumn].filter(
            (task) => task.id !== active.id
          ),
          [overColumn]: [...prevTasks[overColumn], updatedTask],
        }));

        try {
          if (onTaskUpdate) {
            onTaskUpdate(updatedTask);
          }

          const token = getAuthToken();
          if (!token) {
            throw new Error("No token found");
          }

          const config = {
            headers: {
              authentication: token,
              accept: "application/json",
              "Content-Type": "application/json",
            },
          };

          // Prepare a complete payload with all required fields from the active task
          const payload = {
            task_name: activeTask.title, // Use title as task_name
            description: activeTask.description || "",
            task_status: statusMap[overColumn],
            task_priority:
              priorityMap[activeTask.priority.toUpperCase()] || "MEDIUM", // Map priority back to API format
            start_date: activeTask.startDate
              ? new Date(activeTask.startDate).toISOString()
              : null, // Use startDate
            end_date: activeTask.endDate
              ? new Date(activeTask.endDate).toISOString()
              : null, // Use endDate
            task_tag:
              activeTask.task_tag === "No Tag" ? null : activeTask.task_tag, // Set to null if "No Tag"
            attachments: activeTask.attachments || [],
            module_id: activeTask.module_id,
            cycle_id: activeTask.cycle_id,
          };

          console.log("Sending complete payload to update task:", payload);

          await api.put(
            `/projects/${projectId}/tasks/${activeTask.id}/update`,
            payload,
            config
          );

          console.log(
            `Task ${activeTask.id} status updated to ${statusMap[overColumn]}`
          );
        } catch (error) {
          console.error("Failed to update task status:", error);
          if (error.response) {
            console.error("Error response status:", error.response.status);
            console.error("Error response data:", error.response.data);
          }

          // Revert UI changes on error
          setTasks((prevTasks) => ({
            ...prevTasks,
            [activeColumn]: [...prevTasks[activeColumn], activeTask],
            [overColumn]: prevTasks[overColumn].filter(
              (task) => task.id !== active.id
            ),
          }));

          if (
            error.response &&
            (error.response.status === 401 || error.response.status === 403)
          ) {
            setError("Authentication error. Please log in again.");
            navigate("/login");
          } else if (error.response && error.response.status === 422) {
            const detail = error.response.data?.detail;
            let errorMsg = "Validation error";
            if (detail) {
              if (Array.isArray(detail)) {
                errorMsg += ": " + detail.map((err) => err.msg).join(", ");
              } else if (typeof detail === "string") {
                errorMsg += ": " + detail;
              } else {
                errorMsg += ": " + JSON.stringify(detail);
              }
            }
            alert(errorMsg);
          } else {
            alert("Failed to update task status. Please try again.");
          }
        }
      }
    }
  };
  const filteredTasks = getFilteredTasks();

  const handleTaskSelect = (task) => {
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (onViewChange) {
      onViewChange(view);
    } else {
      if (view === "List") navigate(`/project/list/${projectId}`);
      else if (view === "Board") navigate(`/project/board/${projectId}`);
    }
  };

  // Hàm đóng AI Chat
  const handleCloseAIChat = () => {
    setShowAIChat(false);
  };

  // Hàm mở AI Chat
  const handleOpenAIChat = () => {
    setShowAIChat(true);
  };

  return (
    <div className="project-management-system">
      <ProjectFilters
        tagFilter={tagFilter}
        timeFilter={timeFilter}
        assignFilter={assignFilter}
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
          {error}
        </div>
      ) : (
        <div className="kanban-container">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="row kanban-columns-row">
              <Column
                id="todo"
                title="To Do"
                tasks={filteredTasks.todo}
                onTaskSelect={handleTaskSelect}
              />
              <Column
                id="process"
                title="In Progress"
                tasks={filteredTasks.process}
                onTaskSelect={handleTaskSelect}
              />
              <Column
                id="done"
                title="Done"
                tasks={filteredTasks.done}
                onTaskSelect={handleTaskSelect}
              />
            </div>
          </DndContext>
        </div>
      )}

      <div className="floating-btn-container-1">
        <div className="tooltip-container-1">
          <span className="tooltip-1">Create AI</span>
          <button className="create-ai-btn-1" onClick={handleOpenAIChat}>
            <img
              src="/assets/icons/create-ai.svg"
              alt="Create AI"
              className="create-icon-1"
            />
          </button>
        </div>
      </div>

      {showAIChat && <AIChat onClose={handleCloseAIChat} projectId={projectId} />}
    </div>
  );
};

export default ProjectKanban;
