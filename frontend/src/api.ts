// API Client for LLM Council

const API_BASE = 'http://localhost:8000';

import type { CouncilMember, CouncilResult, QueryRequest, CouncilConfig } from './types';

export async function queryCouncil(request: QueryRequest): Promise<CouncilResult> {
  const response = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }
  
  return response.json();
}

export async function getCouncilConfig(): Promise<CouncilConfig> {
  const response = await fetch(`${API_BASE}/admin/config`);
  if (!response.ok) throw new Error('Failed to get config');
  return response.json();
}

export async function getMembers(): Promise<CouncilMember[]> {
  const config = await getCouncilConfig();
  return config.council_members;
}

export async function addMember(member: CouncilMember): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member }),
  });
  if (!response.ok) throw new Error('Failed to add member');
}

export async function removeMember(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/members/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to remove member');
}

export async function setChairman(chairman: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/chairman`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chairman }),
  });
  if (!response.ok) throw new Error('Failed to set chairman');
}

export async function checkAvailability(): Promise<Record<string, boolean>> {
  const response = await fetch(`${API_BASE}/admin/availability`);
  if (!response.ok) throw new Error('Failed to check availability');
  const data = await response.json();
  return data.availability;
}
