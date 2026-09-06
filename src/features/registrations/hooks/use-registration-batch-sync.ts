"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { getClientFaceSyncStatusAction } from "@/app/client/usuarios/actions";
import { getCompanyFaceSyncStatusAction } from "@/app/company/clientes/[clientId]/usuarios/actions";

export type RegistrationBatchSyncStatus = {
    queued: number;
    running: number;
};

export function useRegistrationBatchSync(params: {
    variant: "client" | "company";
    companyClientId?: string;
    onFinished?: () => void;
}) {
    const { variant, companyClientId, onFinished } = params;
    const enabled = variant === "client" || Boolean(companyClientId);

    const query = useQuery({
        queryKey: [
            "registration-face-sync-all",
            variant,
            companyClientId ?? "self",
        ],
        queryFn: async (): Promise<RegistrationBatchSyncStatus> => {
            const result =
                variant === "client"
                    ? await getClientFaceSyncStatusAction()
                    : await getCompanyFaceSyncStatusAction(
                          companyClientId ?? "",
                      );
            if (!result.ok) throw new Error(result.error);
            return result.data;
        },
        enabled,
        refetchInterval: 2500,
    });

    const queued = query.data?.queued ?? 0;
    const running = query.data?.running ?? 0;
    const syncBusy = queued + running > 0;
    const prevBusy = useRef(false);

    useEffect(() => {
        if (prevBusy.current && !syncBusy) {
            onFinished?.();
        }
        prevBusy.current = syncBusy;
    }, [onFinished, syncBusy]);

    return {
        ...query,
        queued,
        running,
        syncBusy,
        refetch: query.refetch,
    };
}
