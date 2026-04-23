/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Edit,
  Trash2
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Client } from '@/src/types';

import { useAuth } from '@/src/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useData } from '@/src/contexts/DataContext';

export default function Clients() {
  const { clients, addClient, deleteClient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    logo: '',
    contactPerson: '',
    contactDesignation: '',
    email: '',
    mobile: '',
    website: '',
    address: '',
    industry: '',
    notes: '',
  });

  if (user?.role === 'HiringManager') {
    return <Navigate to="/" replace />;
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewClient(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email) {
      toast.error('Company name and email are required');
      return;
    }

    try {
      await addClient({
        name: newClient.name || '',
        logo: newClient.logo || '',
        contactPerson: newClient.contactPerson || '',
        contactDesignation: newClient.contactDesignation || '',
        email: newClient.email || '',
        mobile: newClient.mobile || '',
        website: newClient.website || '',
        address: newClient.address || '',
        industry: newClient.industry || '',
        notes: newClient.notes || '',
      });

      setNewClient({
        name: '',
        logo: '',
        contactPerson: '',
        contactDesignation: '',
        email: '',
        mobile: '',
        website: '',
        address: '',
        industry: '',
        notes: '',
      });
      setIsAddDialogOpen(false);
      toast.success('Client added successfully');
    } catch (error) {
      // Error handled by context
    }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client companies and contacts.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Client
          </Button>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the details of the new client company.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Acme Inc" 
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input 
                    id="industry" 
                    placeholder="e.g. Technology" 
                    value={newClient.industry}
                    onChange={e => setNewClient({...newClient, industry: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="logo">Company Logo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {newClient.logo ? (
                        <img src={newClient.logo} alt="Logo Preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <Input 
                      id="logo" 
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                      onChange={handleLogoUpload}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input 
                    id="website" 
                    placeholder="https://company.com" 
                    value={newClient.website}
                    onChange={e => setNewClient({...newClient, website: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Person</Label>
                  <Input 
                    id="contact" 
                    placeholder="Full Name" 
                    value={newClient.contactPerson}
                    onChange={e => setNewClient({...newClient, contactPerson: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input 
                    id="designation" 
                    placeholder="e.g. HR Manager" 
                    value={newClient.contactDesignation}
                    onChange={e => setNewClient({...newClient, contactDesignation: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="contact@company.com" 
                    value={newClient.email}
                    onChange={e => setNewClient({...newClient, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input 
                    id="mobile" 
                    placeholder="+1 234 567 890" 
                    value={newClient.mobile}
                    onChange={e => setNewClient({...newClient, mobile: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  placeholder="Full office address" 
                  value={newClient.address}
                  onChange={e => setNewClient({...newClient, address: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any additional information..." 
                  className="min-h-[100px]"
                  value={newClient.notes}
                  onChange={e => setNewClient({...newClient, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleAddClient}>Save Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {client.logo ? (
                          <img src={client.logo} alt={client.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{client.industry}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{client.contactPerson}</span>
                      <span className="text-xs text-muted-foreground">{client.contactDesignation}</span>
                    </div>
                  </TableCell>
                  <TableCell>{client.industry}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs truncate max-w-[150px]">{client.address}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="gap-2">
                            <Edit className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <Globe className="h-4 w-4" /> Visit Website
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteClient(client.id)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
