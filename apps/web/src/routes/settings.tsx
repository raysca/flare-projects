import { createFileRoute } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useMe } from '@/hooks/use-users'
import { apiFetch } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { userKeys } from '@/lib/query-keys'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof profileSchema>

function SettingsPage() {
    const { data: user, isLoading } = useMe()
    const queryClient = useQueryClient()
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            avatarUrl: '',
        },
    })

    // Update form values when user data loads
    useEffect(() => {
        if (user) {
            form.reset({
                name: user.name,
                avatarUrl: user.avatarUrl || '',
            })
        }
    }, [user, form])

    async function onSubmit(data: ProfileFormValues) {
        setIsSaving(true)
        setMessage(null)
        try {
            await apiFetch('/users/me', {
                method: 'PUT',
                body: JSON.stringify(data)
            })
            await queryClient.invalidateQueries({ queryKey: userKeys.me() })
            setMessage({ text: 'Profile updated successfully', type: 'success' })
        } catch (error) {
            setMessage({ text: 'Failed to update profile', type: 'error' })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="container max-w-2xl py-10 space-y-8">
            <div>
                <h3 className="text-2xl font-bold">Settings</h3>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Update your personal information.
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
                                            <Input placeholder="Your name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="avatarUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Avatar URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="space-y-2">
                                <FormLabel>Email</FormLabel>
                                <Input value={user?.email || ''} disabled className="bg-muted" />
                                <p className="text-[0.8rem] text-muted-foreground">
                                    Email cannot be changed directly.
                                </p>
                            </div>

                            {message && (
                                <div className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {message.text}
                                </div>
                            )}

                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
