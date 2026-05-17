import {
    TASK_TYPES,
    TASK_SUB_TYPES,
    TASK_COMPONENTS,
    TASK_PRIORITIES,
} from "./constants";

const DEFAULT_STATUSES = [
    "Raised",
    "Open",
    "Pending",
    "In Progress",
    "Testing",
    "Resolved",
    "Reopened",
    "Hold",
    "On Hold",
    "Completed",
];

export function toStringArray(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string");
    }
    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).filter(
            (v): v is string => typeof v === "string"
        );
    }
    return fallback;
}

export type TaskAttributesState = {
    priorities: string[];
    statuses: string[];
    types: string[];
    subTypes: Record<string, string[]>;
    components: string[];
    versions: string[];
    settings: {
        maxAttachments: number;
        autoPrioritize?: boolean;
        [key: string]: unknown;
    };
};

export function normalizeTaskAttributes(
    data: Record<string, unknown> | null | undefined
): TaskAttributesState {
    const subTypesRaw = data?.subTypes;
    let subTypes: Record<string, string[]> = { ...TASK_SUB_TYPES };

    if (subTypesRaw && typeof subTypesRaw === "object" && !Array.isArray(subTypesRaw)) {
        subTypes = Object.fromEntries(
            Object.entries(subTypesRaw as Record<string, unknown>).map(([key, value]) => [
                key,
                toStringArray(value, TASK_SUB_TYPES[key] || []),
            ])
        );
    }

    const settingsRaw =
        data?.settings && typeof data.settings === "object"
            ? (data.settings as Record<string, unknown>)
            : {};

    return {
        priorities: toStringArray(data?.priorities, TASK_PRIORITIES),
        statuses: toStringArray(data?.statuses, DEFAULT_STATUSES),
        types: toStringArray(data?.types, TASK_TYPES),
        subTypes,
        components: toStringArray(data?.components, TASK_COMPONENTS),
        versions: toStringArray(data?.versions, ["v1.0", "v1.1"]),
        settings: {
            maxAttachments: 10,
            ...settingsRaw,
        },
    };
}

export function getDefaultTaskAttributes(): TaskAttributesState {
    return normalizeTaskAttributes(null);
}
