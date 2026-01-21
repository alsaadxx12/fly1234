export type LeaveType = 'time' | 'full_day';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
    id: string;
    employeeId: string;
    employeeName: string;
    departmentId: string;
    departmentName: string;
    type: LeaveType;
    status: LeaveStatus;

    // For full day leave
    startDate?: Date;
    endDate?: Date;

    // For time leave
    date?: Date;
    startTime?: string; // format "HH:mm"
    endTime?: string;   // format "HH:mm"

    reason: string;
    deductSalary: boolean;
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    reviewedByName?: string;
    rejectionReason?: string;
}
