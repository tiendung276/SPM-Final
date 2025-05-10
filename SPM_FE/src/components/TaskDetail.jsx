import React from 'react';
import { useParams } from 'react-router-dom';
import TaskInfo from './TaskDetails/TaskInfo';

const TaskDetail = () => {
    const { projectId, taskId } = useParams();
    const [selectedTask, setSelectedTask] = React.useState(null);

    React.useEffect(() => {
        // Fetch task details when component mounts
        const fetchTaskDetails = async () => {
            try {
                const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
                if (!accessToken) {
                    throw new Error('No access token found');
                }

                const response = await fetch(`${process.env.REACT_APP_API_URL}/projects/${projectId}/tasks/${taskId}`, {
                    headers: {
                        'authentication': accessToken,
                        'accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch task details');
                }

                const data = await response.json();
                setSelectedTask(data);
            } catch (error) {
                console.error('Error fetching task details:', error);
            }
        };

        fetchTaskDetails();
    }, [projectId, taskId]);

    const handleTaskUpdate = (updatedTask) => {
        setSelectedTask(updatedTask);
    };

    if (!selectedTask) {
        return <div>Loading...</div>;
    }

    return (
        <div className="task-detail-container">
            <TaskInfo
                selectedTask={selectedTask}
                onTaskUpdate={handleTaskUpdate}
                isTaskDetail={true}
                projectId={projectId}
            />
        </div>
    );
};

export default TaskDetail; 