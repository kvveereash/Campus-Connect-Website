/*
 * The limits on a volunteer role, shared by the form and the server actions.
 * They live here because a 'use server' file may only export async functions.
 */
export const ROLE_NAME_MAX = 60;
export const ROLE_DESCRIPTION_MAX = 200;
export const ROLE_SLOTS_MAX = 500;
/** Roles per event: enough for a fest, few enough to read at a glance. */
export const ROLES_PER_EVENT_MAX = 20;
