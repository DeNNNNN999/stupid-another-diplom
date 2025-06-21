'use client';

import { useState } from 'react';
import DashboardLayout from '@/src/components/layouts/DashboardLayout';
import { useApiGet, useApiPost, useApiDelete } from '@/src/hooks/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { Clipboard, Loader2, Plus, Trash2 } from 'lucide-react';

interface AccessCode {
  id: string;
  code: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  users: {
    id: string;
    name: string;
    email: string;
  }[];
}

interface AccessCodesResponse {
  accessCodes: AccessCode[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AccessCodesPage() {
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [status, setStatus] = useState('active');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data, isLoading, error, refetch } = useApiGet<AccessCodesResponse>(
    `/api/admin/access-codes?page=${page}&limit=${limit}&status=${status}`,
    true
  );

  // For generating new access codes
  const [count, setCount] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);

  const generateCodes = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count, expiresInDays }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate access codes');
      }

      toast.success(`Successfully generated ${result.length} access code(s)`);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeCode = async (codeId: string) => {
    try {
      const response = await fetch(`/api/admin/access-codes/${codeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke access code');
      }

      toast.success('Access code revoked successfully');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (code: AccessCode) => {
    if (code.isUsed) {
      return <Badge variant="secondary">Used</Badge>;
    }
    
    const now = new Date();
    const expiresAt = new Date(code.expiresAt);
    
    if (expiresAt < now) {
      return <Badge variant="outline">Expired</Badge>;
    }
    
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Access Codes</h1>
            <p className="text-muted-foreground mt-2">
              Manage registration access codes for new users
            </p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Generate Codes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Access Codes</DialogTitle>
                <DialogDescription>
                  Create new access codes for user registration
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="codeCount" className="text-right">
                    Number of codes
                  </Label>
                  <Input
                    id="codeCount"
                    type="number"
                    min="1"
                    max="50"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="expiration" className="text-right">
                    Expires in (days)
                  </Label>
                  <Input
                    id="expiration"
                    type="number"
                    min="1"
                    max="90"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                    className="col-span-3"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={generateCodes}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs 
          defaultValue="active" 
          value={status}
          onValueChange={setStatus}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="used">Used</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          
          <TabsContent value={status} className="space-y-4">
            <Card>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-destructive">
                    Error loading access codes
                  </div>
                ) : data && data.accessCodes.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Expires At</TableHead>
                          <TableHead>Created At</TableHead>
                          <TableHead>Used By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.accessCodes.map((code) => (
                          <TableRow key={code.id}>
                            <TableCell className="font-mono">{code.code}</TableCell>
                            <TableCell>{getStatusBadge(code)}</TableCell>
                            <TableCell>{formatDate(code.expiresAt)}</TableCell>
                            <TableCell>{formatDate(code.createdAt)}</TableCell>
                            <TableCell>
                              {code.users.length > 0 
                                ? code.users[0].name 
                                : <span className="text-muted-foreground text-sm">-</span>
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => copyToClipboard(code.code)}
                                  title="Copy code"
                                >
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                                
                                {!code.isUsed && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => revokeCode(code.id)}
                                    title="Revoke code"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {data.meta.totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.min(5, data.meta.totalPages) }, (_, i) => {
                              let pageNumber: number;
                              
                              // Calculate page numbers for pagination
                              if (data.meta.totalPages <= 5) {
                                pageNumber = i;
                              } else {
                                const middlePoint = Math.min(
                                  Math.max(2, page),
                                  data.meta.totalPages - 3
                                );
                                
                                if (i === 0) {
                                  pageNumber = 0;
                                } else if (i === 4) {
                                  pageNumber = data.meta.totalPages - 1;
                                } else {
                                  pageNumber = middlePoint + i - 2;
                                }
                              }
                              
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink
                                    onClick={() => setPage(pageNumber)}
                                    isActive={page === pageNumber}
                                  >
                                    {pageNumber + 1}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setPage(Math.min(data.meta.totalPages - 1, page + 1))}
                                disabled={page >= data.meta.totalPages - 1}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No access codes found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}