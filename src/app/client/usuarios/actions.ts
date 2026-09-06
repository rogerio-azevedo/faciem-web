'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
    apiFetchAuthed,
    nestErrorMessage,
    parseResponseJson,
} from '@/lib/api-fetch';
import { parseRegistrationFaceSyncEnqueue } from '@/lib/face-sync-result';
import type { CreateRegistrationLinkBody } from '@/lib/registration-link-schedule';

export async function createClientRegistrationLinkAction(
    body: CreateRegistrationLinkBody,
): Promise<
    | {
          success: true;
          registrationUrl: string;
          code: string;
          id: string;
      }
    | { error: string }
> {
    try {
        const res = await apiFetchAuthed('/api/client/registration-links', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const data = await parseResponseJson(res);
        if (!res.ok) {
            return { error: nestErrorMessage(data) };
        }
        const row = data as {
            id: string;
            code: string;
            registrationUrl: string;
        };
        revalidatePath('/client/usuarios');
        return {
            success: true,
            id: row.id,
            code: row.code,
            registrationUrl: row.registrationUrl,
        };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function deactivateClientRegistrationLinkAction(
    linkId: string,
): Promise<{ success: true } | { error: string }> {
    const pid = z.string().uuid().safeParse(linkId);
    if (!pid.success) {
        return { error: 'Link inválido.' };
    }
    try {
        const res = await apiFetchAuthed(
            `/api/client/registration-links/${pid.data}`,
            {
                method: 'PATCH',
                body: JSON.stringify({ isActive: false }),
            },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) {
            return { error: nestErrorMessage(data) };
        }
        revalidatePath('/client/usuarios');
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function approveClientRegistrationAction(
    registrationId: string,
): Promise<{ success: true } | { error: string }> {
    const id = z.string().uuid().safeParse(registrationId);
    if (!id.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/client/registrations/${id.data}/approve`,
            { method: 'POST' },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath('/client/usuarios');
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function getClientRegistrationFaceUrlAction(
    registrationId: string,
): Promise<{ url: string } | { error: string }> {
    const id = z.string().uuid().safeParse(registrationId);
    if (!id.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/client/registrations/${id.data}/face-url`,
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        return { url: (data as { url: string }).url };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function rejectClientRegistrationAction(
    registrationId: string,
    notes?: string | null,
): Promise<{ success: true } | { error: string }> {
    const id = z.string().uuid().safeParse(registrationId);
    if (!id.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/client/registrations/${id.data}/reject`,
            {
                method: 'POST',
                body: JSON.stringify({ notes: notes?.trim() || null }),
            },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath('/client/usuarios');
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function syncClientRegistrationFaceAction(
    registrationId: string,
): Promise<
    | {
          success: true;
          deviceSyncStatus: string;
          deviceSyncError: string | null;
      }
    | { error: string }
> {
    const id = z.string().uuid().safeParse(registrationId);
    if (!id.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(`/api/client/faces/${id.data}/sync`, {
            method: 'POST',
        });
        const data = (await parseResponseJson(res)) as {
            deviceSyncStatus?: string;
            deviceSyncError?: string | null;
            jobId?: string;
            status?: string;
        };
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath('/client/usuarios');
        const parsed = parseRegistrationFaceSyncEnqueue(data);
        return {
            success: true,
            deviceSyncStatus: parsed.deviceSyncStatus,
            deviceSyncError: parsed.deviceSyncError,
        };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function getClientRegistrationFaceSyncStatusAction(
    registrationId: string,
): Promise<
    | {
          success: true;
          deviceSyncStatus: string;
          deviceSyncError: string | null;
      }
    | { error: string }
> {
    const id = z.string().uuid().safeParse(registrationId);
    if (!id.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(`/api/client/faces/${id.data}/sync`, {
            cache: 'no-store',
        });
        const data = (await parseResponseJson(res)) as {
            deviceSyncStatus?: string | null;
            deviceSyncError?: string | null;
        };
        if (!res.ok) return { error: nestErrorMessage(data) };
        return {
            success: true,
            deviceSyncStatus: String(data.deviceSyncStatus ?? ''),
            deviceSyncError: data.deviceSyncError ?? null,
        };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function enqueueClientFaceSyncAllAction(
    force = false,
): Promise<
    { ok: true; queued: number; force: boolean } | { ok: false; error: string }
> {
    try {
        const res = await apiFetchAuthed('/api/client/faces/sync-all', {
            method: 'POST',
            body: JSON.stringify({ force }),
        });
        const data = (await parseResponseJson(res)) as {
            queued?: number;
            force?: boolean;
        };
        if (!res.ok) return { ok: false, error: nestErrorMessage(data) };
        return {
            ok: true,
            queued: Number(data.queued ?? 0),
            force: data.force === true,
        };
    } catch {
        return { ok: false, error: 'Erro de comunicação.' };
    }
}

export async function getClientFaceSyncStatusAction(): Promise<
    | { ok: true; data: { queued: number; running: number } }
    | { ok: false; error: string }
> {
    try {
        const res = await apiFetchAuthed('/api/client/faces/sync-status', {
            cache: 'no-store',
        });
        const data = (await parseResponseJson(res)) as {
            queued?: number;
            running?: number;
        };
        if (!res.ok) return { ok: false, error: nestErrorMessage(data) };
        return {
            ok: true,
            data: {
                queued: Number(data.queued ?? 0),
                running: Number(data.running ?? 0),
            },
        };
    } catch {
        return { ok: false, error: 'Erro de comunicação.' };
    }
}
