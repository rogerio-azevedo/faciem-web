"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { enqueueClientFaceSyncAllAction } from "@/app/client/usuarios/actions";
import { enqueueCompanyFaceSyncAllAction } from "@/app/company/clientes/[clientId]/usuarios/actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRegistrationBatchSync } from "@/features/registrations/hooks/use-registration-batch-sync";

type RegistrationsFaceSyncAllModalProps = {
    variant: "client" | "company";
    companyClientId?: string;
};

export function RegistrationsFaceSyncAllModal({
    variant,
    companyClientId,
}: RegistrationsFaceSyncAllModalProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const handleFinished = useCallback(() => {
        toast.success("Sincronização concluída em segundo plano.");
        router.refresh();
    }, [router]);

    const { syncBusy, queued, running, refetch } = useRegistrationBatchSync({
        variant,
        companyClientId,
        onFinished: handleFinished,
    });

    const inQueue = queued + running;
    const busy = syncBusy || pending;

    const handleStart = useCallback(
        (force: boolean) => {
            setOpen(false);
            startTransition(async () => {
                const result =
                    variant === "client"
                        ? await enqueueClientFaceSyncAllAction(force)
                        : await enqueueCompanyFaceSyncAllAction(
                              companyClientId ?? "",
                              force,
                          );
                if (!result.ok) {
                    toast.error(result.error);
                    return;
                }
                await refetch();
                if (result.queued === 0) {
                    toast.message(
                        force
                            ? "Nenhum cadastro aprovado com foto para sincronizar."
                            : "Nenhum cadastro pendente de sincronização.",
                    );
                    return;
                }
                toast.success("Sync enfileirado. Pode sair desta tela.");
            });
        },
        [companyClientId, refetch, variant],
    );

    return (
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
                type="button"
                variant="outline"
                size="default"
                className="gap-2 shrink-0"
                disabled={busy}
                onClick={() => setOpen(true)}
            >
                {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <RefreshCw className="size-4" />
                )}
                Sincronizar todos no leitor
            </Button>
            {syncBusy ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Loader2 className="size-3.5 shrink-0 animate-spin" />
                    Sincronizando cadastros — {inQueue} na fila
                    <span>· pode sair desta tela</span>
                </p>
            ) : null}

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent className="max-w-md sm:max-w-md">
                    <AlertDialogHeader className="place-items-start text-left">
                        <AlertDialogMedia className="bg-muted mb-0">
                            <RefreshCw className="size-6" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                            Sincronizar cadastros nos leitores
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Enfileira cadastros aprovados com foto para todos os
                            leitores ativos. O trabalho segue em segundo plano
                            — você pode sair desta tela. Use forçar se os
                            usuários foram apagados no IVS ou no equipamento.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:flex-col sm:items-stretch">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
                            onClick={() => handleStart(false)}
                        >
                            Sincronizar pendentes
                        </Button>
                        <AlertDialogAction
                            disabled={pending}
                            onClick={() => handleStart(true)}
                        >
                            Forçar reenvio de todos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
