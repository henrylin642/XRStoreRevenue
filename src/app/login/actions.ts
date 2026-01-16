'use server';

import { createSession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function login(prevState: { error: string }, formData: FormData) {
  const password = formData.get('password') as string;
  const username = formData.get('username') as string;

  // Role-based hardcoded check
  if (username === 'admin' && password === 'admin123') {
    await createSession(username, 'admin');
    redirect('/');
  } else if (username === 'fin' && password === 'fin123') {
    await createSession(username, 'fin');
    redirect('/');
  } else if (username === 'ops' && password === 'ops123') {
    await createSession(username, 'ops');
    redirect('/');
  }

  return {
    error: '使用者名稱或密碼錯誤'
  };
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
