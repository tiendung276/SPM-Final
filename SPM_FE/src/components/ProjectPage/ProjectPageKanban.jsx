import React, { useState } from "react";
import { FaEllipsisH, FaComment, FaFile, FaPlus } from "react-icons/fa";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "../../assets/css/ProjectPage/KanbanBoard.css";

const TaskCard = ({
  id,
  priority,
  title,
  description,
  comments,
  files,
  avatars,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${priority.toLowerCase()}`}
    >
      <div className="card-header-row">
        <span className={`priority-badge ${priority.toLowerCase()}-badge`}>
          {priority}
        </span>
        <FaEllipsisH className="card-menu-icon" />
      </div>
      <h5 className="task-title">{title}</h5>
      <p className="task-description">{description}</p>
      <div className="card-footer-row">
        <div className="assignee-avatars">
          {avatars.map((avatar, index) => (
            <img
              key={index}
              src={avatar}
              alt={`User ${index + 1}`}
              className="avatar"
            />
          ))}
        </div>
        <div className="card-meta">
          <span className="meta-item">
            <img
              src="/assets/icons/comment.svg"
              alt="Comments"
              className="meta-icon"
            />{" "}
            {comments} comments
          </span>
          <span className="meta-item">
            <img
              src="/assets/icons/file.svg"
              alt="Files"
              className="meta-icon"
            />{" "}
            {files} files
          </span>
        </div>
      </div>
    </div>
  );
};

const Column = ({ id, title, tasks, setTasks }) => {
  return (
    <div className="col-md-4 mb-4">
      <div className="column-card">
        <div className="column-header">
          <div className="column-title-wrapper">
            <h5 className={`column-title ${id}-title`}>
              <span className={`column-dot ${id}-dot`}></span>
              {title}
              <button className={`column-add-btn ${id}-add-btn`}>
                <FaPlus className={`${id}-icon`} />
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
              <div key={task.id} className="task-card">
                <div className="task-type">
                  <span
                    className={`type-indicator ${
                      task.type ? task.type.toLowerCase() : "default"
                    }`}
                  ></span>
                  <span className="type-text">{task.type || "Task"}</span>
                </div>
                <h5 className="task-title">{task.title}</h5>
                <p className="task-description">{task.description}</p>
                <div className="task-footer">
                  <div className="assignee">
                    <img
                      src={task.avatar || "/assets/images/avt.png"}
                      alt="Assignee"
                      className="avatar"
                    />
                    <span className="assignee-name">{task.assigneeName}</span>
                  </div>
                  <span
                    className={`priority-badge ${task.priority.toLowerCase()}-badge`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  );
};
const ProjectPageKanban = () => {
  const [tasks, setTasks] = useState({
    todo: [
      {
        id: "1",
        type: "Design",
        priority: "Low",
        title: "Brainstorming",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 12,
        files: 0,
        avatar: "/assets/images/avt.png",
        assigneeName: "Elon Musk",
        avatars: [
          "/assets/images/avt.png",
          "/assets/images/avt.png",
          "/assets/images/avt.png",
        ],
      },
      {
        id: "2",
        type: "Design",
        priority: "Low",
        title: "Brainstorming",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 4,
        files: 2,
        avatar: "/assets/images/avt.png",
        assigneeName: "Elon Musk",
        avatars: ["/assets/images/avt.png", "/assets/images/avt.png"],
      },
    ],
    process: [
      {
        id: "4",
        type: "FE",
        priority: "High",
        title: "Code project detail",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 12,
        files: 0,
        avatar: "/assets/images/avt.png",
        assigneeName: "Elon Musk",
        avatars: [
          "/assets/images/avt.png",
          "/assets/images/avt.png",
          "/assets/images/avt.png",
        ],
      },
      {
        id: "5",
        type: "BE",
        priority: "High",
        title: "Code logic project detail",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 4,
        files: 2,
        avatar: "/assets/images/avt.png",
        assigneeName: "Donald Trump",
        avatars: ["/assets/images/avt.png", "/assets/images/avt.png"],
      },
    ],
    done: [
      {
        id: "7",
        type: "DevOps",
        priority: "High",
        title: "Deploy FE code",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 12,
        files: 0,
        avatar: "/assets/images/avt.png",
        assigneeName: "Nguyen Thuc Thuy Tien",
        avatars: [
          "/assets/images/avt.png",
          "/assets/images/avt.png",
          "/assets/images/avt.png",
        ],
      },
      {
        id: "8",
        type: "BE",
        priority: "High",
        title: "Code logic project detail",
        description:
          "Brainstorming brings team members' diverse experience into play.",
        comments: 4,
        files: 2,
        avatar: "/assets/images/avt.png",
        assigneeName: "Donald Trump",
        avatars: ["/assets/images/avt.png", "/assets/images/avt.png"],
      },
    ],
  });

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const activeColumn = Object.keys(tasks).find((key) =>
        tasks[key].some((task) => task.id === active.id)
      );
      const overColumn = Object.keys(tasks).find((key) =>
        tasks[key].some((task) => task.id === over.id)
      );

      if (activeColumn === overColumn) {
        setTasks((prevTasks) => ({
          ...prevTasks,
          [activeColumn]: arrayMove(
            prevTasks[activeColumn],
            prevTasks[activeColumn].findIndex((task) => task.id === active.id),
            prevTasks[activeColumn].findIndex((task) => task.id === over.id)
          ),
        }));
      } else {
        const activeTask = tasks[activeColumn].find(
          (task) => task.id === active.id
        );
        setTasks((prevTasks) => ({
          ...prevTasks,
          [activeColumn]: prevTasks[activeColumn].filter(
            (task) => task.id !== active.id
          ),
          [overColumn]: [...prevTasks[overColumn], activeTask],
        }));
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="container-fluid p-4 bg-gray">
        <div className="row">
          <Column
            id="todo"
            title="To Do"
            tasks={tasks.todo}
            setTasks={setTasks}
          />
          <Column
            id="process"
            title="On Process"
            tasks={tasks.process}
            setTasks={setTasks}
          />
          <Column
            id="done"
            title="Done"
            tasks={tasks.done}
            setTasks={setTasks}
          />
        </div>
        <div className="floating-btn-container">
          <div className="tooltip-container">
            <span className="tooltip">Create AI</span>
            <button className="create-ai-btn">
              <img
                src="/assets/icons/create-ai.svg"
                alt="Create AI"
                className="create-icon"
              />
            </button>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default ProjectPageKanban;
// import React, { useState } from "react";
// import { FaPlus, FaEllipsisH } from "react-icons/fa";
// import { DndContext, closestCenter } from "@dnd-kit/core";
// import {
//   arrayMove,
//   SortableContext,
//   useSortable,
//   verticalListSortingStrategy,
// } from "@dnd-kit/sortable";
// import { CSS } from "@dnd-kit/utilities";
// import "../../assets/css/ProjectPage/KanbanBoard.css";

// const TaskCard = ({ id, priority, title, description, assignee, type }) => {
//   const { attributes, listeners, setNodeRef, transform, transition } =
//     useSortable({ id });

//   const style = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//   };

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       {...attributes}
//       {...listeners}
//       className="task-card"
//     >
//       <div className="task-type">
//         <span className={`type-indicator ${type.toLowerCase()}`}></span>
//         <span className="type-text">{type}</span>
//       </div>
//       <h3 className="task-title">{title}</h3>
//       <p className="task-description">{description}</p>
//       <div className="task-footer">
//         <div className="assignee">
//           <img
//             src={assignee.avatar || "/assets/images/avt.png"}
//             alt={assignee.name}
//             className="avatar"
//           />
//         </div>
//         <span className={`priority-badge ${priority.toLowerCase()}-badge`}>
//           {priority}
//         </span>
//       </div>
//     </div>
//   );
// };

// const Column = ({ id, title, tasks }) => {
//   return (
//     <div className="col-md-4">
//       <div className={`kanban-column ${id}-column`}>
//         <div className="column-header">
//           <div className="column-title-container">
//             <span className={`column-dot ${id}-dot`}></span>
//             <h2 className={`column-title ${id}-title`}>{title}</h2>
//             <span className="column-count">{tasks.length}</span>
//           </div>
//           <button className={`add-button ${id}-add-button`}>
//             <FaPlus className="add-icon" />
//           </button>
//         </div>

//         <div className="column-content">
//           <SortableContext
//             items={tasks.map((t) => t.id)}
//             strategy={verticalListSortingStrategy}
//           >
//             {tasks.map((task) => (
//               <TaskCard key={task.id} {...task} />
//             ))}
//           </SortableContext>
//         </div>
//       </div>
//     </div>
//   );
// };

// const ProjectPageKanban = () => {
//   const [tasks, setTasks] = useState({
//     todo: [
//       {
//         id: "1",
//         type: "Design",
//         title: "Brainstorming",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "Low",
//         assignee: { name: "Elon Musk", avatar: "/assets/images/avt.png" },
//       },
//       {
//         id: "2",
//         type: "Design",
//         title: "Brainstorming",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "Low",
//         assignee: { name: "Elon Musk", avatar: "/assets/images/avt.png" },
//       },
//     ],
//     process: [
//       {
//         id: "3",
//         type: "FE",
//         title: "Code project detail",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "High",
//         assignee: { name: "Elon Musk", avatar: "/assets/images/avt.png" },
//       },
//       {
//         id: "4",
//         type: "BE",
//         title: "Code logic project detail",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "High",
//         assignee: { name: "Donald Trump", avatar: "/assets/images/avt.png" },
//       },
//     ],
//     done: [
//       {
//         id: "5",
//         type: "DevOps",
//         title: "Deploy FE code",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "High",
//         assignee: {
//           name: "Nguyen Thuc Thuy Tien",
//           avatar: "/assets/images/avt.png",
//         },
//       },
//       {
//         id: "6",
//         type: "BE",
//         title: "Code logic project detail",
//         description:
//           "Brainstorming brings team members' diverse experience into play.",
//         priority: "High",
//         assignee: { name: "Donald Trump", avatar: "/assets/images/avt.png" },
//       },
//     ],
//   });

//   const handleDragEnd = (event) => {
//     const { active, over } = event;

//     if (active.id !== over.id) {
//       // Find which column contains the dragged item
//       const activeColumn = Object.keys(tasks).find((key) =>
//         tasks[key].some((task) => task.id === active.id)
//       );

//       // Find which column contains the target
//       const overColumn = Object.keys(tasks).find((key) =>
//         tasks[key].some((task) => task.id === over.id)
//       );

//       // If dragging within the same column
//       if (activeColumn === overColumn) {
//         setTasks((prevTasks) => ({
//           ...prevTasks,
//           [activeColumn]: arrayMove(
//             prevTasks[activeColumn],
//             prevTasks[activeColumn].findIndex((task) => task.id === active.id),
//             prevTasks[activeColumn].findIndex((task) => task.id === over.id)
//           ),
//         }));
//       } else {
//         // If dragging between different columns, move the task
//         const activeTask = tasks[activeColumn].find(
//           (task) => task.id === active.id
//         );

//         setTasks((prevTasks) => ({
//           ...prevTasks,
//           [activeColumn]: prevTasks[activeColumn].filter(
//             (task) => task.id !== active.id
//           ),
//           [overColumn]: [...prevTasks[overColumn], activeTask],
//         }));
//       }
//     }
//   };

//   return (
//     <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//       <div className="container-fluid bg-white p-4">
//         <div className="row">
//           <Column id="todo" title="To Do" tasks={tasks.todo} />
//           <Column id="process" title="In Progress" tasks={tasks.process} />
//           <Column id="done" title="Done" tasks={tasks.done} />
//         </div>

//         <div className="create-ai-container">
//           <div className="create-ai-tooltip">Create AI</div>
//           <button className="create-ai-button">
//             <img
//               src="/assets/icons/create-ai.svg"
//               alt="Create AI"
//               className="create-ai-icon"
//             />
//           </button>
//         </div>
//       </div>
//     </DndContext>
//   );
// };

// export default ProjectPageKanban;
