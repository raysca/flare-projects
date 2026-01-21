import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  useProject,
  useUpdateProject,
  useProjectMembers,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useDeleteProject,
} from '@/hooks/use-projects'
import { UserPlus, X } from 'lucide-react'
import { PROJECT_STATUSES } from '@/types/projects'

export const Route = createFileRoute('/_layout/projects/$projectId/settings')({
  component: ProjectSettings,
})

function ProjectSettings() {
  const { projectId } = Route.useParams()
  const { data: project, isLoading } = useProject(projectId)

  if (isLoading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{project.name} Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage project details and members
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings project={project} />
        </TabsContent>

        <TabsContent value="members">
          <MembersSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralSettings({ project }: { project: any }) {
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()

  const [name, setName] = useState(project.name)
  const [identifier, setIdentifier] = useState(project.identifier)
  const [description, setDescription] = useState(project.description || '')
  const [status, setStatus] = useState(project.status)

  const handleSave = () => {
    updateProject.mutate({
      projectId: project.id,
      input: { name, identifier, description, status },
    })
  }

  const handleDelete = () => {
    if (
      confirm(
        'Are you sure you want to delete this project? This action cannot be undone.',
      )
    ) {
      deleteProject.mutate(project.id, {
        onSuccess: () => navigate({ to: '/projects' }),
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Update basic project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="identifier">Identifier (Key)</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              maxLength={5}
              className="uppercase"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? 'Deleting...' : 'Delete Project'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MembersSettings({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = useProjectMembers(projectId)
  const inviteMember = useInviteMember()
  const removeMember = useRemoveMember()
  const updateRole = useUpdateMemberRole()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMember.mutate(
      {
        projectId,
        email: inviteEmail,
        role: inviteRole,
      },
      {
        onSuccess: () => {
          setIsInviteOpen(false)
          setInviteEmail('')
        },
      },
    )
  }

  if (isLoading) return <div>Loading members...</div>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Project Members</CardTitle>
          <CardDescription>
            Manage who has access to this project
          </CardDescription>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <UserPlus className="w-4 h-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite to Project</DialogTitle>
              <DialogDescription>
                Send an invitation to a new team member.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={inviteMember.isPending}>
                  {inviteMember.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members?.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{member.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {member.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={member.role}
                  onValueChange={(val) =>
                    updateRole.mutate({
                      projectId,
                      userId: member.userId,
                      role: val,
                    })
                  }
                >
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Owner">Owner</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm('Remove this member?')) {
                      removeMember.mutate({ projectId, userId: member.userId })
                    }
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {members?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No members found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
