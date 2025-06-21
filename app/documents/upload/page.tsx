'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DocumentUploadPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Перенаправляем на страницу документов с открытым диалогом загрузки
    router.push('/documents?upload=true');
  }, [router]);
  
  return null;
}