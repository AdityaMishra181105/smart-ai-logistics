import React from 'react';
import { Users as UsersIcon, Shield, Check, Mail } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const Users = () => {
  const users = [
    { id: 1, name: 'Admin Demo', email: 'admin@sih26002.gov.in', role: 'ADMIN', status: 'ACTIVE' },
    { id: 2, name: 'Rajesh Kumar', email: 'rajesh.k@sih26002.gov.in', role: 'DRIVER', status: 'ACTIVE' },
    { id: 3, name: 'Logistics Operator 1', email: 'operator1@sih26002.gov.in', role: 'LOGISTICS_OPERATOR', status: 'ACTIVE' },
    { id: 4, name: 'Guwahati Med Supplier', email: 'medical@ngo.org.in', role: 'NGO_SUPPLIER', status: 'PENDING' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access Directory"
        description="Configure account privileges, verify transporter registration logs, and assign driver access credentials."
        actions={
          <Button variant="primary" size="sm" className="flex items-center gap-1.5">
            <span>Invite Agent</span>
          </Button>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-darkBorder text-customMuted font-bold uppercase tracking-wider">
                <th className="pb-3 pt-1">User Profile</th>
                <th className="pb-3 pt-1">Email</th>
                <th className="pb-3 pt-1">Role Title</th>
                <th className="pb-3 pt-1 text-center">Status</th>
                <th className="pb-3 pt-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkBorder">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-darkBgSecondary/20">
                  <td className="py-3.5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-darkBgSecondary border border-darkBorder text-customPrimary flex items-center justify-center font-bold">
                      {user.name.split(' ').map(n=>n[0]).join('')}
                    </div>
                    <span className="font-semibold text-customText">{user.name}</span>
                  </td>
                  <td className="py-3.5 text-customMuted">{user.email}</td>
                  <td className="py-3.5">
                    <Badge variant={user.role === 'ADMIN' ? 'primary' : 'neutral'} className="text-[9px]">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-center">
                    <Badge variant={user.status === 'ACTIVE' ? 'success' : 'warning'} className="text-[9px]">
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 text-right">
                    <Button variant="outline" size="sm" className="px-2 py-1 text-[9px] uppercase font-semibold">
                      Configure
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Users;
