export const createLeaveRequest: (data: any) => Promise<any>;
export const getLeaveRequests: (params?: any) => Promise<any>;
export const getLeaveRequestById: (id: string) => Promise<any>;
export const cancelLeaveRequest: (id: string) => Promise<any>;
export const getLeaveBalance: () => Promise<any>;
export const updateLeaveStatus: (id: string, data: any) => Promise<any>;
export const getPendingLeaveRequests: () => Promise<any>;
