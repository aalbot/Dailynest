
export const TASK_TYPES = [
    "Development",
    "Testing",
    "UI_UX",
    "Product & Planning",
    "Deployment & DevOps",
    "Documentation",
    "Communication",
    "Operations",
    "Learning & Growth",
    "General",
    "Meta_Scheduling"
];

export const TASK_SUB_TYPES: Record<string, string[]> = {
    "Development": [
        "Feature", "Bug", "Enhancement", "Refactor", "Technical Debt",
        "Performance Optimization", "Security Fix", "API Change",
        "Database Change", "Hotfix", "Spike / Research"
    ],
    "Testing": [
        "Test Case", "Unit Test", "Integration Test", "End-to-End (E2E) Test",
        "Regression Test", "Manual Testing", "Test Automation",
        "Bug Verification", "QA Review", "UAT (User Acceptance Testing)"
    ],
    "UI_UX": [
        "UI Change", "UX Improvement", "Design Task", "Wireframe",
        "Prototype", "Responsive Fix", "Accessibility (A11y)",
        "Cross-browser Fix", "Design Review", "Branding Update"
    ],
    "Product & Planning": [
        "Requirement", "User Story", "Epic", "Sub-task", "Milestone",
        "Backlog Item", "Roadmap Task", "Priority Update", "Product Review"
    ],
    "Deployment & DevOps": [
        "Deployment", "Release", "Rollback", "CI/CD Update",
        "Infrastructure Setup", "Environment Configuration",
        "Monitoring Setup", "Logging", "Backup", "Server Maintenance"
    ],
    "Documentation": [
        "Technical Documentation", "API Documentation", "User Guide",
        "README Update", "Changelog", "Knowledge Base", "Comments Cleanup"
    ],
    "Communication": [
        "Meeting", "Discussion", "Review", "Approval", "Feedback",
        "Stakeholder Update", "Client Request", "Support Request"
    ],
    "Operations": [
        "Admin Task", "Compliance", "Legal", "Finance", "Billing",
        "License Update", "Audit", "Policy Update"
    ],
    "Learning & Growth": [
        "Training", "Learning Task", "Onboarding", "Mentoring",
        "Workshop", "Certification Preparation"
    ],
    "General": [
        "Chore", "To-Do", "Follow-up", "Reminder", "Exploration",
        "Experiment", "Blocked Task"
    ],
    "Meta_Scheduling": [
        "Recurring Task", "One-time Task", "Scheduled Task",
        "Ad-hoc Task", "External Dependency", "Internal Task"
    ]
};

export const TASK_COMPONENTS = [
    "App",
    "Website",
    "Backend",
    "Database",
    "Infrastructure",
    "Design System",
    "Admin Panel",
    "API",
    "Third-party Integration"
];

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const ADMIN_STATUSES = ["Open", "Resolved", "In Progress", "Reopened", "Raised", "Hold", "Rejected"];
export const EMP_STATUSES = ["Raised"]; // Default for emp

export const DEFAULT_TASK_STATUS_ADMIN = "Open";
export const DEFAULT_TASK_STATUS_EMP = "Raised";
