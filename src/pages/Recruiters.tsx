/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { collection, getDocs, query, where, setDoc, doc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { User, Invitation } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import { UserCircle, UserPlus, Mail } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Recruiters() {
  const { user } = useAuth();
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const fetchData = async () => {
    try {
      // Fetch Recruiters
      const qRecruiters = query(collection(db, 'users'), where('role', '==', 'Recruiter'));
      const snapRecruiters = await getDocs(qRecruiters);
      setRecruiters(snapRecruiters.docs.map(doc => doc.data() as User));

      // Fetch Pending Invitations
      const qInvites = query(collection(db, 'invitations'), where('status', '==', 'Pending'));
      const snapInvites = await getDocs(qInvites);
      setInvitations(snapInvites.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation)));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchData();
    }
  }, [user]);

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error('Email is required');
      return;
    }

    try {
      await setDoc(doc(db, 'invitations', inviteEmail.toLowerCase()), {
        email: inviteEmail.toLowerCase(),
        role: 'Recruiter',
        status: 'Pending',
        createdAt: Date.now()
      });
      
      toast.success('Invitation sent successfully');
      setInviteEmail('');
      setIsInviteOpen(false);
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error('Failed to send invitation');
    }
  };

  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recruiters</h1>
          <p className="text-muted-foreground">Manage your recruiting team.</p>
        </div>
        
        <Button className="gap-2" onClick={() => setIsInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Recruiter
        </Button>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a new Recruiter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email" 
                  placeholder="colleague@example.com" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  They will automatically be assigned the Recruiter role when they sign in with this email.
                </p>
              </div>
              <Button className="w-full" onClick={handleInvite}>Send Invitation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Active Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading recruiters...</div>
            ) : recruiters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active recruiters found in the system.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recruiters.map((recruiter) => (
                    <TableRow key={recruiter.uid}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        {recruiter.displayName || 'Unknown'}
                      </TableCell>
                      <TableCell>{recruiter.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{recruiter.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {recruiter.createdAt ? new Date(recruiter.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{invite.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                          {invite.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
