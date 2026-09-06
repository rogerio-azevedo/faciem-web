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
import type { RegistrationLinkListRow } from '@/types/domain';

export async function approveCompanyRegistrationAction(
    clientId: string,
    registrationId: string,
): Promise<{ success: true } | { error: string }> {
    const cid = z.string().uuid().safeParse(clientId);
    const rid = z.string().uuid().safeParse(registrationId);
    if (!cid.success || !rid.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registrations/${rid.data}/approve`,
            { method: 'POST' },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath(`/company/clientes/${cid.data}/usuarios`);
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function rejectCompanyRegistrationAction(
    clientId: string,
    registrationId: string,
    notes?: string | null,
): Promise<{ success: true } | { error: string }> {
    const cid = z.string().uuid().safeParse(clientId);
    const rid = z.string().uuid().safeParse(registrationId);
    if (!cid.success || !rid.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registrations/${rid.data}/reject`,
            {
                method: 'POST',
                body: JSON.stringify({ notes: notes?.trim() || null }),
            },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath(`/company/clientes/${cid.data}/usuarios`);
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function getCompanyRegistrationFaceUrlAction(
    clientId: string,
    registrationId: string,
): Promise<{ url: string } | { error: string }> {
    const cid = z.string().uuid().safeParse(clientId);
    const rid = z.string().uuid().safeParse(registrationId);
    if (!cid.success || !rid.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registrations/${rid.data}/face-url`,
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        return { url: (data as { url: string }).url };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function listCompanyRegistrationLinksAction(
    clientId: string,
): Promise<
    | { ok: true; items: RegistrationLinkListRow[] }
    | { ok: false; error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    if (!cid.success) return { ok: false, error: 'Cliente inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registration-links`,
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { ok: false, error: nestErrorMessage(data) };
        return {
            ok: true,
            items: Array.isArray(data)
                ? (data as RegistrationLinkListRow[])
                : [],
        };
    } catch {
        return { ok: false, error: 'Sem permissão.' };
    }
}

export async function createCompanyRegistrationLinkAction(
    clientId: string,
    body: CreateRegistrationLinkBody,
): Promise<
    | { success: true; registrationUrl: string; code: string; id: string }
    | { error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    if (!cid.success) return { error: 'Cliente inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registration-links`,
            { method: 'POST', body: JSON.stringify(body) },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        const row = data as {
            id: string;
            code: string;
            registrationUrl: string;
        };
        revalidatePath(`/company/clientes/${cid.data}/usuarios`);
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

export async function deactivateCompanyRegistrationLinkAction(
    clientId: string,
    linkId: string,
): Promise<{ success: true } | { error: string }> {
    const cid = z.string().uuid().safeParse(clientId);
    const lid = z.string().uuid().safeParse(linkId);
    if (!cid.success || !lid.success) return { error: 'IDs inválidos.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/registration-links/${lid.data}`,
            {
                method: 'PATCH',
                body: JSON.stringify({ isActive: false }),
            },
        );
        const data = await parseResponseJson(res);
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath(`/company/clientes/${cid.data}/usuarios`);
        return { success: true };
    } catch {
        return { error: 'Sem permissão.' };
    }
}

export async function syncCompanyRegistrationFaceAction(
    clientId: string,
    registrationId: string,
): Promise<
    | {
          success: true;
          deviceSyncStatus: string;
          deviceSyncError: string | null;
      }
    | { error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    const rid = z.string().uuid().safeParse(registrationId);
    if (!cid.success || !rid.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/faces/${rid.data}/sync`,
            { method: 'POST' },
        );
        const data = (await parseResponseJson(res)) as {
            deviceSyncStatus?: string;
            deviceSyncError?: string | null;
            jobId?: string;
            status?: string;
        };
        if (!res.ok) return { error: nestErrorMessage(data) };
        revalidatePath(`/company/clientes/${cid.data}/usuarios`);
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

export async function getCompanyRegistrationFaceSyncStatusAction(
    clientId: string,
    registrationId: string,
): Promise<
    | {
          success: true;
          deviceSyncStatus: string;
          deviceSyncError: string | null;
      }
    | { error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    const rid = z.string().uuid().safeParse(registrationId);
    if (!cid.success || !rid.success) return { error: 'ID inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/faces/${rid.data}/sync`,
            { cache: 'no-store' },
        );
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

export async function enqueueCompanyFaceSyncAllAction(
    clientId: string,
    force = false,
): Promise<
    { ok: true; queued: number; force: boolean } | { ok: false; error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    if (!cid.success) return { ok: false, error: 'Cliente inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/faces/sync-all`,
            {
                method: 'POST',
                body: JSON.stringify({ force }),
            },
        );
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

export async function getCompanyFaceSyncStatusAction(
    clientId: string,
): Promise<
    | { ok: true; data: { queued: number; running: number } }
    | { ok: false; error: string }
> {
    const cid = z.string().uuid().safeParse(clientId);
    if (!cid.success) return { ok: false, error: 'Cliente inválido.' };
    try {
        const res = await apiFetchAuthed(
            `/api/clients/${cid.data}/faces/sync-status`,
            { cache: 'no-store' },
        );
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
