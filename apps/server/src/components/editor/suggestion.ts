import { ReactRenderer } from '@tiptap/react'
import tippy, { Instance, GetReferenceClientRect } from 'tippy.js'
import { MentionList, MentionListRef } from './mention-list'

export interface SuggestionProps {
    items: any[]
    query: string
    fetchUsers: (query: string) => Promise<any[]>
}

export const getSuggestionOptions = (fetchUsers: (query: string) => Promise<any[]>) => {
    return {
        items: async ({ query }: { query: string }) => {
            return await fetchUsers(query)
        },

        render: () => {
            let component: ReactRenderer<MentionListRef> | null = null
            let popup: Instance[] | null = null

            return {
                onStart: (props: any) => {
                    component = new ReactRenderer(MentionList, {
                        props,
                        editor: props.editor,
                    })

                    if (!props.clientRect) {
                        return
                    }

                    popup = tippy('body', {
                        getReferenceClientRect: props.clientRect as GetReferenceClientRect,
                        appendTo: () => document.body,
                        content: component.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: 'manual',
                        placement: 'bottom-start',
                        zIndex: 9999, // Ensure it sits on top of everything
                    })
                },

                onUpdate(props: any) {
                    component?.updateProps(props)

                    if (!props.clientRect) {
                        return
                    }

                    popup?.[0]?.setProps({
                        getReferenceClientRect: props.clientRect as GetReferenceClientRect,
                    })
                },

                onKeyDown(props: any) {
                    if (props.event.key === 'Escape') {
                        popup?.[0].hide()
                        return true
                    }

                    if (component?.ref) {
                        return component.ref.onKeyDown(props)
                    }
                    return false
                },

                onExit() {
                    popup?.[0].destroy()
                    component?.destroy()
                },
            }
        },
    }
}
