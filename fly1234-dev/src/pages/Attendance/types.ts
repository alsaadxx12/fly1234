export type AttendanceStatus = 'checked-in' | 'checked-out' | 'absent';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  status: AttendanceStatus;
  notes?: string;
}
