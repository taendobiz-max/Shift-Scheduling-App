import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmployeeData {
  employee_id: string;
  name: string;
  office?: string;
  "班（東京のみ）"?: string;
}

interface AssignEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
  availableEmployees: Array<{employee: EmployeeData; hasVacation: boolean}>;
  onAssign: (employeeId: string) => void;
}

export function AssignEmployeeDialog({
  isOpen,
  onClose,
  businessName,
  availableEmployees,
  onAssign,
}: AssignEmployeeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            従業員をアサイン
          </DialogTitle>
          <DialogDescription>
            {businessName}にアサインする従業員を選択してください
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {availableEmployees.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                アサイン可能な従業員がいません
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {availableEmployees.map(({ employee, hasVacation }) => (
                <Button
                  key={employee.employee_id}
                  variant="outline"
                  className={`justify-start h-auto py-3 ${
                    hasVacation ? 'bg-pink-50 border-pink-300 hover:bg-pink-100' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    onAssign(employee.employee_id);
                    onClose();
                  }}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{employee.name}</span>
                      {employee["班（東京のみ）"] && (
                        <span className="text-xs text-gray-500">
                          ({employee["班（東京のみ）"]}班)
                        </span>
                      )}
                      {hasVacation && (
                        <span className="ml-auto text-xs font-semibold text-pink-600">
                          休暇登録済み
                        </span>
                      )}
                    </div>
                    {employee.office && (
                      <span className="text-xs text-gray-500">{employee.office}</span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
