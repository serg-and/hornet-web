import { useToasts } from "@geist-ui/core";
import { ToastHooksResult } from "@geist-ui/core/esm/use-toasts/use-toast";
import { useEffect } from "react";
import Store from "watchi-store";

export const toasts = new Store<ToastHooksResult>({} as unknown as ToastHooksResult)

export default function Toasts() {
    const t = useToasts()
    useEffect(() => {
        toasts.set(t)
    }, [])

    return null
}