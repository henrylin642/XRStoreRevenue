'use server';

import { createSession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(prevState: { error: string }, formData: FormData) {
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;

  // Simple hardcoded check for demonstration. 
  // In production, use environment variables or a database.
  if (username === 'admin' && password === 'admin123') {
    await createSession(username);
    redirect('/');
  }
  
  return {
    error: 'Invalid credentials'
  };
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
