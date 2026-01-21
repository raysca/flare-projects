import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

export const Route = createFileRoute('/_layout/projects/$projectId/cycles/new')(
  {
    component: NewCycle,
  },
)

const createCycleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})

type CreateCycleInput = z.infer<typeof createCycleSchema>

function NewCycle() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()

  const [error, setError] = useState('')

  // Default dates: Start today, End in 2 weeks
  const today = new Date()
  const twoWeeksLater = new Date(today)
  twoWeeksLater.setDate(today.getDate() + 14)

  const form = useForm<CreateCycleInput>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: today.toISOString().split('T')[0],
      endDate: twoWeeksLater.toISOString().split('T')[0],
    },
  })

  const onSubmit = async (values: CreateCycleInput) => {
    try {
      await apiFetch('/cycles', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
        }),
      })

      // Invalidate cycles query (we can clean up invalidation later or use a project-based key)
      // queryClient.invalidateQueries({ queryKey: projectKeys.cycles(projectId) })
      // For now just navigate, usually sufficient if we don't have cached data yet or cache time is low

      navigate({ to: '/projects/$projectId/cycles', params: { projectId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cycle')
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link
        to="/projects/$projectId/cycles"
        params={{ projectId }}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cycles
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sprint 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Goal for this cycle..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="date" {...field} />
                          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="date" {...field} />
                          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" asChild>
                  <Link to="/projects/$projectId/cycles" params={{ projectId }}>
                    Cancel
                  </Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Cycle'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
