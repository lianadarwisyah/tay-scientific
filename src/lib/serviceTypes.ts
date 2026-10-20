/** Choices in the "Type of service" dropdown on the Services page form. */
export const serviceTypes = ["Calibration", "Diagnostic", "Training", "Preventive maintenance", "Others"] as const;

/** Statuses staff can set on a service request (must match the check in supabase/migration_service_requests.sql). */
export const SERVICE_STATUSES = ["new", "in progress", "done", "cancelled"] as const;
