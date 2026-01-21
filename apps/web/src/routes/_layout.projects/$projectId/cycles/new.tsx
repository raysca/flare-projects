import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateCycle } from '@/hooks/use-cycles'

export const Route = createFileRoute('/_layout/projects/$projectId/cycles/new')(
  {
    component: NewCycle,
  },
)

const createCycleSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end > start
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    },
  )

type CreateCycleInput = z.infer<typeof createCycleSchema>

function NewCycle() {
  const { projectId } = Route.useParams()
  const navigate = useNavigate()
  const createCycle = useCreateCycle()

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

  const watchStartDate = form.watch('startDate')
  const watchEndDate = form.watch('endDate')

  // Calculate duration
  const duration = (() => {
    if (!watchStartDate || !watchEndDate) return null
    const start = new Date(watchStartDate)
    const end = new Date(watchEndDate)
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    )
    return days > 0 ? days : null
  })()

  const onSubmit = async (values: CreateCycleInput) => {
    await createCycle.mutateAsync({
      projectId,
      ...values,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
    })

    navigate({ to: '/projects/$projectId/cycles', params: { projectId } })
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
          <CardDescription>
            Cycles help you organize work into time-boxed sprints or iterations
          </CardDescription>
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
                    <FormDescription>
                      A unique name for this cycle
                    </FormDescription>
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
                      <Textarea
                        placeholder="Goals and focus areas for this cycle..."
                        rows={3}
                        {...field}
                      />
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

              {duration && (
                <p className="text-sm text-muted-foreground">
                  Duration: <span className="font-medium">{duration} days</span>
                  {duration === 14 && ' (2 weeks)'}
                  {duration === 7 && ' (1 week)'}
                  {duration === 21 && ' (3 weeks)'}
                  {duration === 28 && ' (4 weeks)'}
                </p>
              )}

              {createCycle.error && (
                <p className="text-sm text-destructive">
                  {createCycle.error instanceof Error
                    ? createCycle.error.message
                    : 'Failed to create cycle'}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" asChild>
                  <Link to="/projects/$projectId/cycles" params={{ projectId }}>
                    Cancel
                  </Link>
                </Button>
                <Button type="submit" disabled={createCycle.isPending}>
                  {createCycle.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Cycle'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
